"use client";

import { createClient } from "@/lib/supabase/client";

export type QuestionLearningState = {
  questionKey: string;
  conceptUnfamiliar: boolean;
  note: string;
  masteryStreak: number;
  masteredAt: string | null;
  lastPracticedAt: string | null;
  updatedAt: string | null;
};

export type QuestionLearningMemoryItem = QuestionLearningState & {
  year: string | null;
  session: string | null;
  subject: string | null;
  questionNumber: number | null;
  stem: string | null;
};

type LearningStateRow = {
  question_key: string;
  concept_unfamiliar: boolean | null;
  note: string | null;
  mastery_streak?: number | null;
  mastered_at?: string | null;
  last_practiced_at?: string | null;
  updated_at: string | null;
};

type NationalExamQuestion = {
  questionNumber: number;
  stem: string;
};

const SELECT_V2 =
  "question_key,concept_unfamiliar,note,mastery_streak,mastered_at,last_practiced_at,updated_at";
const SELECT_V1 = "question_key,concept_unfamiliar,note,updated_at";

function mapRow(row: LearningStateRow): QuestionLearningState {
  return {
    questionKey: row.question_key,
    conceptUnfamiliar: row.concept_unfamiliar === true,
    note: typeof row.note === "string" ? row.note : "",
    masteryStreak: Math.max(0, Math.min(3, Number(row.mastery_streak ?? 0))),
    masteredAt: typeof row.mastered_at === "string" ? row.mastered_at : null,
    lastPracticedAt:
      typeof row.last_practiced_at === "string" ? row.last_practiced_at : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

function missingTable(message: string) {
  return /user_question_learning_state|does not exist|schema cache/i.test(message);
}

function missingMasteryColumns(message: string) {
  return /mastery_streak|mastered_at|last_practiced_at/i.test(message);
}

async function getCurrentUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

async function readRows(questionKeys?: string[]) {
  const { supabase, userId } = await getCurrentUserId();
  if (!userId) return [] as LearningStateRow[];

  const run = async (select: string) => {
    let query = supabase
      .from("user_question_learning_state")
      .select(select)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (questionKeys && questionKeys.length > 0) {
      query = query.in("question_key", questionKeys);
    }
    return query;
  };

  let result = await run(SELECT_V2);
  if (result.error && missingMasteryColumns(result.error.message)) {
    result = await run(SELECT_V1);
  }

  if (result.error) {
    if (missingTable(result.error.message)) return [] as LearningStateRow[];
    throw new Error(`讀取題目學習狀態失敗：${result.error.message}`);
  }

  return (result.data ?? []) as unknown as LearningStateRow[];
}

export async function readQuestionLearningStates(
  questionKeys: string[],
): Promise<Map<string, QuestionLearningState>> {
  const keys = Array.from(new Set(questionKeys.map((key) => key.trim()).filter(Boolean)));
  if (keys.length === 0) return new Map();

  const rows = await readRows(keys);
  return new Map(
    rows.map((row) => {
      const item = mapRow(row);
      return [item.questionKey, item] as const;
    }),
  );
}

export async function readAllQuestionLearningStates(): Promise<QuestionLearningState[]> {
  const rows = await readRows();
  return rows.map(mapRow);
}

export async function readQuestionLearningMemory(): Promise<QuestionLearningMemoryItem[]> {
  const states = await readAllQuestionLearningStates();
  const parsed = states.map((state) => ({ state, source: parseQuestionKey(state.questionKey) }));
  const groups = new Map<string, { year: string; session: string; subject: string }>();

  for (const item of parsed) {
    if (!item.source) continue;
    const key = `${item.source.year}\u0000${item.source.session}\u0000${item.source.subject}`;
    groups.set(key, item.source);
  }

  const questionMaps = new Map<string, Map<number, NationalExamQuestion>>();
  await Promise.all(
    Array.from(groups.entries()).map(async ([groupKey, source]) => {
      try {
        const params = new URLSearchParams({
          year: source.year,
          session: source.session,
          subject: source.subject,
        });
        const response = await fetch(`/api/national-exam?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload?.questions)) return;
        const map = new Map<number, NationalExamQuestion>();
        for (const question of payload.questions as NationalExamQuestion[]) {
          if (typeof question.questionNumber === "number") {
            map.set(question.questionNumber, question);
          }
        }
        questionMaps.set(groupKey, map);
      } catch {
        // Metadata is optional; learning state should still remain visible.
      }
    }),
  );

  return parsed.map(({ state, source }) => {
    if (!source) {
      return {
        ...state,
        year: null,
        session: null,
        subject: null,
        questionNumber: null,
        stem: null,
      };
    }
    const groupKey = `${source.year}\u0000${source.session}\u0000${source.subject}`;
    const question = questionMaps.get(groupKey)?.get(source.questionNumber);
    return {
      ...state,
      year: source.year,
      session: source.session,
      subject: source.subject,
      questionNumber: source.questionNumber,
      stem: question?.stem ?? null,
    };
  });
}

export async function saveQuestionLearningState(input: {
  questionKey: string;
  conceptUnfamiliar: boolean;
  note: string;
  resetMastery?: boolean;
}): Promise<QuestionLearningState> {
  const questionKey = input.questionKey.trim();
  if (!questionKey) throw new Error("缺少 questionKey。");

  const { supabase, userId } = await getCurrentUserId();
  if (!userId) throw new Error("請先登入。");

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    user_id: userId,
    question_key: questionKey,
    concept_unfamiliar: input.conceptUnfamiliar,
    note: input.note,
    updated_at: now,
  };

  if (input.resetMastery) {
    payload.mastery_streak = 0;
    payload.mastered_at = null;
  }

  let result = await supabase
    .from("user_question_learning_state")
    .upsert(payload, { onConflict: "user_id,question_key" })
    .select(SELECT_V2)
    .single();

  if (result.error && missingMasteryColumns(result.error.message)) {
    const legacyPayload = {
      user_id: userId,
      question_key: questionKey,
      concept_unfamiliar: input.conceptUnfamiliar,
      note: input.note,
      updated_at: now,
    };
    result = await supabase
      .from("user_question_learning_state")
      .upsert(legacyPayload, { onConflict: "user_id,question_key" })
      .select(SELECT_V1)
      .single();
  }

  if (result.error) {
    if (missingTable(result.error.message)) {
      throw new Error("題目筆記資料表尚未建立，請先套用 Phase F SQL migration。");
    }
    throw new Error(`儲存題目學習狀態失敗：${result.error.message}`);
  }

  return mapRow(result.data as unknown as LearningStateRow);
}

export function parseQuestionKey(value: string) {
  const parts = value.split(":");
  if (parts.length < 5 || parts[0] !== "national-exam") return null;
  const questionNumber = Number(parts[parts.length - 1]);
  const year = parts[1]?.trim();
  const session = parts[2]?.trim();
  const subject = parts.slice(3, -1).join(":").trim();
  if (!year || !session || !subject || !Number.isFinite(questionNumber)) return null;
  return { year, session, subject, questionNumber };
}
