import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCheckMacValue } from "@/lib/ecpay";
import { getPaymentEnvironmentProblem } from "@/lib/payment-environment";

export async function POST(request: NextRequest) {
  const merchantId = process.env.ECPAY_MERCHANT_ID?.trim();
  const hashKey = process.env.ECPAY_HASH_KEY?.trim();
  const hashIv = process.env.ECPAY_HASH_IV?.trim();

  if (!merchantId || !hashKey || !hashIv) {
    return new NextResponse("0|ServerConfigError", { status: 500 });
  }

  const environmentProblem = getPaymentEnvironmentProblem();
  if (environmentProblem) {
    console.error("ECPay callback payment environment mismatch", environmentProblem);
    return new NextResponse("0|EnvironmentMismatch", { status: 503 });
  }

  try {
    const form = await request.formData();
    const params = Object.fromEntries(
      Array.from(form.entries()).map(([key, value]) => [key, String(value)]),
    );

    if (!verifyCheckMacValue(params, hashKey, hashIv)) {
      console.error("ECPay callback CheckMacValue 驗證失敗", {
        MerchantTradeNo: params.MerchantTradeNo,
      });
      return new NextResponse("0|CheckMacValueError", { status: 400 });
    }

    if (params.MerchantID !== merchantId) {
      console.error("ECPay callback MerchantID 不符", {
        MerchantTradeNo: params.MerchantTradeNo,
        receivedMerchantId: params.MerchantID,
      });
      return new NextResponse("0|MerchantMismatch", { status: 400 });
    }

    const merchantTradeNo = params.MerchantTradeNo?.trim();
    const rtnCode = params.RtnCode?.trim();
    const tradeNo = params.TradeNo?.trim() || null;

    if (!merchantTradeNo) {
      return new NextResponse("0|MissingTradeNo", { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from("payment_orders")
      .select("id,total_amount,status,provider")
      .eq("merchant_trade_no", merchantTradeNo)
      .maybeSingle();

    if (orderError || !order) {
      console.error("ECPay callback 找不到 MedSlime 訂單", orderError);
      return new NextResponse("0|OrderNotFound", { status: 404 });
    }

    if (order.provider !== "ecpay") {
      console.error("ECPay callback 訂單 provider 不符", {
        merchantTradeNo,
        provider: order.provider,
      });
      return new NextResponse("0|ProviderMismatch", { status: 400 });
    }

    if (rtnCode === "1") {
      const tradeAmountText = params.TradeAmt?.trim();
      const paidAmount = Number(tradeAmountText);

      if (
        !tradeAmountText ||
        !Number.isFinite(paidAmount) ||
        paidAmount <= 0 ||
        paidAmount !== Number(order.total_amount)
      ) {
        console.error("ECPay callback 金額不符", {
          merchantTradeNo,
          expected: order.total_amount,
          received: params.TradeAmt,
        });
        return new NextResponse("0|AmountMismatch", { status: 400 });
      }

      const { error: fulfillError } = await admin.rpc("fulfill_payment_order", {
        p_merchant_trade_no: merchantTradeNo,
        p_provider_trade_no: tradeNo,
      });

      if (fulfillError) {
        console.error("ECPay 訂單入帳失敗", fulfillError);
        return new NextResponse("0|FulfillmentError", { status: 500 });
      }

      await admin
        .from("payment_orders")
        .update({
          provider_message: params.RtnMsg || "payment_completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
    } else if (order.status === "pending") {
      await admin
        .from("payment_orders")
        .update({
          provider_trade_no: tradeNo,
          provider_message: params.RtnMsg || "payment_not_completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
    }

    return new NextResponse("1|OK", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("ECPay callback 處理失敗", error);
    return new NextResponse("0|ServerError", { status: 500 });
  }
}
