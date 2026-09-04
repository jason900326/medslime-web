"use client";

import { createClient } from "@/lib/supabase/client";

export type MistakeSource = "national-exam" | "material";

export type MistakeRecord = {
  id: string;
  source: MistakeSource;
  sourceLabel: string;
  subject?: string;
  year?: string;
  session?: string;
  questionNumber?: number;
  stem: string;
  options: string[];
  correctIndex: number | null;
  userAnswer: number | null;
  uncertain: boolean;
  officialPdfUrl?: string | null;
  explanation?: string;
  createdAt: string;
  reviewed: boolean;
};

type MistakeRow = {
  mistake_id: string;
  record: MistakeRecord;
};

const LEGACY_STORAGE_KEY = "medslime_mistakes_v1";

async function getCurrentUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    userId: user?.id ?? null,
  };
}

function readLegacyMistakes(userId: string): MistakeRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(
      `${LEGACY_STORAGE_KEY}:${userId}`,
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function removeLegacyMistakes(userId: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(
      `${LEGACY_STORAGE_KEY}:${userId}`,
    );
  } catch {
    // 舊資料清除失敗不影響 Supabase 正式資料。
  }
}

export async function readMistakes(): Promise<MistakeRecord[]> {
  const { supabase, userId } = await getCurrentUserId();

  if (!userId) return [];

  const { data, error } = await supabase
    .from("player_mistakes")
    .select("mistake_id, record")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("讀取錯題庫失敗：", error);
    throw new Error("錯題庫讀取失敗，請稍後再試。");
  }

  const rows = (data ?? []) as MistakeRow[];

  if (rows.length > 0) {
    return rows
      .map((row) => row.record)
      .filter(Boolean);
  }

  // 一次性搬移目前瀏覽器裡舊的帳號專屬 localStorage 錯題。
  const legacy = readLegacyMistakes(userId);

  if (legacy.length > 0) {
    await upsertMistakes(legacy);
    removeLegacyMistakes(userId);
    return legacy;
  }

  return [];
}

export async function upsertMistakes(
  records: MistakeRecord[],
): Promise<void> {
  if (records.length === 0) return;

  const { supabase, userId } = await getCurrentUserId();

  // 未登入時仍允許刷題，但不建立個人錯題庫。
  if (!userId) return;

  const ids = records.map((item) => item.id);

  const { data: existingData, error: existingError } = await supabase
    .from("player_mistakes")
    .select("mistake_id, record")
    .eq("user_id", userId)
    .in("mistake_id", ids);

  if (existingError) {
    console.error("讀取既有錯題失敗：", existingError);
    throw new Error("錯題儲存失敗，請稍後再試。");
  }

  const existingMap = new Map<string, MistakeRecord>();

  for (const row of (existingData ?? []) as MistakeRow[]) {
    if (row.record) {
      existingMap.set(row.mistake_id, row.record);
    }
  }

  const now = new Date().toISOString();

  const rows = records.map((item) => {
    const previous = existingMap.get(item.id);

    const merged: MistakeRecord = {
      ...previous,
      ...item,
      reviewed: previous?.reviewed ?? item.reviewed ?? false,
    };

    return {
      user_id: userId,
      mistake_id: item.id,
      record: merged,
      created_at: previous?.createdAt ?? item.createdAt ?? now,
      updated_at: now,
    };
  });

  const { error } = await supabase
    .from("player_mistakes")
    .upsert(rows, {
      onConflict: "user_id,mistake_id",
    });

  if (error) {
    console.error("儲存錯題失敗：", error);
    throw new Error("錯題儲存失敗，請稍後再試。");
  }
}

export async function setMistakeReviewed(
  id: string,
  reviewed: boolean,
): Promise<MistakeRecord[]> {
  const { supabase, userId } = await getCurrentUserId();

  if (!userId) return [];

  const { data, error } = await supabase
    .from("player_mistakes")
    .select("record")
    .eq("user_id", userId)
    .eq("mistake_id", id)
    .maybeSingle();

  if (error) {
    console.error("讀取錯題狀態失敗：", error);
    throw new Error("錯題狀態更新失敗。");
  }

  const current = data?.record as MistakeRecord | undefined;

  if (!current) {
    return readMistakes();
  }

  const next: MistakeRecord = {
    ...current,
    reviewed,
  };

  const { error: updateError } = await supabase
    .from("player_mistakes")
    .update({
      record: next,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("mistake_id", id);

  if (updateError) {
    console.error("更新錯題狀態失敗：", updateError);
    throw new Error("錯題狀態更新失敗。");
  }

  return readMistakes();
}

export async function removeMistake(
  id: string,
): Promise<MistakeRecord[]> {
  const { supabase, userId } = await getCurrentUserId();

  if (!userId) return [];

  const { error } = await supabase
    .from("player_mistakes")
    .delete()
    .eq("user_id", userId)
    .eq("mistake_id", id);

  if (error) {
    console.error("移除錯題失敗：", error);
    throw new Error("移除錯題失敗。");
  }

  return readMistakes();
}
