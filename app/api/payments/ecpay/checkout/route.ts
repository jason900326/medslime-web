import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SHOP_PRODUCT_BY_ID } from "@/lib/shop-products";
import {
  createCheckMacValue,
  createMerchantTradeNo,
  formatMerchantTradeDate,
  getEcpayCheckoutUrl,
} from "@/lib/ecpay";
import {
  getEcpayMode,
  getPaymentCallbackBaseUrl,
  getPaymentEnvironmentProblem,
  isAllowedStageTester,
} from "@/lib/payment-environment";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function checkoutDocument(action: string, params: Record<string, string>) {
  const inputs = Object.entries(params)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>前往綠界付款</title>
  </head>
  <body>
    <form id="ecpay-checkout" method="post" action="${escapeHtml(action)}">
      ${inputs}
      <noscript><button type="submit">前往付款</button></noscript>
    </form>
    <script>document.getElementById("ecpay-checkout").submit();</script>
  </body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.SHOP_CHECKOUT_ENABLED !== "true") {
      return NextResponse.json(
        { error: "商城付款功能目前正在金流審核中。" },
        { status: 503 },
      );
    }

    const environmentProblem = getPaymentEnvironmentProblem();
    if (environmentProblem) {
      console.error("付款環境安全檢查未通過：", environmentProblem);
      return NextResponse.json(
        { error: "付款環境設定不安全，已停止建立訂單。" },
        { status: 503 },
      );
    }

    const merchantId = process.env.ECPAY_MERCHANT_ID?.trim();
    const hashKey = process.env.ECPAY_HASH_KEY?.trim();
    const hashIv = process.env.ECPAY_HASH_IV?.trim();

    if (!merchantId || !hashKey || !hashIv) {
      return NextResponse.json(
        { error: "付款服務尚未完成伺服器設定。" },
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

    if (getEcpayMode() === "stage" && !isAllowedStageTester(user.email)) {
      return NextResponse.json(
        { error: "綠界測試付款目前只開放指定測試帳號。" },
        { status: 403 },
      );
    }

    const form = await request.formData();
    const productId = String(form.get("productId") ?? "").trim();
    const product = SHOP_PRODUCT_BY_ID[productId];

    if (!product) {
      return NextResponse.json({ error: "找不到這個商品。" }, { status: 400 });
    }

    const siteUrl = getPaymentCallbackBaseUrl(request.nextUrl.origin);
    const admin = createAdminClient();
    let entitlementType: "pro_30d" | "exam_explanation";
    let entitlementKey: string | null = null;
    let entitlementMetadata: Record<string, string> = {};

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

      entitlementType = "exam_explanation";
      entitlementKey = `${year}-${session}-${subject}`;
      entitlementMetadata = { year, session, subject };

      const { data: owned, error: ownedError } = await admin
        .from("exam_explanation_entitlements")
        .select("exam_key")
        .eq("user_id", user.id)
        .eq("exam_key", entitlementKey)
        .maybeSingle();

      if (ownedError) {
        throw new Error(`詳解權限讀取失敗：${ownedError.message}`);
      }

      if (owned) {
        const params = new URLSearchParams({ year, session, subject });
        return NextResponse.redirect(
          `${siteUrl}/study/exam/explanation?${params.toString()}`,
          { status: 303 },
        );
      }
    } else {
      entitlementType = "pro_30d";
    }

    const merchantTradeNo = createMerchantTradeNo();
    const { error: orderError } = await admin.from("payment_orders").insert({
      user_id: user.id,
      merchant_trade_no: merchantTradeNo,
      product_id: product.id,
      total_amount: product.price,
      entitlement_type: entitlementType,
      entitlement_key: entitlementKey,
      entitlement_metadata: entitlementMetadata,
      status: "pending",
      provider: "ecpay",
    });

    if (orderError) {
      throw new Error(
        `建立付款訂單失敗：${orderError.message}。若尚未執行 payment_entitlement_v2.sql，請先完成資料庫 migration。`,
      );
    }

    const ecpayParams: Record<string, string> = {
      MerchantID: merchantId,
      MerchantTradeNo: merchantTradeNo,
      MerchantTradeDate: formatMerchantTradeDate(),
      PaymentType: "aio",
      TotalAmount: String(product.price),
      TradeDesc: "MedSlime learning service",
      ItemName: product.itemName,
      ReturnURL: `${siteUrl}/api/payments/ecpay/return`,
      ClientBackURL: `${siteUrl}/shop/payment-result?trade=${encodeURIComponent(merchantTradeNo)}`,
      ChoosePayment: "ALL",
      EncryptType: "1",
    };

    ecpayParams.CheckMacValue = createCheckMacValue(
      ecpayParams,
      hashKey,
      hashIv,
    );

    return new NextResponse(
      checkoutDocument(getEcpayCheckoutUrl(), ecpayParams),
      {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "建立付款訂單失敗。" },
      { status: 500 },
    );
  }
}
