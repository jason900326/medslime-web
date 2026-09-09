export type ShopProductKind = "pro_monthly" | "exam_explanation";

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
    id: "pro-monthly",
    kind: "pro_monthly",
    title: "MedSlime Pro",
    price: 149,
    priceSuffix: "/ 月",
    itemName: "MedSlime Pro 月方案",
    note: "適合國考備考期間持續刷題與檢討",
    description:
      "訂閱期間解鎖完整國考詳解與進階學習分析。Pro 是學習會員服務，不是 AI 次數或點數儲值。",
    features: [
      "完整國考詳解庫",
      "每個選項為什麼對／錯",
      "錯題與弱點進階分析",
      "考後個人化分析報告",
      "個人化複習建議",
      "AI 進階追問與較高每日使用上限",
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
      "單次購買指定國考考卷的完整數位詳解；購買後解鎖該份考卷內容，不建立可消耗的 AI 額度。",
    features: [
      "指定一份國考考卷",
      "全題完整詳解",
      "每個選項逐一解析",
      "核心考點與易混淆概念",
      "購買後保留該份詳解存取權",
    ],
  },
];

export const SHOP_PRODUCT_BY_ID = Object.fromEntries(
  SHOP_PRODUCTS.map((product) => [product.id, product]),
) as Record<string, ShopProduct>;
