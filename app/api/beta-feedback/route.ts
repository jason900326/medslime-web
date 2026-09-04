import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type FeedbackRequest = {
  type?: "bug" | "confusing" | "suggestion" | "other";
  message?: string;
  pathname?: string;
};

const allowedTypes = new Set([
  "bug",
  "confusing",
  "suggestion",
  "other",
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "請先登入才能送出測試回饋。" },
        { status: 401 },
      );
    }

    const body =
      (await request.json()) as FeedbackRequest;

    const type =
      typeof body.type === "string" &&
      allowedTypes.has(body.type)
        ? body.type
        : "other";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const pathname =
      typeof body.pathname === "string"
        ? body.pathname.trim().slice(0, 500)
        : "";

    if (message.length < 2) {
      return NextResponse.json(
        { error: "請至少寫一點內容再送出。" },
        { status: 400 },
      );
    }

    if (message.length > 3000) {
      return NextResponse.json(
        { error: "回饋內容太長，請縮短到 3000 字以內。" },
        { status: 400 },
      );
    }

    const userAgent =
      request.headers.get("user-agent") ?? "";

    const { error } = await supabase
      .from("beta_feedback")
      .insert({
        user_id: user.id,
        type,
        message,
        pathname,
        user_agent: userAgent.slice(0, 1000),
      });

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
            : "回饋送出失敗。",
      },
      { status: 500 },
    );
  }
}
