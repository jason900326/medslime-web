import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createCheckMacValue,
  createMerchantTradeNo,
  formatMerchantTradeDate,
  getEcpayCheckoutUrl,
} from "@/lib/ecpay";
import { SHOP_PRODUCT_BY_ID } from "@/lib/shop-products";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function POST(request: NextRequest) {
  try {
    const merchantId = process.env.ECPAY_MERCHANT_ID;
    const hashKey = process.env.ECPAY_HASH_KEY;
    const hashIv = process.env.ECPAY_HASH_IV;

    if (!merchantId || !hashKey || !hashIv) {
      return NextResponse.json(
        { error: "綠界金流尚未完成伺服器設定。" },
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

    const merchantTradeNo = createMerchantTradeNo();
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    ).replace(/\/$/, "");

    const admin = createAdminClient();
    const { error: orderError } = await admin.from("payment_orders").insert({
      user_id: user.id,
      merchant_trade_no: merchantTradeNo,
      product_id: product.id,
      total_amount: product.price,
      grant_type: product.kind,
      grant_amount: product.amount,
      status: "pending",
      provider: "ecpay",
    });

    if (orderError) {
      throw new Error(`建立訂單失敗：${orderError.message}`);
    }

    const params: Record<string, string> = {
      MerchantID: merchantId,
      MerchantTradeNo: merchantTradeNo,
      MerchantTradeDate: formatMerchantTradeDate(),
      PaymentType: "aio",
      TotalAmount: String(product.price),
      TradeDesc: "MedSlime recharge",
      ItemName: product.itemName,
      ReturnURL: `${siteUrl}/api/payments/ecpay/return`,
      ChoosePayment: "ALL",
      ClientBackURL: `${siteUrl}/shop/payment-result?trade=${merchantTradeNo}`,
      EncryptType: "1",
    };

    params.CheckMacValue = createCheckMacValue(params, hashKey, hashIv);

    const inputs = Object.entries(params)
      .map(
        ([key, value]) =>
          `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`,
      )
      .join("\n");

    const html = `<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>前往綠界付款</title></head>
<body style="font-family:system-ui,sans-serif;background:#f8fcf9;color:#17372a;text-align:center;padding:48px 20px">
  <p style="font-weight:800">正在前往綠界安全付款頁面…</p>
  <form id="ecpay-form" method="post" action="${escapeHtml(getEcpayCheckoutUrl())}">
    ${inputs}
    <noscript><button type="submit">繼續付款</button></noscript>
  </form>
  <script>document.getElementById('ecpay-form').submit();</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "建立付款訂單失敗。" },
      { status: 500 },
    );
  }
}
