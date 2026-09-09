import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DAILY_FREE_AI_DETAILS = 5;

function currentTaipeiPeriod() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入。" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("player_entitlements")
      .select("ai_detail_free_period,ai_detail_free_used,pro_expires_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const period = currentTaipeiPeriod();
    const usedToday = data?.ai_detail_free_period === period
      ? Math.max(0, Number(data?.ai_detail_free_used ?? 0))
      : 0;
    const freeRemaining = Math.max(0, DAILY_FREE_AI_DETAILS - usedToday);
    const proExpiresAt = data?.pro_expires_at ?? null;
    const isPro = Boolean(
      proExpiresAt && new Date(proExpiresAt).getTime() > Date.now(),
    );

    return NextResponse.json({
      aiDetailFreeRemaining: freeRemaining,
      aiDetailFreeDailyLimit: DAILY_FREE_AI_DETAILS,
      aiDetailUsedToday: usedToday,
      isPro,
      proExpiresAt,
      updatedAt: data?.updated_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "讀取學習服務狀態失敗。",
      },
      { status: 500 },
    );
  }
}
