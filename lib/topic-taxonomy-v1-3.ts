import {
  TOPIC_TAXONOMY_CATALOG,
  SUBTOPIC_TAXONOMY_CATALOG,
  getTaxonomySubjectKey,
  type TaxonomySubjectKey,
} from "@/lib/topic-taxonomy-catalog";

// v1.3 is the final catalog repair before the full-bank backfill.
// It includes the accepted v1.2 additions plus the recurring gaps observed in
// the 500-question checkpoint. Buckets stay broad enough for stable analytics.
const EXTRA_TOPICS: Partial<Record<TaxonomySubjectKey, string[]>> = {
  "physiology-pathology": ["超音波與臨床生理檢查"],
  "molecular-microscopy": ["顯微鏡原理與操作"],
};

const EXTRA_SUBTOPICS: Partial<
  Record<TaxonomySubjectKey, Record<string, string[]>>
> = {
  biochemistry: {
    "酵素學": ["酵素分類與命名"],
    "核酸與分子生物學": ["定序與基因分析技術"],
    "臨床生化檢驗": ["實驗室法規與 LDT", "POCT 與床邊檢驗"],
    "內分泌與代謝疾病": ["微量元素與營養代謝"],
    "分析方法與品質管理": ["電泳與蛋白分離"],
  },
  microbiology: {
    "感染管制與臨床感染": ["人畜共通感染與流行病學"],
    "革蘭氏陽性菌": ["微球菌與相關革蘭氏陽性球菌"],
    "真菌學": ["皮膚與皮下真菌感染"],
  },
  "physiology-pathology": {
    "超音波與臨床生理檢查": [
      "超音波物理與探頭",
      "都卜勒超音波與血流",
      "超音波成像與假影",
      "其他",
    ],
    "一般病理": [
      "營養與代謝病理",
      "感染與微生物病理",
      "細胞外基質與基底膜",
    ],
    "器官系統病理": ["血液與淋巴系統病理"],
    "發炎免疫與修復": [
      "淋巴器官與免疫細胞",
      "免疫缺陷與免疫異常",
    ],
  },
  "hematology-bloodbank": {
    "紅血球與貧血": [
      "血紅素氧親和力與氧解離曲線",
      "血紅素與血基質合成",
    ],
    "血液學檢驗技術": ["紅血球特殊檢驗"],
    "白血球與白血病": ["淋巴球生理與免疫表型"],
    "血小板與止血": ["血小板生理與分布"],
    "凝血與纖溶": ["血栓形成與血栓體質"],
    "血型與免疫血液學": ["HLA 與免疫遺傳"],
  },
  "immunology-virology": {
    "血清免疫檢驗": ["細胞免疫功能檢驗", "腫瘤標誌與免疫分析"],
    "RNA 病毒": ["輪狀病毒與呼腸孤病毒"],
    "病毒學總論": ["朊病毒與非常規感染因子"],
  },
  "molecular-microscopy": {
    "顯微鏡原理與操作": [
      "顯微鏡光學與解析度",
      "明視野與特殊顯微鏡",
      "顯微鏡操作與維護",
      "其他",
    ],
    "分子生物學原理": [
      "DNA 修復與基因體穩定性",
      "寡核苷酸與基因工程",
    ],
    "分子診斷技術": ["特殊 PCR 與結構變異檢測"],
    "遺傳變異與基因檢測": ["重組與結構變異"],
    "體液與鏡檢": [
      "妊娠與產前篩檢",
      "體液生化與蛋白質檢驗",
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
