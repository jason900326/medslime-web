export type TaxonomySubjectKey =
  | "biochemistry"
  | "microbiology"
  | "physiology-pathology"
  | "hematology-bloodbank"
  | "immunology-virology"
  | "molecular-microscopy";

export const TOPIC_TAXONOMY_CATALOG: Record<TaxonomySubjectKey, string[]> = {
  biochemistry: [
    "生物分子與蛋白質",
    "酵素學",
    "醣類代謝",
    "脂質代謝",
    "胺基酸與蛋白質代謝",
    "核酸與分子生物學",
    "臨床生化檢驗",
    "內分泌與代謝疾病",
    "酸鹼與電解質",
    "器官功能與生化標誌",
    "毒物與治療藥物監測",
    "分析方法與品質管理",
  ],
  microbiology: [
    "細菌學總論",
    "革蘭氏陽性菌",
    "革蘭氏陰性菌",
    "厭氧菌與特殊細菌",
    "分枝桿菌與放線菌",
    "真菌學",
    "抗微生物藥物與抗藥性",
    "微生物鑑定與培養",
    "感染管制與臨床感染",
    "微生物檢驗品質管理",
  ],
  "physiology-pathology": [
    "細胞與一般生理",
    "神經與肌肉生理",
    "心血管生理",
    "呼吸生理",
    "腎臟與體液生理",
    "腸胃與肝膽生理",
    "內分泌與生殖生理",
    "一般病理",
    "腫瘤病理",
    "器官系統病理",
    "發炎免疫與修復",
  ],
  "hematology-bloodbank": [
    "造血與血球生成",
    "紅血球與貧血",
    "白血球與白血病",
    "血小板與止血",
    "凝血與纖溶",
    "血液形態與骨髓判讀",
    "血液學檢驗技術",
    "血型與免疫血液學",
    "輸血醫學",
    "血庫品質與輸血反應",
  ],
  "immunology-virology": [
    "先天免疫",
    "適應性免疫",
    "抗原抗體與補體",
    "過敏反應與自體免疫",
    "免疫缺陷與移植免疫",
    "血清免疫檢驗",
    "病毒學總論",
    "DNA 病毒",
    "RNA 病毒",
    "肝炎病毒與慢性病毒感染",
    "病毒檢驗與抗病毒治療",
  ],
  "molecular-microscopy": [
    "分子生物學原理",
    "核酸萃取與擴增",
    "分子診斷技術",
    "遺傳變異與基因檢測",
    "尿液檢驗",
    "體液與鏡檢",
    "糞便與其他臨床鏡檢",
    "原蟲學",
    "蠕蟲學",
    "寄生蟲診斷",
    "分子與鏡檢品質管理",
  ],
};

function normalizeText(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/[()（）]/g, "")
    .replace(/[、，,。．·・]/g, "")
    .trim();
}

export function getTaxonomySubjectKey(value: string): TaxonomySubjectKey | null {
  const text = normalizeText(value);

  if (text.includes("微生物") || text.includes("細菌") || text.includes("黴菌")) {
    return "microbiology";
  }
  if (text.includes("生物化學") || text.includes("臨床生化")) {
    return "biochemistry";
  }
  if (text.includes("生理") || text.includes("病理")) {
    return "physiology-pathology";
  }
  if (text.includes("血液") || text.includes("血庫")) {
    return "hematology-bloodbank";
  }
  if (
    text.includes("血清免疫") ||
    text.includes("臨床免疫") ||
    text.includes("病毒")
  ) {
    return "immunology-virology";
  }
  if (
    text.includes("分子檢驗") ||
    text.includes("鏡檢") ||
    text.includes("寄生蟲")
  ) {
    return "molecular-microscopy";
  }

  return null;
}
