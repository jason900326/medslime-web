import { writeFile } from "node:fs/promises";

const SUBJECTS = [
  { key: "biochemistry", label: "生物化學與臨床生化" },
  { key: "microbiology", label: "微生物學與臨床微生物" },
  { key: "physiology-pathology", label: "臨床生理與病理" },
  { key: "hematology-bloodbank", label: "血液學與血庫" },
  { key: "immunology-virology", label: "血清免疫與臨床病毒" },
  { key: "molecular-microscopy", label: "分子檢驗與臨床鏡檢" },
];

function argValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function clampInt(value, fallback, min, max) {
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
const perSubject = clampInt(argValue("per-subject"), 17, 1, 25);
const outputPath = argValue("output") || "taxonomy-calibration.json";

if (!secret) {
  console.error(
    "Missing TAXONOMY_ADMIN_SECRET (or TAXONOMY_SECRET). In PowerShell: $env:TAXONOMY_SECRET = \"...\"",
  );
  process.exit(1);
}

async function request(path, options = {}) {
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
    throw new Error(`HTTP ${response.status}: non-JSON response: ${text.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${payload.error ?? JSON.stringify(payload).slice(0, 300)}`,
    );
  }
  return payload;
}

function summarizeUpdates(updates) {
  const classified = updates.filter((item) => item.status === "classified").length;
  const needsReview = updates.filter((item) => item.status === "needs_review").length;
  const visualDependent = updates.filter((item) => item.visualDependent === true).length;
  const averageConfidence = updates.length
    ? Number(
        (
          updates.reduce((sum, item) => sum + Number(item.confidence ?? 0), 0) /
          updates.length
        ).toFixed(3),
      )
    : 0;
  return { classified, needsReview, visualDependent, averageConfidence };
}

async function main() {
  console.log(`MedSlime taxonomy calibration`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Target: ${SUBJECTS.length} subjects × ${perSubject} = ${SUBJECTS.length * perSubject} questions`);
  console.log("");

  const before = await request("/api/internal/taxonomy/backfill");
  console.log(`Version: ${before.version}`);
  console.log(
    `Before: pending=${before.counts?.pending ?? "?"}, classified=${before.counts?.classified ?? "?"}, needs_review=${before.counts?.needs_review ?? "?"}, outdated=${before.counts?.outdated ?? "?"}`,
  );
  console.log("");

  const subjectResults = [];

  for (let index = 0; index < SUBJECTS.length; index += 1) {
    const subject = SUBJECTS[index];
    process.stdout.write(`[${index + 1}/${SUBJECTS.length}] ${subject.label} ... `);

    const result = await request("/api/internal/taxonomy/backfill", {
      method: "POST",
      body: JSON.stringify({
        mode: "calibration",
        subjectKey: subject.key,
        limit: perSubject,
      }),
    });

    const updates = Array.isArray(result.updates) ? result.updates : [];
    const mismatched = updates.filter(
      (item) => item.subjectKey && item.subjectKey !== subject.key,
    );
    if (mismatched.length > 0) {
      throw new Error(
        `${subject.key} returned ${mismatched.length} rows from another subject bucket.`,
      );
    }

    const summary = summarizeUpdates(updates);
    console.log(
      `${result.processed ?? updates.length} processed (${summary.classified} classified / ${summary.needsReview} review, avg confidence ${summary.averageConfidence})`,
    );

    subjectResults.push({
      key: subject.key,
      label: subject.label,
      requested: perSubject,
      processed: result.processed ?? updates.length,
      summary,
      updates,
    });
  }

  const after = await request("/api/internal/taxonomy/backfill");
  const allUpdates = subjectResults.flatMap((item) => item.updates);
  const totals = summarizeUpdates(allUpdates);
  const reviewRate = allUpdates.length
    ? Number((totals.needsReview / allUpdates.length).toFixed(3))
    : 0;

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    version: after.version ?? before.version,
    requestedPerSubject: perSubject,
    requestedTotal: SUBJECTS.length * perSubject,
    processedTotal: allUpdates.length,
    totals: {
      ...totals,
      needsReviewRate: reviewRate,
    },
    before: before.counts ?? null,
    after: after.counts ?? null,
    subjects: subjectResults,
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("");
  console.log(
    `Done: ${allUpdates.length} questions, ${totals.classified} classified, ${totals.needsReview} needs_review (${(reviewRate * 100).toFixed(1)}%).`,
  );
  console.log(`UTF-8 report: ${outputPath}`);
  console.log(
    "PowerShell review: Get-Content .\\taxonomy-calibration.json -Raw -Encoding UTF8 | ConvertFrom-Json",
  );
}

main().catch((error) => {
  console.error("");
  console.error(`Calibration failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
