import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedCategories = new Set([
  "題目或答案問題",
  "AI 解析／AI 詳解問題",
  "登入／帳號問題",
  "付款／商城問題",
  "教材／PDF 問題",
  "抽卡／史萊姆問題",
  "網站錯誤／顯示異常",
  "功能建議",
  "其他",
]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = cleanText(body?.email, 200);
    const category = cleanText(body?.category, 100);
    const description = cleanText(body?.description, 4000);
    const pageUrl = cleanText(body?.pageUrl, 1000);
    const website = cleanText(body?.website, 200);

    if (website) {
      return NextResponse.json({ ok: true });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "請填寫有效的 Email。" }, { status: 400 });
    }

    if (!allowedCategories.has(category)) {
      return NextResponse.json({ error: "請選擇有效的問題類型。" }, { status: 400 });
    }

    if (description.length < 5) {
      return NextResponse.json({ error: "請再多描述一點問題內容。" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();
    const { error } = await admin.from("feedback_reports").insert({
      user_id: user?.id ?? null,
      email,
      category,
      description,
      page_url: pageUrl || null,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    });

    if (error) {
      console.error("feedback_reports insert failed:", error);
      return NextResponse.json({ error: "回報暫時無法送出，請稍後再試。" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("feedback API failed:", error);
    return NextResponse.json({ error: "回報暫時無法送出，請稍後再試。" }, { status: 500 });
  }
}
