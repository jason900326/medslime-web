import { readFile, writeFile } from "node:fs/promises";

function argValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const secret = String(
  process.env.TAXONOMY_ADMIN_SECRET ?? process.env.TAXONOMY_SECRET ?? "",
).trim();
const baseUrl = String(
  process.env.MEDSLIME_BASE_URL ?? "https://medslime.vercel.app",
).replace(/\/$/, "");
const inputPath = argValue("input") || "taxonomy-backfill-checkpoint.json";
const outputPath = argValue("output") || "taxonomy-v1-3-validation.json";
const batchSize = 25;
const checkpointDenominator = 500;

if (!secret) {
  console.error(
    'Missing TAXONOMY_ADMIN_SECRET (or TAXONOMY_SECRET). In PowerShell: $env:TAXONOMY_SECRET = "..."',
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}, attempt = 1) {
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
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { error: text || `HTTP ${response.status}` };
    }

    if (!response.ok) {
      if (response.status >= 500 && attempt < 3) {
        await sleep(900 * attempt);
        return request(path, options, attempt + 1);
      }
      throw new Error(
        `HTTP ${response.status}: ${payload.error ?? payload.details ?? JSON.stringify(payload).slice(0, 500)}`,
      );
    }

    return payload;
  } catch (error) {
    if (attempt < 3 && !(error instanceof Error && /HTTP 4\d\d/.test(error.message))) {
      await sleep(900 * attempt);
      return request(path, options, attempt + 1);
    }
    throw error;
  }
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

  return {
    processed: updates.length,
    classified,
    needsReview,
    visualDependent,
    otherSubtopic,
    averageConfidence,
    otherSubtopicRateOfCheckpoint: Number(
      (otherSubtopic / checkpointDenominator).toFixed(3),
    ),
  };
}

