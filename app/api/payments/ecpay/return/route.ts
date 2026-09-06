import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCheckMacValue } from "@/lib/ecpay";

export async function POST(request: NextRequest) {
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIv = process.env.ECPAY_HASH_IV;

  if (!hashKey || !hashIv) {
    return new NextResponse("0|ServerConfigError", { status: 500 });
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

    const merchantTradeNo = params.MerchantTradeNo;
    const rtnCode = params.RtnCode;
    const tradeNo = params.TradeNo || null;
    const paidAmount = Number(params.TradeAmt ?? params.PaymentDateAmount ?? 0);

    if (!merchantTradeNo) {
      return new NextResponse("0|MissingTradeNo", { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from("payment_orders")
      .select("id,total_amount,status")
      .eq("merchant_trade_no", merchantTradeNo)
      .maybeSingle();

    if (orderError || !order) {
      console.error("ECPay callback 找不到 MedSlime 訂單", orderError);
      return new NextResponse("0|OrderNotFound", { status: 404 });
    }

    if (Number.isFinite(paidAmount) && paidAmount > 0 && paidAmount !== order.total_amount) {
      console.error("ECPay callback 金額不符", {
        merchantTradeNo,
        expected: order.total_amount,
        received: paidAmount,
      });
      return new NextResponse("0|AmountMismatch", { status: 400 });
    }

    if (rtnCode === "1") {
      const { error: fulfillError } = await admin.rpc("fulfill_payment_order", {
        p_merchant_trade_no: merchantTradeNo,
        p_provider_trade_no: tradeNo,
      });

      if (fulfillError) {
        console.error("ECPay 訂單入帳失敗", fulfillError);
        return new NextResponse("0|FulfillmentError", { status: 500 });
      }
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
