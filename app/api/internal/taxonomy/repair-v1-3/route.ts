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
      .in("id", ids);

    if (error) {
      throw new Error(`讀取 v1.3 repair 題目失敗：${error.message}`);
    }

    const rowsById = new Map(
      (data ?? []).map((row) => [String(row.id ?? ""), row] as const),
    );
    const eligibleIds: string[] = [];
    const alreadyPendingIds: string[] = [];
    const alreadyRepairedIds: string[] = [];
    const skippedIds: string[] = [];

    for (const id of ids) {
      const row = rowsById.get(id);
      if (!row) {
        skippedIds.push(id);
        continue;
      }

      const status = String(row.taxonomy_status ?? "");
      const version = String(row.taxonomy_version ?? "");
      const subtopic = String(row.subtopic ?? "");

      if (
        status === "needs_review" &&
        version === QUESTION_TAXONOMY_V13_REPAIR_SOURCE_VERSION &&
        subtopic === "其他"
      ) {
        eligibleIds.push(id);
        continue;
      }

      // If a previous validation attempt stopped after preparation but before
      // all rows were reclassified, these rows are already safely queued.
      if (
        status === "pending" &&
        version === QUESTION_TAXONOMY_V13_REPAIR_SOURCE_VERSION &&
        subtopic === "其他"
      ) {
        alreadyPendingIds.push(id);
        continue;
      }

      if (version === "topic-taxonomy-v1.3" && status !== "pending") {
        alreadyRepairedIds.push(id);
        continue;
      }

      skippedIds.push(id);
    }

    if (eligibleIds.length) {
      const { error: updateError } = await admin
        .from("national_exam_questions")
        .update({
          taxonomy_status: "pending",
          taxonomy_updated_at: new Date().toISOString(),
        })
        .in("id", eligibleIds)
        .eq("taxonomy_status", "needs_review")
        .eq("taxonomy_version", QUESTION_TAXONOMY_V13_REPAIR_SOURCE_VERSION)
        .eq("subtopic", "其他");

      if (updateError) {
        throw new Error(`準備 v1.3 repair 題目失敗：${updateError.message}`);
      }
    }

    const queueIds = [...eligibleIds, ...alreadyPendingIds];

    return NextResponse.json({
      sourceVersion: QUESTION_TAXONOMY_V13_REPAIR_SOURCE_VERSION,
      requestedCount: ids.length,
      preparedCount: eligibleIds.length,
      preparedIds: eligibleIds,
      alreadyPendingCount: alreadyPendingIds.length,
      alreadyPendingIds,
      alreadyRepairedCount: alreadyRepairedIds.length,
      alreadyRepairedIds,
      queueCount: queueIds.length,
      queueIds,
      skippedIds,
      message: queueIds.length
        ? "Target checkpoint rows are queued for v1.3 classification. Existing pending rows were preserved for safe resume."
        : "No target checkpoint rows need to be queued; they may already be repaired.",
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
