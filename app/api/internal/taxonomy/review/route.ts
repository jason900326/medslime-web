import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTION_TAXONOMY_VERSION } from "@/lib/question-taxonomy";

const allowedStatuses = new Set(["classified", "needs_review", "pending"]);

function isAuthorized(request: NextRequest) {
  const configured = String(process.env.TAXONOMY_ADMIN_SECRET ?? "").trim();
  const supplied = String(request.headers.get("x-taxonomy-secret") ?? "").trim();
  return Boolean(configured && supplied && configured === supplied);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requestedStatus = String(
      request.nextUrl.searchParams.get("status") ?? "classified",
    ).trim();
    const status = allowedStatuses.has(requestedStatus)
      ? requestedStatus
      : "classified";
    const subject = String(
      request.nextUrl.searchParams.get("subject") ?? "",
    ).trim();
    const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
    const limit = Math.max(1, Math.min(50, Math.floor(requestedLimit || 20)));

    const admin = createAdminClient();

    let sampleQuery = admin
      .from("national_exam_questions")
      .select(
        "id,exam_year,exam_round,subject,question_number,question,topic,subtopic,concepts,taxonomy_status,taxonomy_confidence,taxonomy_version,taxonomy_model,taxonomy_updated_at",
      )
      .eq("taxonomy_status", status)
      .order("taxonomy_updated_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (status !== "pending") {
      sampleQuery = sampleQuery.eq("taxonomy_version", QUESTION_TAXONOMY_VERSION);
    }
    if (subject) sampleQuery = sampleQuery.eq("subject", subject);

    const [
      sampleResult,
      classifiedResult,
      needsReviewResult,
      pendingResult,
      outdatedResult,
    ] = await Promise.all([
      sampleQuery,
      admin
        .from("national_exam_questions")
        .select("subject,topic,taxonomy_confidence")
        .eq("taxonomy_status", "classified")
        .eq("taxonomy_version", QUESTION_TAXONOMY_VERSION),
      admin
        .from("national_exam_questions")
        .select("id", { count: "exact", head: true })
        .eq("taxonomy_status", "needs_review")
        .eq("taxonomy_version", QUESTION_TAXONOMY_VERSION),
      admin
        .from("national_exam_questions")
        .select("id", { count: "exact", head: true })
        .eq("taxonomy_status", "pending"),
      admin
        .from("national_exam_questions")
        .select("id", { count: "exact", head: true })
        .neq("taxonomy_status", "pending")
        .not("taxonomy_version", "is", null)
        .neq("taxonomy_version", QUESTION_TAXONOMY_VERSION),
    ]);

    if (sampleResult.error) throw new Error(sampleResult.error.message);
    if (classifiedResult.error) throw new Error(classifiedResult.error.message);
    if (needsReviewResult.error) throw new Error(needsReviewResult.error.message);
    if (pendingResult.error) throw new Error(pendingResult.error.message);
    if (outdatedResult.error) throw new Error(outdatedResult.error.message);

    const groups = new Map<
      string,
      { subject: string; topic: string; count: number; confidenceSum: number }
    >();

    for (const row of classifiedResult.data ?? []) {
      const rowSubject = String(row.subject ?? "").trim();
      const topic = String(row.topic ?? "").trim();
      if (!rowSubject || !topic) continue;
      const key = `${rowSubject}::${topic}`;
      const current = groups.get(key) ?? {
        subject: rowSubject,
        topic,
        count: 0,
        confidenceSum: 0,
      };
      current.count += 1;
      current.confidenceSum += Number(row.taxonomy_confidence ?? 0);
      groups.set(key, current);
    }

    const topicDistribution = [...groups.values()]
      .map((item) => ({
        subject: item.subject,
        topic: item.topic,
        count: item.count,
        averageConfidence:
          item.count > 0 ? Number((item.confidenceSum / item.count).toFixed(3)) : 0,
      }))
      .sort(
        (a, b) =>
          a.subject.localeCompare(b.subject, "zh-Hant") ||
          b.count - a.count ||
          a.topic.localeCompare(b.topic, "zh-Hant"),
      );

    return NextResponse.json({
      version: QUESTION_TAXONOMY_VERSION,
      status,
      subject: subject || null,
      counts: {
        classified: classifiedResult.data?.length ?? 0,
        needsReview: needsReviewResult.count ?? 0,
        pending: pendingResult.count ?? 0,
        outdated: outdatedResult.count ?? 0,
      },
      topicDistribution,
      sample: sampleResult.data ?? [],
    });
  } catch (error) {
    console.error("Taxonomy review failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Taxonomy review failed." },
      { status: 500 },
    );
  }
}
