export type ShopProduct = {
  id: string;
  kind: "ai_detail";
  amount: number;
  price: number;
  itemName: string;
  note: string;
};

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: "ai-30",
    kind: "ai_detail",
    amount: 30,
    price: 30,
    itemName: "MedSlime AI 詳解 30 次",
    note: "適合偶爾深挖錯題",
  },
  {
    id: "ai-80",
    kind: "ai_detail",
    amount: 80,
    price: 60,
    itemName: "MedSlime AI 詳解 80 次",
    note: "刷題期間比較夠用",
  },
  {
    id: "ai-200",
    kind: "ai_detail",
    amount: 200,
    price: 120,
    itemName: "MedSlime AI 詳解 200 次",
    note: "大量題目檢討",
  },
];

export const SHOP_PRODUCT_BY_ID = Object.fromEntries(
  SHOP_PRODUCTS.map((product) => [product.id, product]),
) as Record<string, ShopProduct>;
