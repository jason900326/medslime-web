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

export type ExamAttemptQuestionItem = {
  id: string;
  questionKey: string;
  questionNumber: number | null;
  sourceYear: string | null;
  sourceSession: string | null;
  sourceSubject: string | null;
  stem: string;
  options: string[];
  correctIndex: number | null;
  userAnswer: number | null;
  answered: boolean;
  correct: boolean | null;
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
  questionOutcomes: ExamQuestionOutcome[];
  questionItems: ExamAttemptQuestionItem[];
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
  questionItems?: ExamAttemptQuestionItem[];
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
  question_items?: unknown;
};

type SourceQuestionKey = {
  year: string;
  session: string;
  subject: string;
  questionNumber: number;
};

type SourceQuestion = {
  id: string;
  questionNumber: number;
  stem: string;
  options: string[];
  correctIndex: number | null;
  questionPdfUrl: string | null;
};

const ATTEMPT_SELECT_BASE =
  "id,year,session,subject,exam_key,answered_count,correct_count,score,review_count,uncertain_count,duration_seconds,completed_at";
const ATTEMPT_SELECT_WITH_REVIEW = `${ATTEMPT_SELECT_BASE},review_items`;
const ATTEMPT_SELECT_WITH_OUTCOMES = `${ATTEMPT_SELECT_WITH_REVIEW},question_outcomes`;
const ATTEMPT_SELECT = `${ATTEMPT_SELECT_WITH_OUTCOMES},question_items`;
const PRO_ANALYSIS_STALE_KEY = "medslime_pro_analysis_stale";

function markProAnalysisStale() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PRO_ANALYSIS_STALE_KEY, "1");
  } catch {
    // Cache invalidation is only a UX optimization.
  }
}

async function applyMasteryOutcomes(
  supabase: ReturnType<typeof createClient>,
  outcomes: ExamQuestionOutcome[],
) {
  if (outcomes.length === 0) return;
  try {
    const { error } = await supabase.rpc("apply_question_mastery_outcomes", {
      p_outcomes: outcomes,
    });
    if (error && !/apply_question_mastery_outcomes|schema cache|does not exist/i.test(error.message)) {
      console.warn("更新觀念掌握進度失敗：", error);
    }
  } catch (error) {
    console.warn("更新觀念掌握進度失敗：", error);
  }
}

function finiteIndex(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
        questionNumber: finiteIndex(raw.questionNumber),
        stem: raw.stem,
        options: raw.options.filter((option): option is string => typeof option === "string"),
        correctIndex: finiteIndex(raw.correctIndex),
        userAnswer: finiteIndex(raw.userAnswer),
        uncertain: raw.uncertain === true,
        officialPdfUrl:
          typeof raw.officialPdfUrl === "string" ? raw.officialPdfUrl : null,
      } satisfies ExamAttemptReviewItem;
    })
    .filter((item): item is ExamAttemptReviewItem => Boolean(item));
}

function normalizeQuestionOutcomes(value: unknown): ExamQuestionOutcome[] {
  if (!Array.isArray(value)) return [];

  const normalized: ExamQuestionOutcome[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<ExamQuestionOutcome>;
    const questionId = typeof raw.questionId === "string" ? raw.questionId.trim() : "";
    const questionKey = typeof raw.questionKey === "string" ? raw.questionKey.trim() : "";
    if (!questionId || !questionKey) continue;

    const userAnswer = finiteIndex(raw.userAnswer);
    const correctIndex = finiteIndex(raw.correctIndex);
    const answered = raw.answered === true;
    const correct =
      typeof raw.correct === "boolean"
        ? raw.correct
        : answered && userAnswer !== null && correctIndex !== null
          ? userAnswer === correctIndex
          : null;

    normalized.push({
      questionId,
      questionKey,
      questionNumber: finiteIndex(raw.questionNumber),
      userAnswer,
      correctIndex,
      answered,
      correct,
      uncertain: raw.uncertain === true,
    });
  }
  return normalized;
}

function normalizeQuestionItems(value: unknown): ExamAttemptQuestionItem[] {
  if (!Array.isArray(value)) return [];

  const normalized: ExamAttemptQuestionItem[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<ExamAttemptQuestionItem>;
    const questionKey = typeof raw.questionKey === "string" ? raw.questionKey.trim() : "";
    if (!questionKey || typeof raw.stem !== "string" || !Array.isArray(raw.options)) continue;

    const userAnswer = finiteIndex(raw.userAnswer);
    const correctIndex = finiteIndex(raw.correctIndex);
    const answered = raw.answered === true || userAnswer !== null;
    const correct =
      typeof raw.correct === "boolean"
        ? raw.correct
        : answered && userAnswer !== null && correctIndex !== null
          ? userAnswer === correctIndex
          : null;

    normalized.push({
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `question-${index}`,
      questionKey,
      questionNumber: finiteIndex(raw.questionNumber),
      sourceYear: typeof raw.sourceYear === "string" ? raw.sourceYear : null,
      sourceSession: typeof raw.sourceSession === "string" ? raw.sourceSession : null,
      sourceSubject: typeof raw.sourceSubject === "string" ? raw.sourceSubject : null,
      stem: raw.stem,
      options: raw.options.filter((option): option is string => typeof option === "string"),
      correctIndex,
      userAnswer,
      answered,
      correct,
      uncertain: raw.uncertain === true,
      officialPdfUrl:
        typeof raw.officialPdfUrl === "string" ? raw.officialPdfUrl : null,
    });
  }
  return normalized;
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
    questionItems: normalizeQuestionItems(row.question_items),
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
  if (result.error && missingColumn(result.error.message, "question_items")) {
    result = await run(ATTEMPT_SELECT_WITH_OUTCOMES);
  }
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
  if (!row) return null;
  const attempt = mapRow(row);
  if (attempt.questionItems.length > 0 || attempt.questionOutcomes.length === 0) {
    return attempt;
  }

  try {
    const reconstructed = await reconstructQuestionItems(attempt.questionOutcomes);
    if (reconstructed.length > 0) {
      return { ...attempt, questionItems: reconstructed };
    }
  } catch (error) {
    console.warn("還原完整作答題目失敗，改用舊版複習快照：", error);
  }
  return attempt;
}

