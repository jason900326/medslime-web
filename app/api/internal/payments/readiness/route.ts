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

type SchemaProbeResult = {
  ok: boolean;
  attempts: number;
  error: null | {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
  };
};

function serializeSupabaseError(error: unknown): SchemaProbeResult["error"] {
  if (!error || typeof error !== "object") return null;
  const value = error as Record<string, unknown>;
  return {
    message:
      typeof value.message === "string" ? value.message : "unknown schema error",
    code: typeof value.code === "string" ? value.code : undefined,
    details: typeof value.details === "string" ? value.details : undefined,
    hint: typeof value.hint === "string" ? value.hint : undefined,
  };
}

async function probeTable(
  query: () => PromiseLike<{ error: unknown }>,
  maxAttempts = 3,
): Promise<SchemaProbeResult> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await query();
    if (!result.error) {
      return { ok: true, attempts: attempt, error: null };
    }

    lastError = result.error;
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  return {
    ok: false,
    attempts: maxAttempts,
    error: serializeSupabaseError(lastError),
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
      probeTable(() =>
        admin.from("payment_orders").select("id", { count: "exact", head: true }),
      ),
      probeTable(() =>
        admin
          .from("player_entitlements")
          .select("user_id", { count: "exact", head: true }),
      ),
      probeTable(() =>
        admin
          .from("exam_explanation_entitlements")
          .select("user_id", { count: "exact", head: true }),
      ),
    ]);

    const schemaDiagnostics = {
      paymentOrders: orders,
      playerEntitlements: entitlements,
      examExplanationEntitlements: examEntitlements,
    };

    return NextResponse.json({
      ...getPaymentReadinessSnapshot(),
      supabaseEnv,
      schema: {
        paymentOrders: orders.ok,
        playerEntitlements: entitlements.ok,
        examExplanationEntitlements: examEntitlements.ok,
      },
      schemaDiagnostics,
      schemaErrors: Object.entries(schemaDiagnostics)
        .filter(([, result]) => !result.ok)
        .map(([name, result]) => {
          const error = result.error;
          const parts = [
            `${name}: ${error?.message ?? "unknown schema error"}`,
            error?.code ? `code=${error.code}` : null,
            error?.details ? `details=${error.details}` : null,
            error?.hint ? `hint=${error.hint}` : null,
          ].filter(Boolean);
          return parts.join(" | ");
        }),
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
