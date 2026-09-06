import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const { data, error } = await admin
      .from("player_entitlements")
      .select("ai_detail_credits,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      aiDetailCredits: data?.ai_detail_credits ?? 0,
      updatedAt: data?.updated_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "讀取 AI 詳解額度失敗。",
      },
      { status: 500 },
    );
  }
}
