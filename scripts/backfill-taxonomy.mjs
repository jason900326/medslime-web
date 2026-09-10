import { writeFile } from "node:fs/promises";

function argValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function clampInt(value, fallback, min, max) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

const secret = String(
  process.env.TAXONOMY_ADMIN_SECRET ?? process.env.TAXONOMY_SECRET ?? "",
).trim();
const baseUrl = String(
  process.env.MEDSLIME_BASE_URL ?? "https://medslime.vercel.app",
).replace(/\/$/, "");
const batchSize = clampInt(argValue("batch"), 25, 1, 25);
const maxQuestions = hasFlag("all")
  ? Number.POSITIVE_INFINITY
  : clampInt(argValue("max"), 500, 1, 100000);
const outputPath = argValue("output") || "taxonomy-backfill-checkpoint.json";
const checkpointEvery = clampInt(argValue("checkpoint-every"), 100, 25, 1000);

if (!secret) {
  console.error(
    'Missing TAXONOMY_ADMIN_SECRET (or TAXONOMY_SECRET). In PowerShell: $env:TAXONOMY_SECRET = "..."',
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}, { retries = 3 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          "x-taxonomy-secret": secret,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers ?? {}),
        },
      });

      const text = await response.text();
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `HTTP ${response.status}: non-JSON response: ${text.slice(0, 500)}`,
        );
      }

      if (response.ok) return payload;

      const details = [payload.error, payload.details]
        .filter(Boolean)
        .join(" | ") || JSON.stringify(payload).slice(0, 500);
      const error = new Error(`HTTP ${response.status}: ${details}`);

      if (response.status === 401 || response.status === 403) throw error;
      if (response.status < 500 || attempt >= retries) throw error;

      lastError = error;
      console.warn(
        `  transient HTTP ${response.status}; retry ${attempt}/${retries - 1} after ${attempt * 1500}ms...`,
      );
      await sleep(attempt * 1500);
    } catch (error) {
      const message = String(error?.message ?? "");
      if (message.includes("HTTP 401") || message.includes("HTTP 403")) {
        throw error;
      }
      lastError = error;
      if (attempt >= retries) throw error;
      console.warn(
        `  transient network/error; retry ${attempt}/${retries - 1} after ${attempt * 1500}ms...`,
      );
      await sleep(attempt * 1500);
    }
  }

  throw lastError ?? new Error("Request failed.");
}

function summarize(updates) {
  const classified = updates.filter((item) => item.status === "classified").length;
  const needsReview = updates.filter((item) => item.status === "needs_review").length;
  const visualDependent = updates.filter((item) => item.visualDependent === true).length;
  const otherSubtopic = updates.filter((item) => item.subtopic === "其他").length;
  const averageConfidence = updates.length
    ? Number(
        (
          updates.reduce((sum, item) => sum + Number(item.confidence ?? 0), 0) /
          updates.length
        ).toFixed(3),
      )
    : 0;
  return { classified, needsReview, visualDependent, otherSubtopic, averageConfidence };
}

async function getStatus() {
  return request("/api/internal/taxonomy/backfill", {}, { retries: 3 });
}

