import {
  TOPIC_TAXONOMY_CATALOG,
  SUBTOPIC_TAXONOMY_CATALOG,
  getTaxonomySubjectKey,
  type TaxonomySubjectKey,
} from "@/lib/topic-taxonomy-catalog";

const EXTRA_TOPICS: Partial<Record<TaxonomySubjectKey, string[]>> = {
  "molecular-microscopy": ["顯微鏡原理與操作"],
};

const EXTRA_SUBTOPICS: Partial<
  Record<TaxonomySubjectKey, Record<string, string[]>>
> = {
  biochemistry: {
    "酵素學": ["酵素分類與命名"],
    "核酸與分子生物學": ["定序與基因分析技術"],
    "臨床生化檢驗": ["實驗室法規與 LDT"],
  },
  microbiology: {
    "感染管制與臨床感染": ["人畜共通感染與流行病學"],
  },
  "hematology-bloodbank": {
    "紅血球與貧血": ["血紅素氧親和力與氧解離曲線"],
    "血液學檢驗技術": ["紅血球特殊檢驗"],
  },
  "immunology-virology": {
    "血清免疫檢驗": ["細胞免疫功能檢驗"],
    "RNA 病毒": ["輪狀病毒與呼腸孤病毒"],
  },
  "molecular-microscopy": {
    "顯微鏡原理與操作": [
      "顯微鏡光學與解析度",
      "明視野與特殊顯微鏡",
      "顯微鏡操作與維護",
      "其他",
    ],
  },
};

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

export function getAllowedSubtopics(
  subjectKey: TaxonomySubjectKey,
  topic: string,
): string[] {
  const base = SUBTOPIC_TAXONOMY_CATALOG[subjectKey]?.[topic] ?? [];
  const extras = EXTRA_SUBTOPICS[subjectKey]?.[topic] ?? [];

  if (!extras.length) return base;

  // Keep "其他" at the end when extending an existing catalog bucket.
  const withoutOther = base.filter((item) => item !== "其他");
  const hasOther = base.includes("其他") || extras.includes("其他");
  const merged = dedupe([
    ...withoutOther,
    ...extras.filter((item) => item !== "其他"),
  ]);
  return hasOther ? [...merged, "其他"] : merged;
}

export function getAllowedTaxonomy(subjectKey: TaxonomySubjectKey) {
  const topics = dedupe([
    ...TOPIC_TAXONOMY_CATALOG[subjectKey],
    ...(EXTRA_TOPICS[subjectKey] ?? []),
  ]);

  return topics.map((topic) => ({
    topic,
    subtopics: getAllowedSubtopics(subjectKey, topic),
  }));
}

export { getTaxonomySubjectKey };
export type { TaxonomySubjectKey };
