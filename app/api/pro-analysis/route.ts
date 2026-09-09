import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ReviewItem = {
  id: string;
  questionNumber: number | null;
  stem: string;
};

type Attempt = {
  id: string;
  subject: string;
  examKey: string;
  score: number;
  completedAt: string;
  reviewItems: ReviewItem[];
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
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
      const key = `${attempt.examKey}:${item.questionNumber ?? item.id}`;
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
): ReviewPriority[] {
  return mistakes
    .filter((item) => !item.reviewed)
    .map((item) => {
      let score = 0;
      const reasons: string[] = [];

      if (weakestSubject && item.subject === weakestSubject) {
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

function buildRecommendation(
  weakest: SubjectStat | null,
  pendingCount: number,
  mistakeSubject: string | null,
  trendDelta: number | null,
) {
  if (!weakest) {
    return "先累積 2–3 份作答紀錄，MedSlime 才能開始比較你的科目趨勢。";
  }

  const parts = [`目前優先補強「${weakest.subject}」，平均 ${weakest.average.toFixed(1)} 分。`];

  if (pendingCount > 0) {
    parts.push(`先處理 ${pendingCount} 題尚未完成的錯題複習。`);
  }

  if (mistakeSubject && mistakeSubject !== weakest.subject) {
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

    const [attemptResult, mistakeResult] = await Promise.all([
      admin
        .from("exam_attempts")
        .select("id,subject,exam_key,score,completed_at,review_items")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(120),
      admin
        .from("player_mistakes")
        .select("mistake_id,record")
        .eq("user_id", user.id),
    ]);

    if (attemptResult.error) {
      throw new Error(`Pro 作答資料讀取失敗：${attemptResult.error.message}`);
    }
    if (mistakeResult.error) {
      throw new Error(`Pro 錯題資料讀取失敗：${mistakeResult.error.message}`);
    }

    const attempts: Attempt[] = (attemptResult.data ?? []).map((row) => ({
      id: String(row.id),
      subject: String(row.subject ?? "未分類"),
      examKey: String(row.exam_key ?? ""),
      score: Number(row.score ?? 0),
      completedAt: String(row.completed_at ?? ""),
      reviewItems: normalizeReviewItems(row.review_items),
    }));

    const mistakes: Mistake[] = (mistakeResult.data ?? [])
      .map((row) => normalizeMistake(row.record, String(row.mistake_id ?? "")))
      .filter((item): item is Mistake => Boolean(item));

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
        pendingMistakes.length,
        topMistakeSubject,
        trendDelta,
      ),
      repeatWeaknesses,
      reviewPriorities,
      subjectStats,
    });
  } catch (error) {
    console.error("Pro analysis route failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pro 分析讀取失敗。" },
      { status: 500 },
    );
  }
}
