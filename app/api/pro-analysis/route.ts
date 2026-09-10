import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ReviewItem = {
  id: string;
  questionNumber: number | null;
  stem: string;
};

type QuestionOutcome = {
  questionId: string;
  questionKey: string;
  questionNumber: number | null;
  answered: boolean;
  correct: boolean | null;
  uncertain: boolean;
};

type Attempt = {
  id: string;
  subject: string;
  examKey: string;
  score: number;
  completedAt: string;
  reviewItems: ReviewItem[];
  questionOutcomes: QuestionOutcome[];
};

type Mistake = {
  id: string;
  subject: string;
  questionNumber: number | null;
  stem: string;
  uncertain: boolean;
  reviewed: boolean;
};

type SubjectStat = {
  subject: string;
  attempts: number;
  average: number;
  latest: number;
  delta: number | null;
};

type TaxonomyQuestion = {
  id: string;
  topic: string;
  subtopic: string;
  taxonomyStatus: string;
};

type TaxonomyObservation = {
  attemptId: string;
  completedAt: string;
  subject: string;
  topic: string;
  subtopic: string;
  correct: boolean;
  uncertain: boolean;
};

type TaxonomyStat = {
  key: string;
  subject: string;
  topic: string;
  subtopic: string | null;
  attempts: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
  uncertainCount: number;
  uncertainRate: number;
  latestAccuracy: number | null;
  delta: number | null;
  priorityScore: number;
};

type RepeatWeakness = {
  key: string;
  subject: string;
  questionNumber: number | null;
  stem: string;
  count: number;
};

type ReviewPriority = {
  id: string;
  subject: string;
  questionNumber: number | null;
  stem: string;
  reason: string;
  score: number;
  topic: string | null;
  subtopic: string | null;
};

type QuestionTaxonomyRef = {
  subject: string;
  topic: string;
  subtopic: string;
};

type AttemptRow = {
  id: unknown;
  subject: unknown;
  exam_key: unknown;
  score: unknown;
  completed_at: unknown;
  review_items?: unknown;
  question_outcomes?: unknown;
};

const MAX_TOPIC_ANALYTICS_ATTEMPTS = 24;
const TAXONOMY_LOOKUP_CHUNK_SIZE = 200;

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number) {
  return Number(value.toFixed(1));
}

function missingColumn(message: string, column: string) {
  return message.toLowerCase().includes(column.toLowerCase());
}

function normalizeReviewItems(value: unknown): ReviewItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      const stem = typeof raw.stem === "string" ? raw.stem : "";
      if (!stem) return null;

      return {
        id: typeof raw.id === "string" ? raw.id : `review-${index}`,
        questionNumber:
          typeof raw.questionNumber === "number" && Number.isFinite(raw.questionNumber)
            ? raw.questionNumber
            : null,
        stem,
      } satisfies ReviewItem;
    })
    .filter((item): item is ReviewItem => Boolean(item));
}

function normalizeQuestionOutcomes(value: unknown): QuestionOutcome[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      const questionId = typeof raw.questionId === "string" ? raw.questionId.trim() : "";
      const questionKey = typeof raw.questionKey === "string" ? raw.questionKey.trim() : "";
      if (!questionId || !questionKey) return null;

      const answered = raw.answered === true;
      const correct = typeof raw.correct === "boolean" ? raw.correct : null;

      return {
        questionId,
        questionKey,
        questionNumber:
          typeof raw.questionNumber === "number" && Number.isFinite(raw.questionNumber)
            ? raw.questionNumber
            : null,
        answered,
        correct,
        uncertain: raw.uncertain === true,
      } satisfies QuestionOutcome;
    })
    .filter((item): item is QuestionOutcome => Boolean(item));
}

function normalizeMistake(value: unknown, fallbackId: string): Mistake | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const stem = typeof raw.stem === "string" ? raw.stem : "";
  if (!stem) return null;

  return {
    id: typeof raw.id === "string" ? raw.id : fallbackId,
    subject:
      typeof raw.subject === "string" && raw.subject.trim()
        ? raw.subject.trim()
        : "未分類",
    questionNumber:
      typeof raw.questionNumber === "number" && Number.isFinite(raw.questionNumber)
        ? raw.questionNumber
        : null,
    stem,
    uncertain: raw.uncertain === true,
    reviewed: raw.reviewed === true,
  };
}

