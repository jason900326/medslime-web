export type ShopProductKind = "pro_30d" | "exam_explanation";

export type ShopProduct = {
  id: string;
  kind: ShopProductKind;
  title: string;
  price: number;
  priceSuffix: string;
  itemName: string;
  note: string;
  description: string;
  features: string[];
  badge?: string;
  featured?: boolean;
};

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: "pro-30d",
    kind: "pro_30d",
    title: "MedSlime Pro",
    price: 149,
    priceSuffix: "/ 30 天",
    itemName: "MedSlime Pro 30 天方案",
    note: "適合國考備考期間持續刷題、追蹤弱點與安排複習",
    description:
      "一次付款開通 30 天進階學習功能。Pro 的核心是個人化分析、複習工具與 AI 追問，不包含全站所有國考完整詳解。",
    features: [
      "跨考卷弱點與錯題趨勢分析",
      "考後個人化分析報告",
      "依弱點產生個人化複習建議",
      "進階錯題整理與複習追蹤",
      "AI 追問每日 10 次",
      "30 天內持續使用 Pro 進階學習功能",
    ],
    badge: "備考推薦",
    featured: true,
  },
  {
    id: "exam-full-explanation",
    kind: "exam_explanation",
    title: "單份國考完整詳解",
    price: 59,
    priceSuffix: "/ 份",
    itemName: "MedSlime 單份國考完整詳解",
    note: "只想完整檢討指定一份考卷時使用",
    description:
      "單次購買指定國考考卷的完整數位詳解。購買後永久保留該份考卷的完整詳解存取權，不是購買 AI 次數。",
    features: [
      "指定一份國考考卷",
      "該份考卷全題完整詳解存取權",
      "每個選項逐一解析",
      "核心考點與易混淆概念",
      "購買後永久保留該份詳解存取權",
    ],
  },
];

export const SHOP_PRODUCT_BY_ID = Object.fromEntries(
  SHOP_PRODUCTS.map((product) => [product.id, product]),
) as Record<string, ShopProduct>;