async function writeCheckpoint({ before, after, updates, startedAt, stoppedReason }) {
  const totals = summarize(updates);
  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    baseUrl,
    version: after?.version ?? before?.version ?? null,
    config: {
      batchSize,
      maxQuestions: Number.isFinite(maxQuestions) ? maxQuestions : "all",
      checkpointEvery,
    },
    processedTotal: updates.length,
    totals: {
      ...totals,
      needsReviewRate: updates.length
        ? Number((totals.needsReview / updates.length).toFixed(3))
        : 0,
      otherSubtopicRate: updates.length
        ? Number((totals.otherSubtopic / updates.length).toFixed(3))
        : 0,
    },
    before: before?.counts ?? null,
    after: after?.counts ?? null,
    stoppedReason,
    updates,
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log("MedSlime taxonomy full backfill");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(
    `Run cap: ${Number.isFinite(maxQuestions) ? `${maxQuestions} questions (checkpoint mode)` : "ALL remaining questions"}`,
  );
  console.log(`Report: ${outputPath}`);
  console.log("");

  const before = await getStatus();
  console.log(`Version: ${before.version}`);
  console.log(
    `Before: pending=${before.counts?.pending ?? "?"}, classified=${before.counts?.classified ?? "?"}, needs_review=${before.counts?.needs_review ?? "?"}, outdated=${before.counts?.outdated ?? "?"}`,
  );
  console.log("");

  const updates = [];
  let stoppedReason = "run_cap_reached";
  let nextCheckpoint = checkpointEvery;
  let batchNumber = 0;

  while (updates.length < maxQuestions) {
    const remainingAllowance = Number.isFinite(maxQuestions)
      ? Math.max(0, maxQuestions - updates.length)
      : batchSize;
    const limit = Math.min(batchSize, remainingAllowance || batchSize);
    if (limit <= 0) break;

    batchNumber += 1;
    process.stdout.write(`[batch ${batchNumber}] requesting ${limit} ... `);

    const result = await request("/api/internal/taxonomy/backfill", {
      method: "POST",
      body: JSON.stringify({ mode: "queue", limit }),
    });

    const batchUpdates = Array.isArray(result.updates) ? result.updates : [];
    const summary = summarize(batchUpdates);
    console.log(
      `${result.processed ?? batchUpdates.length} processed (${summary.classified} classified / ${summary.needsReview} review, other=${summary.otherSubtopic}, avg=${summary.averageConfidence}); remaining=${result.remaining ?? "?"}`,
    );

    if (batchUpdates.length === 0) {
      stoppedReason = "queue_empty";
      break;
    }

    updates.push(...batchUpdates);

    if (updates.length >= nextCheckpoint) {
      let checkpointStatus = null;
      try {
        checkpointStatus = await getStatus();
      } catch (error) {
        console.warn(
          `  checkpoint status unavailable: ${error instanceof Error ? error.message : error}`,
        );
      }
      await writeCheckpoint({
        before,
        after: checkpointStatus,
        updates,
        startedAt,
        stoppedReason: "intermediate_checkpoint",
      });
      console.log(`  checkpoint saved at ${updates.length} questions -> ${outputPath}`);
      nextCheckpoint += checkpointEvery;
    }
  }

  let after = null;
  try {
    after = await getStatus();
  } catch (error) {
    console.warn(`Final status unavailable: ${error instanceof Error ? error.message : error}`);
  }

  if (after?.counts) {
    const remaining = Number(after.counts.pending ?? 0) + Number(after.counts.outdated ?? 0);
    if (remaining === 0) stoppedReason = "queue_empty";
  }

  await writeCheckpoint({ before, after, updates, startedAt, stoppedReason });

  const totals = summarize(updates);
  const reviewRate = updates.length ? totals.needsReview / updates.length : 0;
  const otherRate = updates.length ? totals.otherSubtopic / updates.length : 0;

  console.log("");
  if (after?.counts) {
    console.log(
      `After: pending=${after.counts.pending ?? "?"}, classified=${after.counts.classified ?? "?"}, needs_review=${after.counts.needs_review ?? "?"}, outdated=${after.counts.outdated ?? "?"}`,
    );
  }
  console.log(
    `Done this run: ${updates.length} questions; ${totals.classified} classified / ${totals.needsReview} needs_review (${(reviewRate * 100).toFixed(1)}%); other=${totals.otherSubtopic} (${(otherRate * 100).toFixed(1)}%); avg confidence=${totals.averageConfidence}.`,
  );
  console.log(`UTF-8 report: ${outputPath}`);

  if (Number.isFinite(maxQuestions) && stoppedReason === "run_cap_reached") {
    console.log("");
    console.log(
      "Checkpoint cap reached. Review this report before continuing the remaining queue.",
    );
    console.log(
      "After approval, continue another 500 with the same command, or run all remaining with: npm run backfill:taxonomy -- --all",
    );
  }
}

main().catch((error) => {
  console.error("");
  console.error(`Backfill failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
