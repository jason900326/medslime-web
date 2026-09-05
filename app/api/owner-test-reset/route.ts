import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OWNER_EMAIL = "s0916540326@gmail.com";
const OWNER_RESET_VERSION = 1;
const OWNER_TEST_COINS = 100_000;
const OWNER_TEST_TICKETS = 500;

function ownerTestState() {
  return {
    coins: OWNER_TEST_COINS,
    tickets: OWNER_TEST_TICKETS,
    streak: 0,
    companionId: "n-green",
    freePullDate: null,
    pity: 0,
    totalPulls: 0,
    totalQuestionsAnswered: 0,
    totalMistakesReviewed: 0,
    activityByDate: {},
    claimedAchievementIds: [],
    claimedTaskIds: [],
    focusHistory: [],
    hasSeenOnboarding: false,
    ownerResetVersion: OWNER_RESET_VERSION,
    slimes: {
      "n-green": {
        owned: true,
        fragments: 0,
        accessoryUnlocked: false,
        accessoryEquipped: false,
      },
    },
  };
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

    if (user.email?.toLowerCase() !== OWNER_EMAIL) {
      return NextResponse.json({ error: "沒有權限。" }, { status: 403 });
    }

    const { data: currentRow, error: readError } = await supabase
      .from("player_account_state")
      .select("state")
      .eq("user_id", user.id)
      .maybeSingle();

    if (readError) throw new Error(readError.message);

    const currentState = currentRow?.state as
      | { ownerResetVersion?: number }
      | null
      | undefined;

    if ((currentState?.ownerResetVersion ?? 0) >= OWNER_RESET_VERSION) {
      return NextResponse.json({
        ok: true,
        applied: false,
        coins: OWNER_TEST_COINS,
        tickets: OWNER_TEST_TICKETS,
      });
    }

    const { error: mistakesError } = await supabase
      .from("player_mistakes")
      .delete()
      .eq("user_id", user.id);

    if (mistakesError) throw new Error(mistakesError.message);

    const { error: stateError } = await supabase
      .from("player_account_state")
      .upsert(
        {
          user_id: user.id,
          state: ownerTestState(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (stateError) throw new Error(stateError.message);

    return NextResponse.json({
      ok: true,
      applied: true,
      coins: OWNER_TEST_COINS,
      tickets: OWNER_TEST_TICKETS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "測試帳號重置失敗。",
      },
      { status: 500 },
    );
  }
}
