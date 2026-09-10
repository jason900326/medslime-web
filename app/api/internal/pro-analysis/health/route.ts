import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isAuthorized(request: NextRequest) {
  const configured = String(process.env.TAXONOMY_ADMIN_SECRET ?? "").trim();
  const supplied = String(request.headers.get("x-taxonomy-secret") ?? "").trim();
  return Boolean(configured && supplied && configured === supplied);
}

function missingColumn(message: string, column: string) {
  return message.toLowerCase().includes(column.toLowerCase());
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const attemptResult = await admin
      .from("exam_attempts")
      .select("id,question_outcomes,completed_at")
      .order("completed_at", { ascending: false })
      .limit(200);

    if (attemptResult.error) {
      if (missingColumn(attemptResult.error.message, "question_outcomes")) {
        return NextResponse.json({
          ready: false,
          questionOutcomesColumn: false,
          message:
            "exam_attempts.question_outcomes is missing. Run supabase/exam_attempt_question_outcomes.sql before enabling topic analytics.",
        });
      }
      throw new Error(`讀取 exam_attempts 失敗：${attemptResult.error.message}`);
    }

    const attempts = attemptResult.data ?? [];
    let attemptsWithOutcomes = 0;
    let outcomesSampled = 0;

    for (const row of attempts) {
      const outcomes = Array.isArray(row.question_outcomes) ? row.question_outcomes : [];
      if (outcomes.length > 0) attemptsWithOutcomes += 1;
      outcomesSampled += outcomes.length;
    }

    const [classifiedResult, reviewResult, pendingResult] = await Promise.all([
      admin
        .from("national_exam_questions")
        .select("id", { count: "exact", head: true })
        .eq("taxonomy_status", "classified"),
      admin
        .from("national_exam_questions")
        .select("id", { count: "exact", head: true })
        .eq("taxonomy_status", "needs_review"),
      admin
        .from("national_exam_questions")
        .select("id", { count: "exact", head: true })
        .eq("taxonomy_status", "pending"),
    ]);

    for (const result of [classifiedResult, reviewResult, pendingResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    return NextResponse.json({
      ready: true,
      questionOutcomesColumn: true,
      attemptsSampled: attempts.length,
      attemptsWithOutcomes,
      outcomesSampled,
      taxonomy: {
        classified: classifiedResult.count ?? 0,
        needsReview: reviewResult.count ?? 0,
        pending: pendingResult.count ?? 0,
      },
      message:
        attemptsWithOutcomes > 0
          ? "Topic analytics data path is ready."
          : "Schema is ready. Complete a new national-exam or free-quiz attempt to create the first question_outcomes snapshot.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Health check failed." },
      { status: 500 },
    );
  }
}
