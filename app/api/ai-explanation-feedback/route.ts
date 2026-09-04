import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type FeedbackRequest = {
  questionKey?: string;
  source?: "national-exam" | "material";
  sourceLabel?: string;
  feedback?: "helpful" | "not_helpful";
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "請先登入才能留下回饋。" },
        { status: 401 },
      );
    }

    const body =
      (await request.json()) as FeedbackRequest;

    const questionKey =
      typeof body.questionKey === "string"
        ? body.questionKey.trim()
        : "";

    const source =
      body.source === "material"
        ? "material"
        : "national-exam";

    const feedback =
      body.feedback === "not_helpful"
        ? "not_helpful"
        : body.feedback === "helpful"
          ? "helpful"
          : null;

    if (!questionKey || !feedback) {
      return NextResponse.json(
        { error: "回饋資料不完整。" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("ai_explanation_feedback")
      .upsert(
        {
          user_id: user.id,
          question_key: questionKey,
          source,
          source_label:
            typeof body.sourceLabel === "string"
              ? body.sourceLabel.trim()
              : "",
          feedback,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,question_key",
        },
      );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "回饋儲存失敗。",
      },
      { status: 500 },
    );
  }
}
