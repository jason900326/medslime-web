import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentReadinessSnapshot } from "@/lib/payment-environment";

function isAuthorized(request: NextRequest) {
  const received = request.headers.get("x-payment-secret")?.trim();
  const expected =
    process.env.PAYMENT_ADMIN_SECRET?.trim() ||
    process.env.TAXONOMY_ADMIN_SECRET?.trim();
  return Boolean(received && expected && received === expected);
}

function supabaseEnvSnapshot() {
  return {
    publicUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    publishableKey: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
    ),
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseEnv = supabaseEnvSnapshot();
  const missingSupabaseEnv = [
    !supabaseEnv.publicUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !supabaseEnv.serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
  ].filter(Boolean);

  if (missingSupabaseEnv.length > 0) {
    return NextResponse.json(
      {
        ...getPaymentReadinessSnapshot(),
        supabaseEnv,
        missingSupabaseEnv,
        error: `Preview deployment is missing: ${missingSupabaseEnv.join(", ")}`,
      },
      { status: 500 },
    );
  }

  try {
    const admin = createAdminClient();
    const [orders, entitlements, examEntitlements] = await Promise.all([
      admin.from("payment_orders").select("id", { count: "exact", head: true }),
      admin.from("player_entitlements").select("user_id", { count: "exact", head: true }),
      admin
        .from("exam_explanation_entitlements")
        .select("user_id", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      ...getPaymentReadinessSnapshot(),
      supabaseEnv,
      schema: {
        paymentOrders: !orders.error,
        playerEntitlements: !entitlements.error,
        examExplanationEntitlements: !examEntitlements.error,
      },
      schemaErrors: [orders.error, entitlements.error, examEntitlements.error]
        .filter(Boolean)
        .map((error) => error?.message ?? "unknown schema error"),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ...getPaymentReadinessSnapshot(),
        supabaseEnv,
        error: error instanceof Error ? error.message : "Readiness check failed.",
      },
      { status: 500 },
    );
  }
}
