import { writeFile } from "node:fs/promises";

const secret = String(
  process.env.TAXONOMY_ADMIN_SECRET ?? process.env.TAXONOMY_SECRET ?? "",
).trim();
const baseUrl = String(
  process.env.MEDSLIME_BASE_URL ?? "https://medslime.vercel.app",
).replace(/\/$/, "");
const outputPath = "taxonomy-v1-2-validation.json";

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
        await sleep(700 * attempt);
        return request(path, options, attempt + 1);
      }
      throw new Error(
        `HTTP ${response.status}: ${payload.error ?? payload.details ?? JSON.stringify(payload).slice(0, 500)}`,
      );
    }

    return payload;
  } catch (error) {
    if (attempt < 3 && !(error instanceof Error && /HTTP 4\d\d/.test(error.message))) {
      await sleep(700 * attempt);
      return request(path, options, attempt + 1);
    }
    throw error;
  }
}

function summarize(updates) {
  const byReason = {};
  for (const item of updates) {
    const reason = item.selectionReason ?? "unknown";
    byReason[reason] = (byReason[reason] ?? 0) + 1;
  }

  return {
    processed: updates.length,
    classified: updates.filter((item) => item.status === "classified").length,
    needsReview: updates.filter((item) => item.status === "needs_review").length,
    visualDependent: updates.filter((item) => item.visualDependent === true).length,
    otherSubtopic: updates.filter((item) => item.subtopic === "其他").length,
    averageConfidence: updates.length
      ? Number(
          (
            updates.reduce(
              (sum, item) => sum + Number(item.confidence ?? 0),
              0,
            ) / updates.length
          ).toFixed(3),
        )
      : 0,
    byReason,
  };
}

async function main() {
  console.log("MedSlime taxonomy v1.2 targeted validation");
  console.log(`Base URL: ${baseUrl}`);
  console.log("");

  const before = await request("/api/internal/taxonomy/backfill");
  if (before.version !== "topic-taxonomy-v1.2") {
    throw new Error(
      `Production is ${before.version ?? "unknown"}; expected topic-taxonomy-v1.2. Wait for the Vercel deployment, then retry.`,
    );
  }

  console.log(
    `Before: pending=${before.counts?.pending ?? "?"}, classified=${before.counts?.classified ?? "?"}, needs_review=${before.counts?.needs_review ?? "?"}, repair_source=${before.counts?.repair_source_needs_review ?? "?"}`,
  );
  console.log("Reclassifying only v1.1 needs_review rows plus newly detected visual-dependent v1.1 rows...");

  const result = await request("/api/internal/taxonomy/backfill", {
    method: "POST",
    body: JSON.stringify({
      mode: "repair_v1_2",
      limit: 25,
    }),
  });

  const updates = Array.isArray(result.updates) ? result.updates : [];
  const summary = summarize(updates);

  for (const item of updates) {
    const marker = item.status === "classified" ? "OK" : "REVIEW";
    const visual = item.visualDependent ? " visual" : "";
    console.log(
      `[${marker}] #${item.id} ${item.subjectKey ?? "unknown"} | ${item.topic} > ${item.subtopic} | ${Number(item.confidence ?? 0).toFixed(2)} | ${item.selectionReason ?? "unknown"}${visual}`,
    );
  }

  const after = await request("/api/internal/taxonomy/backfill");
  const missedVisual = updates.find((item) => String(item.id) === "9279");
  const checks = {
    versionIsV12: result.version === "topic-taxonomy-v1.2",
    onlyV11RepairSources: updates.every(
      (item) => item.previousVersion === "topic-taxonomy-v1.1",
    ),
    visualSelectionsAreFlagged: updates
      .filter((item) => item.selectionReason === "new_visual_detection")
      .every((item) => item.visualDependent === true && item.status === "needs_review"),
    knownArrowCase9279:
      !missedVisual ||
      (missedVisual.visualDependent === true && missedVisual.status === "needs_review"),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    version: result.version ?? before.version,
    summary,
    checks,
    before: before.counts ?? null,
    after: after.counts ?? null,
    updates,
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("");
  console.log(
    `Done: ${summary.processed} targeted rows; ${summary.classified} classified / ${summary.needsReview} needs_review; ${summary.otherSubtopic} still use subtopic=其他.`,
  );
  console.log(`Visual-dependent caught: ${summary.visualDependent}`);
  console.log(`Average confidence: ${summary.averageConfidence}`);
  console.log(`UTF-8 report: ${outputPath}`);

  const failedChecks = Object.entries(checks).filter(([, passed]) => !passed);
  if (failedChecks.length) {
    throw new Error(
      `Validation checks failed: ${failedChecks.map(([name]) => name).join(", ")}`,
    );
  }
}

main().catch((error) => {
  console.error("");
  console.error(
    `Taxonomy v1.2 validation failed: ${error instanceof Error ? error.message : error}`,
  );
  process.exit(1);
});
