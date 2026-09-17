import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { GameState } from "@/lib/game-state-logic";

type GameStateClient = SupabaseClient<Database>;

export type PersistedGameStateRecord = {
  state: unknown;
  updatedAt: string;
};

export type SaveGameStateResult =
  | { status: "saved"; updatedAt: string }
  | { status: "conflict"; record: PersistedGameStateRecord };

function asJson(state: GameState): Json {
  return state as unknown as Json;
}

function nextUpdatedAt(previous?: string) {
  const previousMs = previous ? new Date(previous).getTime() : 0;
  const nextMs = Math.max(Date.now(), Number.isFinite(previousMs) ? previousMs + 1 : 0);
  return new Date(nextMs).toISOString();
}

export async function loadGameStateRecord(
  supabase: GameStateClient,
  userId: string,
): Promise<PersistedGameStateRecord | null> {
  const { data, error } = await supabase
    .from("player_account_state")
    .select("state,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取 MedSlime 遊戲資料失敗：${error.message}`);
  }
  if (!data) return null;

  return {
    state: data.state,
    updatedAt: data.updated_at,
  };
}

export async function createGameStateRecord(
  supabase: GameStateClient,
  userId: string,
  state: GameState,
): Promise<PersistedGameStateRecord> {
  const updatedAt = nextUpdatedAt();
  const { data, error } = await supabase
    .from("player_account_state")
    .insert({
      user_id: userId,
      state: asJson(state),
      updated_at: updatedAt,
    })
    .select("state,updated_at")
    .maybeSingle();

  if (!error && data) {
    return {
      state: data.state,
      updatedAt: data.updated_at,
    };
  }

  // Two tabs can both discover a missing row before either insert commits.
  // If this insert lost that race, load the row that actually won instead of
  // overwriting it with starter state.
  if (error?.code === "23505") {
    const existing = await loadGameStateRecord(supabase, userId);
    if (existing) return existing;
  }

  if (error) {
    throw new Error(`建立 MedSlime 遊戲資料失敗：${error.message}`);
  }
  throw new Error("建立 MedSlime 遊戲資料失敗：資料庫沒有回傳新紀錄。");
}

export async function saveGameStateRecord(
  supabase: GameStateClient,
  userId: string,
  state: GameState,
  expectedUpdatedAt: string,
): Promise<SaveGameStateResult> {
  const updatedAt = nextUpdatedAt(expectedUpdatedAt);
  const { data, error } = await supabase
    .from("player_account_state")
    .update({
      state: asJson(state),
      updated_at: updatedAt,
    })
    .eq("user_id", userId)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at")
    .maybeSingle();

  if (error) {
    throw new Error(`儲存 MedSlime 遊戲資料失敗：${error.message}`);
  }

  if (data) {
    return { status: "saved", updatedAt: data.updated_at };
  }

  const record = await loadGameStateRecord(supabase, userId);
  if (!record) {
    throw new Error("儲存 MedSlime 遊戲資料失敗：同步時找不到玩家資料。");
  }

  return { status: "conflict", record };
}
