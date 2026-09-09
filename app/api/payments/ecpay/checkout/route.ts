import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SHOP_PRODUCT_BY_ID } from "@/lib/shop-products";

export async function POST(request: NextRequest) {
  try {
    if (process.env.SHOP_CHECKOUT_ENABLED !== "true") {
      return NextResponse.json(
        { error: "商城付款功能目前正在金流審核中。" },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入。" }, { status: 401 });
    }

    const form = await request.formData();
    const productId = String(form.get("productId") ?? "");
    const product = SHOP_PRODUCT_BY_ID[productId];

    if (!product) {
      return NextResponse.json({ error: "找不到這個商品。" }, { status: 400 });
    }

    if (product.kind === "exam_explanation") {
      return NextResponse.json(
        { error: "單份國考完整詳解請先從國考題庫選擇指定考卷。" },
        { status: 400 },
      );
    }

    // Legacy checkout used to grant purchasable AI-detail credits. That flow is
    // intentionally retired. Keep checkout closed until the Pro subscription
    // fulfillment schema is deployed so a payment can never fall back to the
    // old stored-credit model.
    return NextResponse.json(
      {
        error:
          "MedSlime Pro 新版會員付款後端正在更新中，目前暫不開放付款。",
      },
      { status: 503 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "建立付款訂單失敗。" },
      { status: 500 },
    );
  }
}
