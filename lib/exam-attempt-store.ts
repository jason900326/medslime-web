"use client";

import { createClient } from "@/lib/supabase/client";

export type ExamAttemptReviewItem = {
  id: string;
  questionNumber: number | null;
  stem: string;
  options: string[];
  correctIndex: number | null;
  userAnswer: number | null;
  uncertain: boolean;
  officialPdfUrl: string | null;
};

export type ExamAttempt = {
  id: string;
  year: string;
  session: string;
  subject: string;
  examKey: string;
  answeredCount: number;
  correctCount: number;
  score: number;
  reviewCount: number;
  uncertainCount: number;
  durationSeconds: number;
  completedAt: string;
  reviewItems: ExamAttemptReviewItem[];
};

export type SaveExamAttemptInput = {
  year: string;
  session: string;
  subject: string;
  answeredCount: number;
  correctCount: number;
  score: number;
  reviewCount: number;
  uncertainCount: number;
  durationSeconds: number;
  reviewItems: ExamAttemptReviewItem[];
};

type AttemptRow = {
  id: string;
  year: string;
  session: string;
  subject: string;
  exam_key: string;
  answered_count: number;
  correct_count: number;
  score: number | string;
  review_count: number;
  uncertain_count: number;
  duration_seconds: number;
  completed_at: string;
  review_items?: unknown;
};

const ATTEMPT_SELECT_BASE =
  "id,year,session,subject,exam_key,answered_count,correct_count,score,review_count,uncertain_count,duration_seconds,completed_at";
const ATTEMPT_SELECT = `${ATTEMPT_SELECT_BASE},review_items`;

function normalizeReviewItems(value: unknown): ExamAttemptReviewItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Partial<ExamAttemptReviewItem>;
      if (typeof raw.stem !== "string" || !Array.isArray(raw.options)) return null;

      return {
        id: typeof raw.id === "string" ? raw.id : `review-${index}`,
        questionNumber:
          typeof raw.questionNumber === "number" && Number.isFinite(raw.questionNumber)
            ? raw.questionNumber
            : null,
        stem: raw.stem,
        options: raw.options.filter((option): option is string => typeof option === "string"),
        correctIndex:
          typeof raw.correctIndex === "number" && Number.isFinite(raw.correctIndex)
            ? raw.correctIndex
            : null,
        userAnswer:
          typeof raw.userAnswer === "number" && Number.isFinite(raw.userAnswer)
            ? raw.userAnswer
            : null,
        uncertain: raw.uncertain === true,
        officialPdfUrl:
          typeof raw.officialPdfUrl === "string" ? raw.officialPdfUrl : null,
      } satisfies ExamAttemptReviewItem;
    })
    .filter((item): item is ExamAttemptReviewItem => Boolean(item));
}

function mapRow(row: AttemptRow): ExamAttempt {
  return {
    id: row.id,
    year: row.year,
    session: row.session,
    subject: row.subject,
    examKey: row.exam_key,
    answeredCount: Math.max(0, Number(row.answered_count ?? 0)),
    correctCount: Math.max(0, Number(row.correct_count ?? 0)),
    score: Number(row.score ?? 0),
    reviewCount: Math.max(0, Number(row.review_count ?? 0)),
    uncertainCount: Math.max(0, Number(row.uncertain_count ?? 0)),
    durationSeconds: Math.max(0, Number(row.duration_seconds ?? 0)),
    completedAt: row.completed_at,
    reviewItems: normalizeReviewItems(row.review_items),
  };
}

function missingReviewItemsColumn(message: string) {
  return message.toLowerCase().includes("review_items");
}

export async function readExamAttempts(limit = 120): Promise<ExamAttempt[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const safeLimit = Math.max(1, Math.min(300, limit));
  const result = await supabase
    .from("exam_attempts")
    .select(ATTEMPT_SELECT)
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(safeLimit);

  if (result.error && missingReviewItemsColumn(result.error.message)) {
    const legacyResult = await supabase
      .from("exam_attempts")
      .select(ATTEMPT_SELECT_BASE)
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(safeLimit);

    if (legacyResult.error) {
      if (legacyResult.error.message.includes("exam_attempts")) return [];
      console.error("讀取國考作答紀錄失敗：", legacyResult.error);
      throw new Error("作答紀錄讀取失敗，請稍後再試。");
    }

    return ((legacyResult.data ?? []) as AttemptRow[]).map(mapRow);
  }

  if (result.error) {
    if (result.error.message.includes("exam_attempts")) return [];
    console.error("讀取國考作答紀錄失敗：", result.error);
    throw new Error("作答紀錄讀取失敗，請稍後再試。");
  }

  return ((result.data ?? []) as AttemptRow[]).map(mapRow);
}

export async function readExamAttempt(id: string): Promise<ExamAttempt | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !id) return null;

  const result = await supabase
    .from("exam_attempts")
    .select(ATTEMPT_SELECT)
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (result.error && missingReviewItemsColumn(result.error.message)) {
    const legacyResult = await supabase
      .from("exam_attempts")
      .select(ATTEMPT_SELECT_BASE)
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();

    if (legacyResult.error) {
      if (legacyResult.error.message.includes("exam_attempts")) return null;
      console.error("讀取單次作答紀錄失敗：", legacyResult.error);
      throw new Error("作答紀錄讀取失敗，請稍後再試。");
    }

    return legacyResult.data ? mapRow(legacyResult.data as AttemptRow) : null;
  }

  if (result.error) {
    if (result.error.message.includes("exam_attempts")) return null;
    console.error("讀取單次作答紀錄失敗：", result.error);
    throw new Error("作答紀錄讀取失敗，請稍後再試。");
  }

  return result.data ? mapRow(result.data as AttemptRow) : null;
}

export async function saveNationalExamAttempt(
  input: SaveExamAttemptInput,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const examKey = `${input.year}-${input.session}-${input.subject}`;
  const baseInsert = {
    user_id: user.id,
    year: input.year,
    session: input.session,
    subject: input.subject,
    exam_key: examKey,
    answered_count: Math.max(0, Math.floor(input.answeredCount)),
    correct_count: Math.max(0, Math.floor(input.correctCount)),
    score: Math.max(0, Number(input.score)),
    review_count: Math.max(0, Math.floor(input.reviewCount)),
    uncertain_count: Math.max(0, Math.floor(input.uncertainCount)),
    duration_seconds: Math.max(0, Math.floor(input.durationSeconds)),
    completed_at: new Date().toISOString(),
  };

  const result = await supabase.from("exam_attempts").insert({
    ...baseInsert,
    review_items: input.reviewItems,
  });

  if (result.error && missingReviewItemsColumn(result.error.message)) {
    const legacyResult = await supabase.from("exam_attempts").insert(baseInsert);
    if (legacyResult.error) {
      console.error("儲存國考作答紀錄失敗：", legacyResult.error);
      throw new Error("作答紀錄儲存失敗，請稍後再試。");
    }
    return;
  }

  if (result.error) {
    console.error("儲存國考作答紀錄失敗：", result.error);
    throw new Error("作答紀錄儲存失敗，請稍後再試。");
  }
}

export function latestAttemptMap(attempts: ExamAttempt[]) {
  const map = new Map<string, ExamAttempt>();
  for (const attempt of attempts) {
    if (!map.has(attempt.examKey)) map.set(attempt.examKey, attempt);
  }
  return map;
}

export function formatAttemptDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatAttemptDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  if (minutes < 60) return `${minutes}:${String(seconds).padStart(2, "0")}`;
  const hours = Math.floor(minutes / 60);
  return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
