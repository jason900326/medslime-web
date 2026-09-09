export const QUESTION_TAXONOMY_VERSION = "topic-taxonomy-v1";

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
  ).slice(0, 8);
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
    Boolean(taxonomy.topic) &&
    Boolean(taxonomy.subtopic)
  );
}