export async function saveNationalExamAttempt(
  input: SaveExamAttemptInput,
): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

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

  const insertWithId = (payload: Record<string, unknown>) =>
    supabase.from("exam_attempts").insert(payload).select("id").single();

  let result = await insertWithId({
    ...baseInsert,
    review_items: input.reviewItems,
    question_outcomes: input.questionOutcomes,
    question_items: input.questionItems ?? [],
  });

  if (result.error && missingColumn(result.error.message, "question_items")) {
    result = await insertWithId({
      ...baseInsert,
      review_items: input.reviewItems,
      question_outcomes: input.questionOutcomes,
    });
  }

  if (result.error && missingColumn(result.error.message, "question_outcomes")) {
    result = await insertWithId({
      ...baseInsert,
      review_items: input.reviewItems,
    });
  }

  if (result.error && missingColumn(result.error.message, "review_items")) {
    result = await insertWithId(baseInsert);
  }

  if (result.error) {
    console.error("儲存國考作答紀錄失敗：", result.error);
    throw new Error("作答紀錄儲存失敗，請稍後再試。");
  }

  await applyMasteryOutcomes(supabase, input.questionOutcomes);
  markProAnalysisStale();
  const row = result.data as { id?: string } | null;
  return typeof row?.id === "string" ? row.id : null;
}

async function reconstructQuestionItems(
  outcomes: ExamQuestionOutcome[],
): Promise<ExamAttemptQuestionItem[]> {
  const parsed: Array<{ outcome: ExamQuestionOutcome; source: SourceQuestionKey }> = [];
  for (const outcome of outcomes) {
    const source = parseSourceQuestionKey(outcome.questionKey);
    if (source) parsed.push({ outcome, source });
  }
  if (parsed.length === 0) return [];

  const groups = new Map<string, SourceQuestionKey>();
  for (const item of parsed) {
    groups.set(sourceGroupKey(item.source), item.source);
  }

  const questionMaps = new Map<string, Map<number, SourceQuestion>>();
  for (const [groupKey, source] of groups) {
    const params = new URLSearchParams({
      year: source.year,
      session: source.session,
      subject: source.subject,
    });
    const response = await fetch(`/api/national-exam?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) continue;
    const payload = (await response.json()) as { questions?: SourceQuestion[] };
    if (!Array.isArray(payload.questions)) continue;
    const map = new Map<number, SourceQuestion>();
    for (const question of payload.questions) {
      map.set(question.questionNumber, question);
    }
    questionMaps.set(groupKey, map);
  }

  const result: ExamAttemptQuestionItem[] = [];
  for (const { outcome, source } of parsed) {
    const question = questionMaps.get(sourceGroupKey(source))?.get(source.questionNumber);
    if (!question) continue;
    result.push({
      id: outcome.questionId || question.id,
      questionKey: outcome.questionKey,
      questionNumber: source.questionNumber,
      sourceYear: source.year,
      sourceSession: source.session,
      sourceSubject: source.subject,
      stem: question.stem,
      options: question.options,
      correctIndex: question.correctIndex ?? outcome.correctIndex,
      userAnswer: outcome.userAnswer,
      answered: outcome.answered,
      correct: outcome.correct,
      uncertain: outcome.uncertain,
      officialPdfUrl: question.questionPdfUrl,
    });
  }
  return result;
}

function parseSourceQuestionKey(value: string): SourceQuestionKey | null {
  const parts = value.split(":");
  if (parts.length < 5 || parts[0] !== "national-exam") return null;
  const year = parts[1]?.trim() ?? "";
  const session = parts[2]?.trim() ?? "";
  const subject = parts.slice(3, -1).join(":").trim();
  const questionNumber = Number(parts[parts.length - 1]);
  if (!year || !session || !subject || !Number.isFinite(questionNumber)) return null;
  return { year, session, subject, questionNumber };
}

function sourceGroupKey(source: SourceQuestionKey) {
  return `${source.year}\u0000${source.session}\u0000${source.subject}`;
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
