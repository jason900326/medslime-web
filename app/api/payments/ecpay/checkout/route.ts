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
      const year = String(form.get("year") ?? "").trim();
      const session = String(form.get("session") ?? "").trim();
      const subject = String(form.get("subject") ?? "").trim();

      if (!year || !session || !subject) {
        return NextResponse.json(
          { error: "單份國考完整詳解必須先指定年度、梯次與科目。" },
          { status: 400 },
        );
      }

      // The public CTA can carry the exact exam identity, but payment stays
      // closed until permanent exam-access fulfillment is deployed. Never fall
      // back to the retired AI-credit model.
      return NextResponse.json(
        {
          error:
            "單份國考完整詳解付款後端尚未完成永久存取權開通，目前暫不開放付款。",
        },
        { status: 503 },
      );
    }

    // Pro is a fixed 30-day learning-service entitlement, not an auto-renewing
    // subscription and not a stored-value balance. Keep checkout closed until
    // the matching expiry-based entitlement / fulfillment schema is deployed.
    return NextResponse.json(
      {
        error:
          "MedSlime Pro 30 天方案付款後端正在更新中，目前暫不開放付款。",
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
