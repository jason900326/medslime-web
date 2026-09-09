"use client";

import { createClient } from "@/lib/supabase/client";

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
};

type ReviewLike = {
  correctIndex: number | null;
  userAnswer: number | null;
  uncertain: boolean;
};

const EXAM_STARTED_AT_KEY = "medslime_exam_started_at";
const CAPTURE_LOCK_KEY = "medslime_exam_attempt_capture";

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
  };
}

export async function readExamAttempts(limit = 120): Promise<ExamAttempt[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("exam_attempts")
    .select(
      "id,year,session,subject,exam_key,answered_count,correct_count,score,review_count,uncertain_count,duration_seconds,completed_at",
    )
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(Math.max(1, Math.min(300, limit)));

  if (error) {
    // Migration may not have been run yet. Do not break the study flow.
    if (error.message.includes("exam_attempts")) return [];
    console.error("讀取國考作答紀錄失敗：", error);
    throw new Error("作答紀錄讀取失敗，請稍後再試。");
  }

  return ((data ?? []) as AttemptRow[]).map(mapRow);
}

function getExamIdentityFromLocation() {
  if (typeof window === "undefined") return null;
  if (!window.location.pathname.includes("/study/exam/quiz")) return null;

  const params = new URLSearchParams(window.location.search);
  const year = params.get("year")?.trim() ?? "";
  const session = params.get("session")?.trim() ?? "";
  const subject = params.get("subject")?.trim() ?? "";
  if (!year || !session || !subject) return null;

  return {
    year,
    session,
    subject,
    examKey: `${year}-${session}-${subject}`,
  };
}

function getDurationSeconds() {
  if (typeof window === "undefined") return 0;
  const startedAt = Number(window.sessionStorage.getItem(EXAM_STARTED_AT_KEY));
  if (!Number.isFinite(startedAt) || startedAt <= 0) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

/**
 * The current quiz page already calls upsertMistakes() immediately before it
 * records the number of answered questions in player_account_state. To avoid a
 * risky large quiz-page rewrite during the 2.0 migration, capture the baseline
 * counter here and poll briefly for that existing counter update. Once it
 * changes, we can persist an accurate attempt summary (score included).
 *
 * This is intentionally isolated in one module so the quiz can later move to a
 * direct saveExamAttempt() call without changing the database/UI contract.
 */
export function scheduleNationalExamAttemptCapture(records: ReviewLike[]) {
  if (typeof window === "undefined") return;
  const identity = getExamIdentityFromLocation();
  if (!identity) return;

  const captureKey = `${identity.examKey}:${Date.now()}`;
  window.sessionStorage.setItem(CAPTURE_LOCK_KEY, captureKey);

  const wrongCount = records.filter(
    (item) =>
      item.correctIndex !== null &&
      item.userAnswer !== null &&
      item.userAnswer !== item.correctIndex,
  ).length;
  const reviewCount = records.length;
  const uncertainCount = records.filter((item) => item.uncertain).length;
  const durationSeconds = getDurationSeconds();

  void (async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: beforeRow } = await supabase
      .from("player_account_state")
      .select("state")
      .eq("user_id", user.id)
      .maybeSingle();

    const beforeState = (beforeRow?.state ?? {}) as { totalQuestionsAnswered?: unknown };
    const baseline = Math.max(0, Number(beforeState.totalQuestionsAnswered ?? 0));
    const waits = [450, 900, 1600, 2800, 4500];

    let answeredCount = 0;
    for (const wait of waits) {
      await new Promise((resolve) => window.setTimeout(resolve, wait));
      if (window.sessionStorage.getItem(CAPTURE_LOCK_KEY) !== captureKey) return;

      const { data: afterRow } = await supabase
        .from("player_account_state")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();
      const afterState = (afterRow?.state ?? {}) as { totalQuestionsAnswered?: unknown };
      const current = Math.max(0, Number(afterState.totalQuestionsAnswered ?? baseline));
      answeredCount = Math.max(0, current - baseline);
      if (answeredCount > 0) break;
    }

    const correctCount = Math.max(0, answeredCount - wrongCount);
    const score = Math.round(correctCount * 1.25 * 100) / 100;

    const { error } = await supabase.from("exam_attempts").insert({
      user_id: user.id,
      year: identity.year,
      session: identity.session,
      subject: identity.subject,
      exam_key: identity.examKey,
      answered_count: answeredCount,
      correct_count: correctCount,
      score,
      review_count: reviewCount,
      uncertain_count: uncertainCount,
      duration_seconds: durationSeconds,
      completed_at: new Date().toISOString(),
    });

    if (error && !error.message.includes("exam_attempts")) {
      console.error("儲存國考作答紀錄失敗：", error);
    }

    if (window.sessionStorage.getItem(CAPTURE_LOCK_KEY) === captureKey) {
      window.sessionStorage.removeItem(CAPTURE_LOCK_KEY);
    }
  })();
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
