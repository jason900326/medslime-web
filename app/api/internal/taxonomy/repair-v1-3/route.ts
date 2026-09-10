import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTION_TAXONOMY_V13_REPAIR_SOURCE_VERSION } from "@/lib/question-taxonomy";

function isAuthorized(request: NextRequest) {
  const configured = String(process.env.TAXONOMY_ADMIN_SECRET ?? "").trim();
  const supplied = String(request.headers.get("x-taxonomy-secret") ?? "").trim();
  return Boolean(configured && supplied && configured === supplied);
}

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter((item) => /^\d+$/.test(item)),
    ),
  ).slice(0, 100);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
    const ids = normalizeIds(body.ids);
    if (!ids.length) {
      return NextResponse.json(
        { error: "ids must contain at least one numeric question id." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("national_exam_questions")
      .select("id,taxonomy_status,taxonomy_version,subtopic")
      .in("id", ids)
      .eq("taxonomy_status", "needs_review")
      .eq("taxonomy_version", QUESTION_TAXONOMY_V13_REPAIR_SOURCE_VERSION)
      .eq("subtopic", "其他");

    if (error) {
      throw new Error(`讀取 v1.3 repair 題目失敗：${error.message}`);
    }

    const eligibleIds = new Set(
      (data ?? []).map((row) => String(row.id ?? "")).filter(Boolean),
    );
    const selectedIds = ids.filter((id) => eligibleIds.has(id));
    const skippedIds = ids.filter((id) => !eligibleIds.has(id));

    if (!selectedIds.length) {
      return NextResponse.json({
        sourceVersion: QUESTION_TAXONOMY_V13_REPAIR_SOURCE_VERSION,
        requestedCount: ids.length,
        preparedCount: 0,
        preparedIds: [],
        skippedIds,
        message: "No eligible v1.2 needs_review rows with subtopic=其他 remain for these ids.",
      });
    }

    const { error: updateError } = await admin
      .from("national_exam_questions")
      .update({
        taxonomy_status: "pending",
        taxonomy_updated_at: new Date().toISOString(),
      })
      .in("id", selectedIds)
      .eq("taxonomy_status", "needs_review")
      .eq("taxonomy_version", QUESTION_TAXONOMY_V13_REPAIR_SOURCE_VERSION)
      .eq("subtopic", "其他");

    if (updateError) {
      throw new Error(`準備 v1.3 repair 題目失敗：${updateError.message}`);
    }

    return NextResponse.json({
      sourceVersion: QUESTION_TAXONOMY_V13_REPAIR_SOURCE_VERSION,
      requestedCount: ids.length,
      preparedCount: selectedIds.length,
      preparedIds: selectedIds,
      skippedIds,
      message:
        "Selected checkpoint rows were returned to pending. The normal queue will now reclassify them with taxonomy v1.3.",
    });
  } catch (error) {
    console.error("Taxonomy v1.3 repair preparation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Taxonomy v1.3 repair preparation failed.",
      },
      { status: 500 },
    );
  }
}
