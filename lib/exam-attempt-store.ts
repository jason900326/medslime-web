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

export type ExamQuestionOutcome = {
  questionId: string;
  questionKey: string;
  questionNumber: number | null;
  userAnswer: number | null;
  correctIndex: number | null;
  answered: boolean;
  correct: boolean | null;
  uncertain: boolean;
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
  questionOutcomes: ExamQuestionOutcome[];
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
  questionOutcomes: ExamQuestionOutcome[];
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
  question_outcomes?: unknown;
};

const ATTEMPT_SELECT_BASE =
  "id,year,session,subject,exam_key,answered_count,correct_count,score,review_count,uncertain_count,duration_seconds,completed_at";
const ATTEMPT_SELECT_WITH_REVIEW = `${ATTEMPT_SELECT_BASE},review_items`;
const ATTEMPT_SELECT = `${ATTEMPT_SELECT_WITH_REVIEW},question_outcomes`;
const PRO_ANALYSIS_STALE_KEY = "medslime_pro_analysis_stale";

function markProAnalysisStale() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PRO_ANALYSIS_STALE_KEY, "1");
  } catch {
    // Cache invalidation is only a UX optimization.
  }
}

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

function normalizeQuestionOutcomes(value: unknown): ExamQuestionOutcome[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Partial<ExamQuestionOutcome>;
      const questionId = typeof raw.questionId === "string" ? raw.questionId.trim() : "";
      const questionKey = typeof raw.questionKey === "string" ? raw.questionKey.trim() : "";
      if (!questionId || !questionKey) return null;

      const userAnswer =
        typeof raw.userAnswer === "number" && Number.isFinite(raw.userAnswer)
          ? raw.userAnswer
          : null;
      const correctIndex =
        typeof raw.correctIndex === "number" && Number.isFinite(raw.correctIndex)
          ? raw.correctIndex
          : null;
      const answered = raw.answered === true;
      const correct =
        typeof raw.correct === "boolean"
          ? raw.correct
          : answered && userAnswer !== null && correctIndex !== null
            ? userAnswer === correctIndex
            : null;

      return {
        questionId,
        questionKey,
        questionNumber:
          typeof raw.questionNumber === "number" && Number.isFinite(raw.questionNumber)
            ? raw.questionNumber
            : null,
        userAnswer,
        correctIndex,
        answered,
        correct,
        uncertain: raw.uncertain === true,
      } satisfies ExamQuestionOutcome;
    })
    .filter((item): item is ExamQuestionOutcome => Boolean(item));
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
    questionOutcomes: normalizeQuestionOutcomes(row.question_outcomes),
  };
}

function missingColumn(message: string, column: string) {
  return message.toLowerCase().includes(column.toLowerCase());
}

async function readAttemptRows(input: {
  userId: string;
  limit?: number;
  id?: string;
}) {
  const supabase = createClient();
  const run = async (select: string) => {
    let query = supabase
      .from("exam_attempts")
      .select(select)
      .eq("user_id", input.userId)
      .order("completed_at", { ascending: false });

    if (input.id) query = query.eq("id", input.id).limit(1);
    else query = query.limit(input.limit ?? 120);
    return query;
  };

  let result = await run(ATTEMPT_SELECT);
  if (result.error && missingColumn(result.error.message, "question_outcomes")) {
    result = await run(ATTEMPT_SELECT_WITH_REVIEW);
  }
  if (result.error && missingColumn(result.error.message, "review_items")) {
    result = await run(ATTEMPT_SELECT_BASE);
  }
  return result;
}

export async function readExamAttempts(limit = 120): Promise<ExamAttempt[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const safeLimit = Math.max(1, Math.min(300, limit));
  const result = await readAttemptRows({ userId: user.id, limit: safeLimit });

  if (result.error) {
    if (result.error.message.includes("exam_attempts")) return [];
    console.error("讀取國考作答紀錄失敗：", result.error);
    throw new Error("作答紀錄讀取失敗，請稍後再試。");
  }

  return ((result.data ?? []) as unknown as AttemptRow[]).map(mapRow);
}

export async function readExamAttempt(id: string): Promise<ExamAttempt | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !id) return null;

  const result = await readAttemptRows({ userId: user.id, id });
  if (result.error) {
    if (result.error.message.includes("exam_attempts")) return null;
    console.error("讀取單次作答紀錄失敗：", result.error);
    throw new Error("作答紀錄讀取失敗，請稍後再試。");
  }

  const row = ((result.data ?? []) as unknown as AttemptRow[])[0];
  return row ? mapRow(row) : null;
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

  let result = await supabase.from("exam_attempts").insert({
    ...baseInsert,
    review_items: input.reviewItems,
    question_outcomes: input.questionOutcomes,
  });

  if (result.error && missingColumn(result.error.message, "question_outcomes")) {
    result = await supabase.from("exam_attempts").insert({
      ...baseInsert,
      review_items: input.reviewItems,
    });
  }

  if (result.error && missingColumn(result.error.message, "review_items")) {
    result = await supabase.from("exam_attempts").insert(baseInsert);
  }

  if (result.error) {
    console.error("儲存國考作答紀錄失敗：", result.error);
    throw new Error("作答紀錄儲存失敗，請稍後再試。");
  }

  markProAnalysisStale();
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
