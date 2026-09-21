import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type QuestionOutcome = {
  questionId: string;
  answered: boolean;
  correct: boolean | null;
  uncertain: boolean;
};

type Attempt = {
  id: string;
  subject: string;
  completedAt: string;
  questionOutcomes: QuestionOutcome[];
};

type TopicStat = {
  topic: string;
  attempts: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
  uncertainCount: number;
  priorityScore: number;
};

type TaxonomyRow = {
  id: unknown;
  topic: unknown;
  taxonomy_status: unknown;
};

const LOOKUP_CHUNK_SIZE = 200;

function round1(value: number) {
  return Number(value.toFixed(1));
}

function normalizeQuestionOutcomes(value: unknown): QuestionOutcome[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      const questionId = typeof raw.questionId === "string" ? raw.questionId.trim() : "";
      if (!questionId) return null;

      return {
        questionId,
        answered: raw.answered === true,
        correct: typeof raw.correct === "boolean" ? raw.correct : null,
        uncertain: raw.uncertain === true,
      } satisfies QuestionOutcome;
    })
    .filter((item): item is QuestionOutcome => Boolean(item));
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function buildTopicStats(
  observations: Array<{
    attemptId: string;
    completedAt: string;
    topic: string;
    correct: boolean;
    uncertain: boolean;
  }>,
): TopicStat[] {
  type Group = {
    topic: string;
    answeredCount: number;
    correctCount: number;
    uncertainCount: number;
    attempts: Map<string, string>;
  };

  const groups = new Map<string, Group>();

  for (const item of observations) {
    const group = groups.get(item.topic) ?? {
      topic: item.topic,
      answeredCount: 0,
      correctCount: 0,
      uncertainCount: 0,
      attempts: new Map<string, string>(),
    };

    group.answeredCount += 1;
    if (item.correct) group.correctCount += 1;
    if (item.uncertain) group.uncertainCount += 1;
    group.attempts.set(item.attemptId, item.completedAt);
    groups.set(item.topic, group);
  }

  return [...groups.values()]
    .map((group) => {
      const accuracy = (group.correctCount / group.answeredCount) * 100;
      const uncertainRate = (group.uncertainCount / group.answeredCount) * 100;
      const evidenceWeight = Math.min(1, group.answeredCount / 8);

      return {
        topic: group.topic,
        attempts: group.attempts.size,
        answeredCount: group.answeredCount,
        correctCount: group.correctCount,
        accuracy: round1(accuracy),
        uncertainCount: group.uncertainCount,
        priorityScore: round1((100 - accuracy) * evidenceWeight + uncertainRate * 0.2),
      } satisfies TopicStat;
    })
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        b.answeredCount - a.answeredCount ||
        a.topic.localeCompare(b.topic),
    );
}

async function readAttempts(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const result = await admin
    .from("exam_attempts")
    .select("id,subject,completed_at,question_outcomes")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(120);

  if (result.error) {
    if (result.error.message.toLowerCase().includes("question_outcomes")) {
      return { attempts: [] as Attempt[], available: false };
    }
    throw new Error(`作答資料讀取失敗：${result.error.message}`);
  }

  const attempts = ((result.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    subject: String(row.subject ?? "未分類"),
    completedAt: String(row.completed_at ?? ""),
    questionOutcomes: normalizeQuestionOutcomes(row.question_outcomes),
  }));

  return { attempts, available: true };
}

async function readTaxonomy(
  admin: ReturnType<typeof createAdminClient>,
  questionIds: string[],
) {
  const map = new Map<string, { topic: string; classified: boolean }>();
  const uniqueIds = [
    ...new Set(
      questionIds
        .map((id) => Number(id))
        .filter((id) => Number.isSafeInteger(id) && id > 0),
    ),
  ];

  for (const chunk of chunkValues(uniqueIds, LOOKUP_CHUNK_SIZE)) {
    const result = await admin
      .from("national_exam_questions")
      .select("id,topic,taxonomy_status")
      .in("id", chunk);

    if (result.error) {
      throw new Error(`題目主題資料讀取失敗：${result.error.message}`);
    }

    for (const row of (result.data ?? []) as TaxonomyRow[]) {
      const id = String(row.id ?? "");
      const topic = String(row.topic ?? "").trim();
      if (!id || !topic) continue;
      map.set(id, {
        topic,
        classified: row.taxonomy_status === "classified",
      });
    }
  }

  return map;
}

export async function GET(request: Request) {
  try {
    const subject = new URL(request.url).searchParams.get("subject")?.trim() ?? "";
    if (!subject) {
      return NextResponse.json({ error: "缺少科目。" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入。" }, { status: 401 });
    }

    const admin = createAdminClient();
    const [{ attempts, available }, entitlementResult] = await Promise.all([
      readAttempts(admin, user.id),
      admin
        .from("player_entitlements")
        .select("pro_expires_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (entitlementResult.error) {
      throw new Error(`Pro 權限讀取失敗：${entitlementResult.error.message}`);
    }

    const proExpiresAt = entitlementResult.data?.pro_expires_at ?? null;
    const isPro = Boolean(proExpiresAt && new Date(proExpiresAt).getTime() > Date.now());
    const subjectAttempts = attempts.filter((attempt) => attempt.subject === subject);

    if (!available) {
      return NextResponse.json({
        subject,
        isPro,
        topicStats: [],
        availableTopicCount: 0,
        message: "新版作答資料尚未啟用主題分析。",
      });
    }

    const outcomes = subjectAttempts.flatMap((attempt) =>
      attempt.questionOutcomes.map((outcome) => ({ attempt, outcome })),
    );
    const taxonomy = await readTaxonomy(
      admin,
      outcomes.map(({ outcome }) => outcome.questionId),
    );
    const observations = outcomes.flatMap(({ attempt, outcome }) => {
      const item = taxonomy.get(outcome.questionId);
      if (!item?.classified || !outcome.answered || outcome.correct === null) return [];
      return [
        {
          attemptId: attempt.id,
          completedAt: attempt.completedAt,
          topic: item.topic,
          correct: outcome.correct,
          uncertain: outcome.uncertain,
        },
      ];
    });
    const topicStats = buildTopicStats(observations);
    const visibleLimit = isPro ? 3 : 1;

    return NextResponse.json({
      subject,
      isPro,
      topicStats: topicStats.slice(0, visibleLimit),
      availableTopicCount: topicStats.length,
      message:
        observations.length === 0
          ? "完成新版考卷後，這裡會開始整理你的主題弱點。"
          : null,
    });
  } catch (error) {
    console.error("Learning direction route failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "學習方向讀取失敗。" },
      { status: 500 },
    );
  }
}