function buildSubjectStats(attempts: Attempt[]): SubjectStat[] {
  const groups = new Map<string, Attempt[]>();

  for (const attempt of attempts) {
    const list = groups.get(attempt.subject) ?? [];
    list.push(attempt);
    groups.set(attempt.subject, list);
  }

  return Array.from(groups.entries())
    .map(([subject, list]) => {
      const latest = list[0];
      const previous = list[1] ?? null;
      return {
        subject,
        attempts: list.length,
        average: average(list.map((item) => item.score)),
        latest: latest.score,
        delta: previous ? latest.score - previous.score : null,
      };
    })
    .sort((a, b) => a.average - b.average);
}

function buildRepeatWeaknesses(attempts: Attempt[]): RepeatWeakness[] {
  const map = new Map<string, RepeatWeakness>();

  for (const attempt of attempts) {
    for (const item of attempt.reviewItems) {
      const key = item.id || `${attempt.examKey}:${item.questionNumber ?? "unknown"}`;
      const current = map.get(key);
      if (current) {
        current.count += 1;
      } else {
        map.set(key, {
          key,
          subject: attempt.subject,
          questionNumber: item.questionNumber,
          stem: item.stem,
          count: 1,
        });
      }
    }
  }

  return [...map.values()]
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count || a.subject.localeCompare(b.subject));
}

function buildReviewPriorities(
  mistakes: Mistake[],
  weakestSubject: string | null,
  weakestTopic: TaxonomyStat | null,
  taxonomyByQuestionKey: Map<string, QuestionTaxonomyRef>,
): ReviewPriority[] {
  return mistakes
    .filter((item) => !item.reviewed)
    .map((item) => {
      let score = 0;
      const reasons: string[] = [];
      const taxonomy = taxonomyByQuestionKey.get(item.id) ?? null;

      if (
        weakestTopic &&
        taxonomy &&
        taxonomy.subject === weakestTopic.subject &&
        taxonomy.topic === weakestTopic.topic
      ) {
        score += 4;
        reasons.push(`弱主題：${weakestTopic.topic}`);
      } else if (weakestSubject && item.subject === weakestSubject) {
        score += 3;
        reasons.push("目前弱科");
      }
      if (item.uncertain) {
        score += 2;
        reasons.push("曾標記不確定");
      }
      score += 1;
      reasons.push("尚未複習");

      return {
        id: item.id,
        subject: item.subject,
        questionNumber: item.questionNumber,
        stem: item.stem,
        reason: reasons.join(" · "),
        score,
        topic: taxonomy?.topic ?? null,
        subtopic: taxonomy?.subtopic ?? null,
      };
    })
    .sort((a, b) => b.score - a.score || a.subject.localeCompare(b.subject));
}

