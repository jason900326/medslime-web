import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function entitlementMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  return typeof metadata[key] === "string" ? metadata[key] : null;
}

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
      .select(
        "merchant_trade_no,product_id,total_amount,status,paid_at,created_at,entitlement_type,entitlement_key,entitlement_metadata",
      )
      .eq("merchant_trade_no", trade)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      return NextResponse.json({ error: "找不到這筆訂單。" }, { status: 404 });
    }

    const metadata = entitlementMetadata(data.entitlement_metadata);
    let entitlement: Record<string, unknown> | null = null;

    if (data.status === "paid" && data.entitlement_type === "pro_30d") {
      const { data: pro, error: proError } = await admin
        .from("player_entitlements")
        .select("pro_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (proError) throw new Error(proError.message);
      const proExpiresAt = pro?.pro_expires_at ?? null;
      entitlement = {
        type: "pro_30d",
        active: Boolean(
          proExpiresAt && new Date(proExpiresAt).getTime() > Date.now(),
        ),
        proExpiresAt,
      };
    }

    if (
      data.status === "paid" &&
      data.entitlement_type === "exam_explanation" &&
      data.entitlement_key
    ) {
      const { data: exam, error: examError } = await admin
        .from("exam_explanation_entitlements")
        .select("purchased_at,year,session,subject")
        .eq("user_id", user.id)
        .eq("exam_key", data.entitlement_key)
        .maybeSingle();

      if (examError) throw new Error(examError.message);
      entitlement = {
        type: "exam_explanation",
        purchased: Boolean(exam),
        purchasedAt: exam?.purchased_at ?? null,
        year: exam?.year ?? metadataString(metadata, "year"),
        session: exam?.session ?? metadataString(metadata, "session"),
        subject: exam?.subject ?? metadataString(metadata, "subject"),
      };
    }

    return NextResponse.json({ order: data, entitlement });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "讀取訂單失敗。" },
      { status: 500 },
    );
  }
}
