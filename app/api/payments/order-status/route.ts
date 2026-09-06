import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const trade = request.nextUrl.searchParams.get("trade")?.trim();
  if (!trade) {
    return NextResponse.json({ error: "缺少訂單編號。" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("payment_orders")
      .select("merchant_trade_no,product_id,total_amount,status,paid_at,created_at")
      .eq("merchant_trade_no", trade)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      return NextResponse.json({ error: "找不到這筆訂單。" }, { status: 404 });
    }

    return NextResponse.json({ order: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "讀取訂單失敗。" },
      { status: 500 },
    );
  }
}
