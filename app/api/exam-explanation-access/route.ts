import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        purchased: false,
        purchasedAt: null,
      });
    }

    const year = request.nextUrl.searchParams.get("year")?.trim() ?? "";
    const session = request.nextUrl.searchParams.get("session")?.trim() ?? "";
    const subject = request.nextUrl.searchParams.get("subject")?.trim() ?? "";

    if (!year || !session || !subject) {
      return NextResponse.json(
        { error: "缺少年度、梯次或科目。" },
        { status: 400 },
      );
    }

    const examKey = `${year}-${session}-${subject}`;
    const { data, error } = await supabase
      .from("exam_explanation_entitlements")
      .select("exam_key,purchased_at")
      .eq("user_id", user.id)
      .eq("exam_key", examKey)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      authenticated: true,
      purchased: Boolean(data),
      purchasedAt: data?.purchased_at ?? null,
      examKey,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "讀取完整詳解權限失敗。",
      },
      { status: 500 },
    );
  }
}
