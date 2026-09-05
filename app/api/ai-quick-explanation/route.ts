import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Source = "national-exam" | "material";

type QuickPayload = {
  questionKey?: string;
  source?: Source;
  sourceLabel?: string;
  stem?: string;
  options?: string[];
  correctIndex?: number | null;
  existingExplanation?: string | null;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: { message?: string };
};

function normalizeSource(value: unknown): Source {
  return value === "material" ? "material" : "national-exam";
}

function quickKey(questionKey: string) {
  return `${questionKey}:quick-v1`;
}

function getOutputText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (
        content.type === "output_text" &&
        typeof content.text === "string" &&
        content.text.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return "";
}

async function readCachedQuick(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  source: Source;
  questionKey: string;
}) {
  const key = quickKey(input.questionKey);

  if (input.source === "national-exam") {
    const { data, error } = await input.supabase
      .from("shared_ai_explanations")
      .select("explanation")
      .eq("question_key", key)
      .maybeSingle();

    if (error) throw new Error(`AI 解析讀取失敗：${error.message}`);

    const value = data?.explanation as { quick?: unknown } | null;
    return typeof value?.quick === "string" ? value.quick : null;
  }

  const { data, error } = await input.supabase
    .from("ai_question_explanations")
    .select("explanation")
    .eq("user_id", input.userId)
    .eq("question_key", key)
    .maybeSingle();

  if (error) throw new Error(`AI 解析讀取失敗：${error.message}`);

  const value = data?.explanation as { quick?: unknown } | null;
  return typeof value?.quick === "string" ? value.quick : null;
}

async function saveQuick(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  source: Source;
  sourceLabel: string;
  questionKey: string;
  quick: string;
}) {
  const key = quickKey(input.questionKey);
  const now = new Date().toISOString();

  if (input.source === "national-exam") {
    const { error } = await input.supabase
      .from("shared_ai_explanations")
      .upsert(
        {
          question_key: key,
          source: "national-exam",
          source_label: input.sourceLabel,
          explanation: { quick: input.quick },
          updated_at: now,
        },
        { onConflict: "question_key" },
      );

    if (error) throw new Error(`AI 解析儲存失敗：${error.message}`);
    return;
  }

  const { error } = await input.supabase
    .from("ai_question_explanations")
    .upsert(
      {
        user_id: input.userId,
        question_key: key,
        source: "material",
        source_label: input.sourceLabel,
        explanation: { quick: input.quick },
        updated_at: now,
      },
      { onConflict: "user_id,question_key" },
    );

  if (error) throw new Error(`AI 解析儲存失敗：${error.message}`);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入才能使用 AI 解析。" }, { status: 401 });
    }

    const questionKey = String(request.nextUrl.searchParams.get("questionKey") ?? "").trim();
    const source = normalizeSource(request.nextUrl.searchParams.get("source"));

    if (!questionKey) {
      return NextResponse.json({ error: "缺少 questionKey。" }, { status: 400 });
    }

    const quick = await readCachedQuick({
      supabase,
      userId: user.id,
      source,
      questionKey,
    });

    return NextResponse.json({ cached: Boolean(quick), quick: quick ?? undefined });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 解析讀取失敗。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "伺服器尚未設定 OPENAI_API_KEY。" }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入才能使用 AI 解析。" }, { status: 401 });
    }

    const body = (await request.json()) as QuickPayload;
    const source = normalizeSource(body.source);
    const questionKey = typeof body.questionKey === "string" ? body.questionKey.trim() : "";
    const sourceLabel = typeof body.sourceLabel === "string" ? body.sourceLabel.trim() : "";
    const stem = typeof body.stem === "string" ? body.stem.trim() : "";
    const options = Array.isArray(body.options) ? body.options.map((item) => String(item ?? "").trim()) : [];
    const correctIndex = typeof body.correctIndex === "number" ? body.correctIndex : null;

    if (!questionKey || !stem || options.length !== 4 || correctIndex === null || correctIndex < 0 || correctIndex > 3) {
      return NextResponse.json(
        { error: "這題缺少完整題幹、四個選項或正確答案，無法產生 AI 解析。" },
        { status: 400 },
      );
    }

    const cached = await readCachedQuick({
      supabase,
      userId: user.id,
      source,
      questionKey,
    });

    if (cached) {
      return NextResponse.json({ cached: true, quick: cached });
    }

    const correctLabel = `${String.fromCharCode(65 + correctIndex)}. ${options[correctIndex]}`;
    const existingExplanation = typeof body.existingExplanation === "string"
      ? body.existingExplanation.trim()
      : "";

    const input = [
      "你是 MedSlime 的醫檢師國考學習助手。",
      "請只用一句繁體中文快速解析這題，直接說答案與最核心的判斷理由。",
      "限制：一個句子、約 25–70 個中文字，不列點、不延伸教科書內容。",
      "官方正確答案已固定，不得自行更改。英文專有名詞保留原文。",
      `題目：${stem}`,
      `選項：${options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join(" / ")}`,
      `官方答案：${correctLabel}`,
      existingExplanation ? `既有簡短解析（僅供參考）：${existingExplanation}` : "",
    ].filter(Boolean).join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:
          process.env.OPENAI_QUICK_EXPLANATION_MODEL ??
          process.env.OPENAI_EXPLANATION_MODEL ??
          "gpt-5-mini",
        store: false,
        reasoning: { effort: "minimal" },
        max_output_tokens: 160,
        text: { verbosity: "low" },
        input,
      }),
    });

    const payload = (await response.json()) as OpenAIResponse;

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error?.message ?? `OpenAI 解析失敗（HTTP ${response.status}）。` },
        { status: 502 },
      );
    }

    const quick = getOutputText(payload).replace(/\s+/g, " ").trim();
    if (!quick) {
      return NextResponse.json({ error: "AI 已回應，但沒有取得解析內容。" }, { status: 502 });
    }

    await saveQuick({
      supabase,
      userId: user.id,
      source,
      sourceLabel,
      questionKey,
      quick,
    });

    return NextResponse.json({ cached: false, quick });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 解析發生未知錯誤。" },
      { status: 500 },
    );
  }
}
