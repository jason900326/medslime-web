export const QUESTION_TAXONOMY_VERSION = "topic-taxonomy-v1.3";

// v1.3 only extends the stable catalog after the 500-question checkpoint.
// Existing v1.1/v1.2 classified rows remain semantically usable and are not
// globally re-sent to the model during the remaining full-bank backfill.
export const QUESTION_TAXONOMY_COMPATIBLE_VERSIONS = [
  QUESTION_TAXONOMY_VERSION,
  "topic-taxonomy-v1.2",
  "topic-taxonomy-v1.1",
] as const;

// Kept for the historical one-time v1.2 repair endpoint/script.
export const QUESTION_TAXONOMY_REPAIR_SOURCE_VERSION = "topic-taxonomy-v1.1";

// v1.3 targeted repair candidates must come from the v1.2 500-question
// checkpoint. The validation runner additionally supplies the exact IDs from
// that local checkpoint report, so unrelated needs_review rows are untouched.
export const QUESTION_TAXONOMY_V13_REPAIR_SOURCE_VERSION = "topic-taxonomy-v1.2";

// Versions old enough that they should still be reclassified if encountered.
export const QUESTION_TAXONOMY_REPROCESS_VERSIONS = ["topic-taxonomy-v1"] as const;

export type QuestionTaxonomyStatus =
  | "pending"
  | "classified"
  | "needs_review";

export type QuestionTaxonomy = {
  topic: string | null;
  subtopic: string | null;
  concepts: string[];
  status: QuestionTaxonomyStatus;
  confidence: number | null;
  version: string | null;
  model: string | null;
  updatedAt: string | null;
};

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeConcepts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 3);
}

function normalizeStatus(value: unknown): QuestionTaxonomyStatus {
  if (value === "classified" || value === "needs_review") return value;
  return "pending";
}

function normalizeConfidence(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(1, Math.max(0, parsed));
}

export function isCompatibleQuestionTaxonomyVersion(value: unknown) {
  const version = cleanText(value);
  return Boolean(
    version &&
      QUESTION_TAXONOMY_COMPATIBLE_VERSIONS.includes(
        version as (typeof QUESTION_TAXONOMY_COMPATIBLE_VERSIONS)[number],
      ),
  );
}

export function normalizeQuestionTaxonomy(
  row: Record<string, unknown>,
): QuestionTaxonomy {
  return {
    topic: cleanText(row.topic),
    subtopic: cleanText(row.subtopic),
    concepts: normalizeConcepts(row.concepts),
    status: normalizeStatus(row.taxonomy_status),
    confidence: normalizeConfidence(row.taxonomy_confidence),
    version: cleanText(row.taxonomy_version),
    model: cleanText(row.taxonomy_model),
    updatedAt: cleanText(row.taxonomy_updated_at),
  };
}

export function hasUsableTaxonomy(taxonomy: QuestionTaxonomy) {
  return (
    taxonomy.status === "classified" &&
    isCompatibleQuestionTaxonomyVersion(taxonomy.version) &&
    Boolean(taxonomy.topic) &&
    Boolean(taxonomy.subtopic)
  );
}
