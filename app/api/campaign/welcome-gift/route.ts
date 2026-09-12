import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  WELCOME_GIFT_TICKETS,
  isEligibleCampaignSignup,
} from "@/lib/campaign";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入。" }, { status: 401 });
    }

    const eligible = isEligibleCampaignSignup(user.created_at);
    if (!eligible) {
      return NextResponse.json({
        eligible: false,
        claimed: false,
        tickets: WELCOME_GIFT_TICKETS,
      });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("player_entitlements")
      .select("welcome_gift_claimed_at,pro_expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      eligible: true,
      claimed: Boolean(data?.welcome_gift_claimed_at),
      tickets: WELCOME_GIFT_TICKETS,
      proExpiresAt: data?.pro_expires_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "讀取新手小禮物失敗。",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入。" }, { status: 401 });
    }

    if (!isEligibleCampaignSignup(user.created_at)) {
      return NextResponse.json(
        { error: "這個帳號不在本次新生體驗活動期間內。" },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("claim_campaign_welcome_gift", {
      p_user_id: user.id,
    });

    if (error) throw new Error(error.message);

    const payload =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : {};

    return NextResponse.json({
      eligible: payload.eligible === true,
      claimed: payload.claimed === true,
      alreadyClaimed: payload.alreadyClaimed === true,
      ticketsAdded: Math.max(0, Number(payload.ticketsAdded ?? 0)),
      ticketTotal: Math.max(0, Number(payload.ticketTotal ?? 0)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "領取新手小禮物失敗。",
      },
      { status: 500 },
    );
  }
}
