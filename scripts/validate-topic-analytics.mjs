const secret = String(
  process.env.TAXONOMY_ADMIN_SECRET ?? process.env.TAXONOMY_SECRET ?? "",
).trim();
const baseUrl = String(
  process.env.MEDSLIME_BASE_URL ?? "https://medslime.vercel.app",
).replace(/\/$/, "");

if (!secret) {
  console.error(
    'Missing TAXONOMY_ADMIN_SECRET (or TAXONOMY_SECRET). In PowerShell: $env:TAXONOMY_SECRET = "..."',
  );
  process.exit(1);
}

async function main() {
  console.log("MedSlime Phase D topic analytics smoke test");
  console.log(`Base URL: ${baseUrl}`);
  console.log("");

  const response = await fetch(`${baseUrl}/api/internal/pro-analysis/health`, {
    headers: {
      "x-taxonomy-secret": secret,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`HTTP ${response.status}: non-JSON response: ${text.slice(0, 500)}`);
  }

  if (!response.ok) {
    const details = [payload.error, payload.message].filter(Boolean).join(" | ");
    throw new Error(`HTTP ${response.status}: ${details || text.slice(0, 500)}`);
  }

  console.log(`question_outcomes column: ${payload.questionOutcomesColumn ? "OK" : "MISSING"}`);

  if (!payload.ready) {
    console.log("");
    console.error(payload.message ?? "Topic analytics data path is not ready.");
    process.exit(1);
  }

  console.log(`attempts sampled: ${payload.attemptsSampled ?? 0}`);
  console.log(`attempts with outcomes: ${payload.attemptsWithOutcomes ?? 0}`);
  console.log(`question outcomes sampled: ${payload.outcomesSampled ?? 0}`);
  console.log(
    `taxonomy: classified=${payload.taxonomy?.classified ?? "?"}, needs_review=${payload.taxonomy?.needsReview ?? "?"}, pending=${payload.taxonomy?.pending ?? "?"}`,
  );
  console.log("");
  console.log(payload.message ?? "Topic analytics data path is ready.");

  if ((payload.attemptsWithOutcomes ?? 0) === 0) {
    console.log(
      "Next: complete one new national-exam or free-quiz attempt, then run this smoke test again.",
    );
  } else {
    console.log("PASS: Phase D topic analytics data path is ready.");
  }
}

main().catch((error) => {
  console.error("");
  console.error(`Validation failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
