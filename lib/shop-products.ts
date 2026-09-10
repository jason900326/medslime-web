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
    note: "適合國考備考期間持續刷題、追蹤成績與安排複習",
    description:
      "一次付款開通 30 天進階學習分析。系統會依你的歷史作答、逐題結果與錯題紀錄整理趨勢，幫你看出弱科、弱主題與複習優先順序。",
    features: [
      "跨考卷科目成績與弱科排序",
      "依逐題作答統計 Topic / Subtopic 弱點",
      "最近作答成績與主題改善趨勢",
      "依弱主題、弱科與錯題整理複習優先順序",
      "從 Pro 弱點分析直接建立弱主題練習",
      "30 天內持續使用 Pro 進階分析功能",
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
      "單次購買指定國考考卷的完整數位詳解，購買後永久保留該份考卷的完整詳解存取權。",
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
