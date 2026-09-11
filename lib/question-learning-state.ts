"use client";

import { createClient } from "@/lib/supabase/client";

export type QuestionLearningState = {
  questionKey: string;
  conceptUnfamiliar: boolean;
  note: string;
  updatedAt: string | null;
};

type LearningStateRow = {
  question_key: string;
  concept_unfamiliar: boolean | null;
  note: string | null;
  updated_at: string | null;
};

function mapRow(row: LearningStateRow): QuestionLearningState {
  return {
    questionKey: row.question_key,
    conceptUnfamiliar: row.concept_unfamiliar === true,
    note: typeof row.note === "string" ? row.note : "",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

function missingTable(message: string) {
  return /user_question_learning_state|does not exist|schema cache/i.test(message);
}

export async function readQuestionLearningStates(
  questionKeys: string[],
): Promise<Map<string, QuestionLearningState>> {
  const keys = Array.from(new Set(questionKeys.map((key) => key.trim()).filter(Boolean)));
  if (keys.length === 0) return new Map();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data, error } = await supabase
    .from("user_question_learning_state")
    .select("question_key,concept_unfamiliar,note,updated_at")
    .eq("user_id", user.id)
    .in("question_key", keys);

  if (error) {
    if (missingTable(error.message)) return new Map();
    throw new Error(`讀取題目學習狀態失敗：${error.message}`);
  }

  return new Map(
    ((data ?? []) as LearningStateRow[]).map((row) => {
      const item = mapRow(row);
      return [item.questionKey, item] as const;
    }),
  );
}

export async function saveQuestionLearningState(input: {
  questionKey: string;
  conceptUnfamiliar: boolean;
  note: string;
}): Promise<QuestionLearningState> {
  const questionKey = input.questionKey.trim();
  if (!questionKey) throw new Error("缺少 questionKey。");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("請先登入。");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_question_learning_state")
    .upsert(
      {
        user_id: user.id,
        question_key: questionKey,
        concept_unfamiliar: input.conceptUnfamiliar,
        note: input.note,
        updated_at: now,
      },
      { onConflict: "user_id,question_key" },
    )
    .select("question_key,concept_unfamiliar,note,updated_at")
    .single();

  if (error) {
    if (missingTable(error.message)) {
      throw new Error("題目筆記資料表尚未建立，請先套用 Phase F SQL migration。");
    }
    throw new Error(`儲存題目學習狀態失敗：${error.message}`);
  }

  return mapRow(data as LearningStateRow);
}