function mostCommon(values: string[]) {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function readAttempts(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const run = (select: string) =>
    admin
      .from("exam_attempts")
      .select(select)
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(120);

  let topicAnalyticsAvailable = true;
  let result = await run(
    "id,subject,exam_key,score,completed_at,review_items,question_outcomes",
  );

  if (result.error && missingColumn(result.error.message, "question_outcomes")) {
    topicAnalyticsAvailable = false;
    result = await run("id,subject,exam_key,score,completed_at,review_items");
  }

  if (result.error && missingColumn(result.error.message, "review_items")) {
    topicAnalyticsAvailable = false;
    result = await run("id,subject,exam_key,score,completed_at");
  }

  if (result.error) {
    throw new Error(`Pro 作答資料讀取失敗：${result.error.message}`);
  }

  const attempts: Attempt[] = ((result.data ?? []) as unknown as AttemptRow[]).map((row) => ({
    id: String(row.id ?? ""),
    subject: String(row.subject ?? "未分類"),
    examKey: String(row.exam_key ?? ""),
    score: Number(row.score ?? 0),
    completedAt: String(row.completed_at ?? ""),
    reviewItems: normalizeReviewItems(row.review_items),
    questionOutcomes: normalizeQuestionOutcomes(row.question_outcomes),
  }));

  return { attempts, topicAnalyticsAvailable };
}

async function loadTaxonomyQuestions(
  admin: ReturnType<typeof createAdminClient>,
  questionIds: string[],
) {
  const map = new Map<string, TaxonomyQuestion>();
  const uniqueIds = [...new Set(questionIds.filter(Boolean))];

  for (const chunk of chunkValues(uniqueIds, TAXONOMY_LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await admin
      .from("national_exam_questions")
      .select("id,topic,subtopic,taxonomy_status")
      .in("id", chunk);

    if (error) {
      throw new Error(`題目主題資料讀取失敗：${error.message}`);
    }

    for (const row of data ?? []) {
      const id = String(row.id ?? "");
      if (!id) continue;
      map.set(id, {
        id,
        topic: String(row.topic ?? "").trim(),
        subtopic: String(row.subtopic ?? "").trim(),
        taxonomyStatus: String(row.taxonomy_status ?? ""),
      });
    }
  }

  return map;
}

function buildTaxonomyStats(
  observations: TaxonomyObservation[],
  level: "topic" | "subtopic",
): TaxonomyStat[] {
  type Group = {
    key: string;
    subject: string;
    topic: string;
    subtopic: string | null;
    answeredCount: number;
    correctCount: number;
    uncertainCount: number;
    attempts: Map<
      string,
      { completedAt: string; answeredCount: number; correctCount: number }
    >;
  };

  const groups = new Map<string, Group>();

  for (const item of observations) {
    if (level === "subtopic" && (!item.subtopic || item.subtopic === "其他")) continue;

    const key =
      level === "topic"
        ? `${item.subject}::${item.topic}`
        : `${item.subject}::${item.topic}::${item.subtopic}`;
    const current = groups.get(key) ?? {
      key,
      subject: item.subject,
      topic: item.topic,
      subtopic: level === "subtopic" ? item.subtopic : null,
      answeredCount: 0,
      correctCount: 0,
      uncertainCount: 0,
      attempts: new Map(),
    };

    current.answeredCount += 1;
    if (item.correct) current.correctCount += 1;
    if (item.uncertain) current.uncertainCount += 1;

    const bucket = current.attempts.get(item.attemptId) ?? {
      completedAt: item.completedAt,
      answeredCount: 0,
      correctCount: 0,
    };
    bucket.answeredCount += 1;
    if (item.correct) bucket.correctCount += 1;
    current.attempts.set(item.attemptId, bucket);
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((group) => {
      const accuracy = group.answeredCount
        ? (group.correctCount / group.answeredCount) * 100
        : 0;
      const uncertainRate = group.answeredCount
        ? (group.uncertainCount / group.answeredCount) * 100
        : 0;
      const attempts = [...group.attempts.values()].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
      const latest = attempts[0] ?? null;
      const previous = attempts[1] ?? null;
      const latestAccuracy = latest?.answeredCount
        ? (latest.correctCount / latest.answeredCount) * 100
        : null;
      const previousAccuracy = previous?.answeredCount
        ? (previous.correctCount / previous.answeredCount) * 100
        : null;
      const evidenceWeight = Math.min(1, group.answeredCount / 8);
      const priorityScore =
        (100 - accuracy) * evidenceWeight + uncertainRate * 0.2;

      return {
        key: group.key,
        subject: group.subject,
        topic: group.topic,
        subtopic: group.subtopic,
        attempts: group.attempts.size,
        answeredCount: group.answeredCount,
        correctCount: group.correctCount,
        accuracy: round1(accuracy),
        uncertainCount: group.uncertainCount,
        uncertainRate: round1(uncertainRate),
        latestAccuracy: latestAccuracy === null ? null : round1(latestAccuracy),
        delta:
          latestAccuracy === null || previousAccuracy === null
            ? null
            : round1(latestAccuracy - previousAccuracy),
        priorityScore: round1(priorityScore),
      } satisfies TaxonomyStat;
    })
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        b.answeredCount - a.answeredCount ||
        a.topic.localeCompare(b.topic),
    );
}

function buildRecommendation(
  weakest: SubjectStat | null,
  weakestTopic: TaxonomyStat | null,
  weakestSubtopic: TaxonomyStat | null,
  pendingCount: number,
  mistakeSubject: string | null,
  trendDelta: number | null,
) {
  if (!weakest && !weakestTopic) {
    return "先累積 2–3 份作答紀錄，MedSlime 才能開始比較你的科目與主題趨勢。";
  }

  const parts: string[] = [];

  if (weakestTopic) {
    parts.push(
      `目前最需要補的是「${weakestTopic.topic}」，${weakestTopic.answeredCount} 題作答正確率 ${weakestTopic.accuracy.toFixed(1)}%。`,
    );
    if (
      weakestSubtopic &&
      weakestSubtopic.subject === weakestTopic.subject &&
      weakestSubtopic.topic === weakestTopic.topic
    ) {
      parts.push(
        `細分弱點以「${weakestSubtopic.subtopic}」最明顯（${weakestSubtopic.accuracy.toFixed(1)}%）。`,
      );
    }
  } else if (weakest) {
    parts.push(`目前優先補強「${weakest.subject}」，平均 ${weakest.average.toFixed(1)} 分。`);
  }

  if (pendingCount > 0) {
    parts.push(`先處理 ${pendingCount} 題尚未完成的錯題複習。`);
  }

  if (mistakeSubject && weakest && mistakeSubject !== weakest.subject) {
    parts.push(`錯題目前也集中在「${mistakeSubject}」，可以列為第二順位。`);
  }

  if (trendDelta !== null) {
    parts.push(
      trendDelta >= 0
        ? "近期整體成績正在上升，維持目前複習節奏。"
        : "近期整體成績下滑，先減少新題量，把未複習錯題清掉。",
    );
  }

  return parts.join(" ");
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入。" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: entitlement, error: entitlementError } = await admin
      .from("player_entitlements")
      .select("pro_expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (entitlementError) {
      throw new Error(`Pro 權限讀取失敗：${entitlementError.message}`);
    }

    const proExpiresAt = entitlement?.pro_expires_at ?? null;
    const isPro = Boolean(
      proExpiresAt && new Date(proExpiresAt).getTime() > Date.now(),
    );

    if (!isPro) {
      return NextResponse.json(
        { error: "此功能需要有效的 MedSlime Pro。", code: "PRO_REQUIRED" },
        { status: 403 },
      );
    }

    const [{ attempts, topicAnalyticsAvailable: outcomesColumnAvailable }, mistakeResult] =
      await Promise.all([
        readAttempts(admin, user.id),
        admin
          .from("player_mistakes")
          .select("mistake_id,record")
          .eq("user_id", user.id),
      ]);

    if (mistakeResult.error) {
      throw new Error(`Pro 錯題資料讀取失敗：${mistakeResult.error.message}`);
    }

    const mistakes: Mistake[] = (mistakeResult.data ?? [])
      .map((row) => normalizeMistake(row.record, String(row.mistake_id ?? "")))
      .filter((item): item is Mistake => Boolean(item));

    const analyticsAttempts = attempts
      .filter((attempt) => attempt.questionOutcomes.length > 0)
      .slice(0, MAX_TOPIC_ANALYTICS_ATTEMPTS);
    const questionIds = analyticsAttempts.flatMap((attempt) =>
      attempt.questionOutcomes.map((outcome) => outcome.questionId),
    );

    let taxonomyByQuestionId = new Map<string, TaxonomyQuestion>();
    let topicAnalyticsAvailable = outcomesColumnAvailable;
    let topicAnalyticsMessage: string | null = null;

    if (!outcomesColumnAvailable) {
      topicAnalyticsMessage =
        "主題分析資料欄位尚未啟用；科目趨勢仍可正常使用。";
    } else if (questionIds.length > 0) {
      try {
        taxonomyByQuestionId = await loadTaxonomyQuestions(admin, questionIds);
      } catch (error) {
        topicAnalyticsAvailable = false;
        topicAnalyticsMessage =
          error instanceof Error ? error.message : "題目主題資料讀取失敗。";
      }
    }

    const observations: TaxonomyObservation[] = [];
    const taxonomyByQuestionKey = new Map<string, QuestionTaxonomyRef>();
    let capturedOutcomeCount = 0;
    let answeredOutcomeCount = 0;

    for (const attempt of analyticsAttempts) {
      capturedOutcomeCount += attempt.questionOutcomes.length;
      for (const outcome of attempt.questionOutcomes) {
        if (outcome.answered && outcome.correct !== null) answeredOutcomeCount += 1;

        const taxonomy = taxonomyByQuestionId.get(outcome.questionId);
        if (
          !taxonomy ||
          taxonomy.taxonomyStatus !== "classified" ||
          !taxonomy.topic ||
          !outcome.answered ||
          outcome.correct === null
        ) {
          continue;
        }

        observations.push({
          attemptId: attempt.id,
          completedAt: attempt.completedAt,
          subject: attempt.subject,
          topic: taxonomy.topic,
          subtopic: taxonomy.subtopic,
          correct: outcome.correct,
          uncertain: outcome.uncertain,
        });
        taxonomyByQuestionKey.set(outcome.questionKey, {
          subject: attempt.subject,
          topic: taxonomy.topic,
          subtopic: taxonomy.subtopic,
        });
      }
    }

    if (
      topicAnalyticsAvailable &&
      analyticsAttempts.length > 0 &&
      observations.length === 0
    ) {
      topicAnalyticsMessage =
        "這些作答紀錄尚未有可用的已分類題目；完成新版測驗後會開始累積主題分析。";
    }

    const topicStats = buildTaxonomyStats(observations, "topic");
    const subtopicStats = buildTaxonomyStats(observations, "subtopic");
    const weakestTopic = topicStats.find((item) => item.answeredCount >= 3) ?? null;
    const weakestSubtopic =
      subtopicStats.find((item) => item.answeredCount >= 3) ?? null;

    const subjectStats = buildSubjectStats(attempts);
    const weakest = subjectStats[0] ?? null;
    const recentAverage = average(attempts.slice(0, 5).map((item) => item.score));
    const previousAverage = average(attempts.slice(5, 10).map((item) => item.score));
    const trendDelta = attempts.length >= 6 ? recentAverage - previousAverage : null;
    const latest = attempts[0] ?? null;
    const previous = attempts[1] ?? null;
    const overallDelta = latest && previous ? latest.score - previous.score : null;
    const pendingMistakes = mistakes.filter((item) => !item.reviewed);
    const topMistakeSubject = mostCommon(pendingMistakes.map((item) => item.subject));
    const repeatWeaknesses = buildRepeatWeaknesses(attempts).slice(0, 3);
    const reviewPriorities = buildReviewPriorities(
      pendingMistakes,
      weakest?.subject ?? null,
      weakestTopic,
      taxonomyByQuestionKey,
    ).slice(0, 5);

    return NextResponse.json({
      proExpiresAt,
      attemptCount: attempts.length,
      recentAverage,
      overallDelta,
      trendDelta,
      weakest,
      recommendation: buildRecommendation(
        weakest,
        weakestTopic,
        weakestSubtopic,
        pendingMistakes.length,
        topMistakeSubject,
        trendDelta,
      ),
      repeatWeaknesses,
      reviewPriorities,
      subjectStats,
      topicAnalyticsAvailable,
      topicAnalyticsMessage,
      topicCoverage: {
        attemptsWithOutcomes: analyticsAttempts.length,
        capturedOutcomeCount,
        answeredOutcomeCount,
        mappedAnsweredCount: observations.length,
        coverageRate: answeredOutcomeCount
          ? round1((observations.length / answeredOutcomeCount) * 100)
          : 0,
      },
      weakestTopic,
      weakestSubtopic,
      topicStats: topicStats.slice(0, 12),
      subtopicStats: subtopicStats.slice(0, 12),
    });
  } catch (error) {
    console.error("Pro analysis route failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pro 分析讀取失敗。" },
      { status: 500 },
    );
  }
}