async function main() {
  console.log("MedSlime taxonomy v1.3 targeted repair");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Checkpoint input: ${inputPath}`);
  console.log("");

  const checkpoint = JSON.parse(await readFile(inputPath, "utf8"));
  const checkpointUpdates = Array.isArray(checkpoint.updates) ? checkpoint.updates : [];
  const targetIds = Array.from(
    new Set(
      checkpointUpdates
        .filter((item) => item?.subtopic === "其他")
        .map((item) => String(item.id ?? "").trim())
        .filter((id) => /^\d+$/.test(id)),
    ),
  );

  if (!targetIds.length) {
    throw new Error(`No subtopic=其他 rows found in ${inputPath}.`);
  }

  console.log(`Target checkpoint rows: ${targetIds.length}`);
  if (targetIds.length !== 46) {
    console.warn(
      `Expected the reviewed 500-question checkpoint to contain 46 rows with subtopic=其他; found ${targetIds.length}. Continuing with the exact rows in the file.`,
    );
  }

  const before = await request("/api/internal/taxonomy/backfill");
  if (before.version !== "topic-taxonomy-v1.3") {
    throw new Error(
      `Production is ${before.version ?? "unknown"}; expected topic-taxonomy-v1.3. Wait for the Vercel deployment, then retry.`,
    );
  }

  console.log(
    `Before: pending=${before.counts?.pending ?? "?"}, classified=${before.counts?.classified ?? "?"}, needs_review=${before.counts?.needs_review ?? "?"}`,
  );
  console.log("Preparing only the checkpoint rows that were v1.2 needs_review + subtopic=其他...");

  const preparation = await request("/api/internal/taxonomy/repair-v1-3", {
    method: "POST",
    body: JSON.stringify({ ids: targetIds }),
  });

  const queueIds = Array.isArray(preparation.queueIds)
    ? preparation.queueIds.map(String)
    : [];
  const queueSet = new Set(queueIds);
  console.log(
    `Prepared now: ${preparation.preparedCount ?? 0}; already pending: ${preparation.alreadyPendingCount ?? 0}; already repaired: ${preparation.alreadyRepairedCount ?? 0}; queue=${queueIds.length}`,
  );

  if (!queueIds.length) {
    throw new Error(
      "No target rows remain in the repair queue. If this validation already completed, inspect taxonomy-v1-3-validation.json instead of running it again.",
    );
  }

  const updates = [];
  const seenIds = new Set();
  let batchNumber = 0;

  while (updates.length < queueIds.length) {
    const remaining = queueIds.length - updates.length;
    const limit = Math.min(batchSize, remaining);
    batchNumber += 1;
    process.stdout.write(`[batch ${batchNumber}] reclassifying ${limit} ... `);

    const result = await request("/api/internal/taxonomy/backfill", {
      method: "POST",
      body: JSON.stringify({ mode: "queue", limit }),
    });
    const batch = Array.isArray(result.updates) ? result.updates : [];

    const unexpected = batch.filter((item) => !queueSet.has(String(item.id)));
    if (unexpected.length) {
      throw new Error(
        `Queue returned non-target rows: ${unexpected.map((item) => item.id).join(", ")}. Stop here; remaining target rows stay pending and can be resumed safely by rerunning this same command.`,
      );
    }

    for (const item of batch) {
      const id = String(item.id);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      updates.push(item);
    }

    const summary = summarize(batch);
    console.log(
      `${batch.length} processed (${summary.classified} classified / ${summary.needsReview} review, other=${summary.otherSubtopic}, avg=${summary.averageConfidence})`,
    );

    if (!batch.length) {
      throw new Error(
        `Target queue stopped early after ${updates.length}/${queueIds.length} rows. Rerun this same command to resume.`,
      );
    }
  }

  const after = await request("/api/internal/taxonomy/backfill");
  const summary = summarize(updates);
  const returnedIds = new Set(updates.map((item) => String(item.id)));
  const missingQueueIds = queueIds.filter((id) => !returnedIds.has(id));
  const unexpectedIds = updates
    .map((item) => String(item.id))
    .filter((id) => !queueSet.has(id));

  const checks = {
    versionIsV13:
      updates.every((item) => item.previousVersion === "topic-taxonomy-v1.2") &&
      before.version === "topic-taxonomy-v1.3",
    exactCheckpointSelection: queueIds.every((id) => targetIds.includes(id)),
    noUnexpectedQueueRows: unexpectedIds.length === 0,
    allQueuedRowsReturned: missingQueueIds.length === 0,
    otherSubtopicAtOrBelow5Percent:
      summary.otherSubtopicRateOfCheckpoint <= 0.05,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    version: before.version,
    inputPath,
    checkpointProcessedTotal: checkpoint.processedTotal ?? null,
    targetCount: targetIds.length,
    targetIds,
    preparation,
    summary,
    checks,
    missingQueueIds,
    unexpectedIds,
    before: before.counts ?? null,
    after: after.counts ?? null,
    updates,
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("");
  console.log(
    `Done this validation run: ${summary.processed} repaired; ${summary.classified} classified / ${summary.needsReview} needs_review; ${summary.otherSubtopic} still use subtopic=其他.`,
  );
  console.log(
    `Remaining 其他 rate vs original 500-question checkpoint: ${(summary.otherSubtopicRateOfCheckpoint * 100).toFixed(1)}%`,
  );
  console.log(`Average confidence: ${summary.averageConfidence}`);
  console.log(`UTF-8 report: ${outputPath}`);

  const failedChecks = Object.entries(checks).filter(([, passed]) => !passed);
  if (failedChecks.length) {
    throw new Error(
      `Validation checks failed: ${failedChecks.map(([name]) => name).join(", ")}`,
    );
  }

  console.log("PASS: v1.3 checkpoint repair is below the 5% subtopic=其他 threshold.");
}

main().catch((error) => {
  console.error("");
  console.error(
    `Taxonomy v1.3 validation failed: ${error instanceof Error ? error.message : error}`,
  );
  process.exit(1);
});
