export type ShopProduct = {
  id: string;
  kind: "coins" | "ai_detail";
  amount: number;
  price: number;
  itemName: string;
  note: string;
};

export const SHOP_PRODUCTS: ShopProduct[] = [
  { id: "coins-300", kind: "coins", amount: 300, price: 30, itemName: "MedSlime 金幣 300", note: "約 3 抽" },
  { id: "coins-700", kind: "coins", amount: 700, price: 60, itemName: "MedSlime 金幣 700", note: "約 7 抽" },
  { id: "coins-1500", kind: "coins", amount: 1500, price: 120, itemName: "MedSlime 金幣 1500", note: "約 15 抽" },
  { id: "coins-3300", kind: "coins", amount: 3300, price: 240, itemName: "MedSlime 金幣 3300", note: "約 33 抽" },
  { id: "ai-30", kind: "ai_detail", amount: 30, price: 30, itemName: "MedSlime AI 詳解 30 次", note: "適合偶爾深挖錯題" },
  { id: "ai-80", kind: "ai_detail", amount: 80, price: 60, itemName: "MedSlime AI 詳解 80 次", note: "刷題期間比較夠用" },
  { id: "ai-200", kind: "ai_detail", amount: 200, price: 120, itemName: "MedSlime AI 詳解 200 次", note: "大量題目檢討" },
];

export const SHOP_PRODUCT_BY_ID = Object.fromEntries(
  SHOP_PRODUCTS.map((product) => [product.id, product]),
) as Record<string, ShopProduct>;
