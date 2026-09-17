import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EXPLANATION_VERSION,
  explanationSchema,
  getOutputText,
  type ExplanationPayload,
  type ExplanationResult,
  type OpenAIResponse,
} from "@/lib/ai/explanation-contract";
import {
  EXPLANATION_INSTRUCTIONS,
  buildExplanationPrompt,
} from "@/lib/ai/explanation-prompt";

type DailyUseResult =
  | { ok: false; remaining: 0 }
  | { ok: true; remaining: number };

type ExplanationAccessSource = "exam_entitlement" | "pro" | "daily_limit";

function normalizeSource(value: unknown): "national-exam" | "material" {
  return value === "material" ? "material" : "national-exam";
}

function cacheKey(questionKey: string) {
  return `${questionKey}::${EXPLANATION_VERSION}`;
}

function nationalExamKeyFromQuestionKey(questionKey: string) {
  const parts = questionKey.split(":");
  if (parts.length < 5 || parts[0] !== "national-exam") return null;
  const year = parts[1]?.trim();
  const session = parts[2]?.trim();
  const subject = parts.slice(3, -1).join(":").trim();
  if (!year || !session || !subject) return null;
  return `${year}-${session}-${subject}`;
}

async function hasPurchasedExamExplanation(input: {
  userId: string;
  source: "national-exam" | "material";
  questionKey: string;
}) {
  const { userId, source, questionKey } = input;
  if (source !== "national-exam") return false;
  const examKey = nationalExamKeyFromQuestionKey(questionKey);
  if (!examKey) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_explanation_entitlements")
    .select("exam_key")
    .eq("user_id", userId)
    .eq("exam_key", examKey)
    .maybeSingle();

  if (error) {
    if (/exam_explanation_entitlements|does not exist|schema cache/i.test(error.message)) {
      return false;
    }
    throw new Error(`完整詳解權限讀取失敗：${error.message}`);
  }
  return Boolean(data);
}

async function hasActivePro(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("player_entitlements")
    .select("pro_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Pro 權限讀取失敗：${error.message}`);
  }

  const proExpiresAt = data?.pro_expires_at ?? null;
  return Boolean(
    proExpiresAt && new Date(proExpiresAt).getTime() > Date.now(),
  );
}

function resolveAccessSource(input: {
  purchasedExamAccess: boolean;
  proAccess: boolean;
}): ExplanationAccessSource {
  if (input.purchasedExamAccess) return "exam_entitlement";
  if (input.proAccess) return "pro";
  return "daily_limit";
}

async function readCachedExplanation(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  source: "national-exam" | "material";
  questionKey: string;
}) {
  const { supabase, userId, source, questionKey } = input;
  const versionedKey = cacheKey(questionKey);

  if (source === "national-exam") {
    const { data, error } = await supabase
      .from("shared_ai_explanations")
      .select("explanation")
      .eq("question_key", versionedKey)
      .maybeSingle();
    if (error) throw new Error(`共用 AI 解析讀取失敗：${error.message}`);
    return (data?.explanation as ExplanationResult | null) ?? null;
  }

  const { data, error } = await supabase
    .from("ai_question_explanations")
    .select("explanation")
    .eq("user_id", userId)
    .eq("question_key", versionedKey)
    .maybeSingle();
  if (error) throw new Error(`教材 AI 解析讀取失敗：${error.message}`);
  return (data?.explanation as ExplanationResult | null) ?? null;
}

async function saveExplanation(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  source: "national-exam" | "material";
  sourceLabel: string;
  questionKey: string;
  explanation: ExplanationResult;
}) {
  const { supabase, userId, source, sourceLabel, questionKey, explanation } = input;
  const now = new Date().toISOString();
  const versionedKey = cacheKey(questionKey);

  if (source === "national-exam") {
    const { error } = await supabase.from("shared_ai_explanations").upsert(
      {
        question_key: versionedKey,
        source: "national-exam",
        source_label: sourceLabel,
        explanation,
        updated_at: now,
      },
      { onConflict: "question_key" },
    );
    if (error) throw new Error(`共用 AI 解析儲存失敗：${error.message}`);
    return;
  }

  const { error } = await supabase.from("ai_question_explanations").upsert(
    {
      user_id: userId,
      question_key: versionedKey,
      source: "material",
      source_label: sourceLabel,
      explanation,
      updated_at: now,
    },
    { onConflict: "user_id,question_key" },
  );
  if (error) throw new Error(`教材 AI 解析儲存失敗：${error.message}`);
}

async function recordExplanationEvent(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  questionKey: string;
  source: "national-exam" | "material";
  eventType: "cache_view" | "generated";
}) {
  const { supabase, userId, questionKey, source, eventType } = input;
  const { error } = await supabase.from("ai_explanation_events").insert({
    user_id: userId,
    question_key: questionKey,
    source,
    event_type: eventType,
  });
  if (error) console.error("AI 解析事件統計寫入失敗：", error);
}

function normalizeRpcPayload(data: unknown): Record<string, unknown> {
  if (data && typeof data === "object") return data as Record<string, unknown>;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

async function consumeDailyDetailUse(userId: string): Promise<DailyUseResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_ai_detail_daily_use", {
    p_user_id: userId,
  });
  if (error) {
    if (error.message.includes("AI_DETAIL_DAILY_LIMIT_REACHED")) {
      return { ok: false, remaining: 0 };
    }
    throw new Error(`完整詳解每日使用次數更新失敗：${error.message}`);
  }
  const payload = normalizeRpcPayload(data);
  return { ok: true, remaining: Math.max(0, Number(payload.remaining ?? 0)) };
}

async function refundDailyDetailUse(userId: string) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("refund_ai_detail_daily_use", {
      p_user_id: userId,
    });
    if (error) console.error("完整詳解每日使用次數退回失敗：", error);
  } catch (error) {
    console.error("完整詳解每日使用次數退回失敗：", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "請先登入才能查看完整詳解。" }, { status: 401 });
    }

    const questionKey = String(request.nextUrl.searchParams.get("questionKey") ?? "").trim();
    const source = normalizeSource(request.nextUrl.searchParams.get("source"));
    if (!questionKey) {
      return NextResponse.json({ error: "缺少 questionKey。" }, { status: 400 });
    }

    const [cached, purchasedExamAccess, proAccess] = await Promise.all([
      readCachedExplanation({ supabase, userId: user.id, source, questionKey }),
      hasPurchasedExamExplanation({ userId: user.id, source, questionKey }),
      hasActivePro(user.id),
    ]);

    return NextResponse.json({
      available: Boolean(cached),
      purchasedExamAccess,
      proAccess,
      explanationVersion: EXPLANATION_VERSION,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "完整詳解讀取失敗。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let reservedDailyUse: { userId: string } | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "請先登入才能查看完整詳解。" }, { status: 401 });
    }

    const body = (await request.json()) as ExplanationPayload;
    const source = normalizeSource(body.source);
    const questionKey = typeof body.questionKey === "string" ? body.questionKey.trim() : "";
    const sourceLabel = typeof body.sourceLabel === "string" ? body.sourceLabel.trim() : "";
    const stem = typeof body.stem === "string" ? body.stem.trim() : "";
    const options = Array.isArray(body.options)
      ? body.options.map((item) => String(item ?? "").trim())
      : [];
    const correctIndex = typeof body.correctIndex === "number" ? body.correctIndex : null;

    if (
      !questionKey ||
      !stem ||
      options.length !== 4 ||
      correctIndex === null ||
      correctIndex < 0 ||
      correctIndex > 3
    ) {
      return NextResponse.json(
        { error: "這題缺少完整題幹、四個選項或單一正確答案，暫時無法提供完整詳解。" },
        { status: 400 },
      );
    }

    const [purchasedExamAccess, proAccess] = await Promise.all([
      hasPurchasedExamExplanation({
        userId: user.id,
        source,
        questionKey,
      }),
      hasActivePro(user.id),
    ]);
    const accessSource = resolveAccessSource({ purchasedExamAccess, proAccess });

    let dailyRemaining: number | null = null;
    if (accessSource === "daily_limit") {
      const dailyUse = await consumeDailyDetailUse(user.id);
      if (!dailyUse.ok) {
        return NextResponse.json(
          {
            error: "今日完整詳解使用次數已達上限。",
            code: "AI_DETAIL_DAILY_LIMIT_REACHED",
          },
          { status: 402 },
        );
      }
      dailyRemaining = dailyUse.remaining;
      reservedDailyUse = { userId: user.id };
    }

    const cached = await readCachedExplanation({
      supabase,
      userId: user.id,
      source,
      questionKey,
    });
    if (cached) {
      await recordExplanationEvent({
        supabase,
        userId: user.id,
        questionKey,
        source,
        eventType: "cache_view",
      });
      reservedDailyUse = null;
      return NextResponse.json({
        cached: true,
        explanation: cached,
        accessSource,
        aiDetailRemaining: dailyRemaining,
        explanationVersion: EXPLANATION_VERSION,
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      if (reservedDailyUse) await refundDailyDetailUse(user.id);
      reservedDailyUse = null;
      return NextResponse.json({ error: "伺服器尚未設定 OPENAI_API_KEY。" }, { status: 500 });
    }

    const userAnswer = typeof body.userAnswer === "number" ? body.userAnswer : null;
    const existingExplanation =
      typeof body.existingExplanation === "string" ? body.existingExplanation.trim() : "";
    const prompt = buildExplanationPrompt({
      source,
      sourceLabel,
      stem,
      options,
      correctIndex,
      userAnswer,
      uncertain: body.uncertain === true,
      existingExplanation,
    });

    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:
          process.env.OPENAI_EXPLANATION_MODEL ??
          process.env.OPENAI_MATERIAL_MODEL ??
          "gpt-5-mini",
        store: false,
        instructions: EXPLANATION_INSTRUCTIONS,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "medslime_adaptive_explanation_v2",
            strict: true,
            schema: explanationSchema,
          },
        },
      }),
    });

    const openAIPayload = (await openAIResponse.json()) as OpenAIResponse;
    if (!openAIResponse.ok) {
      console.error("OpenAI explanation failed:", openAIPayload);
      if (reservedDailyUse) await refundDailyDetailUse(user.id);
      reservedDailyUse = null;
      return NextResponse.json(
        {
          error:
            openAIPayload.error?.message ??
            `OpenAI 詳解失敗（HTTP ${openAIResponse.status}）。`,
        },
        { status: 502 },
      );
    }

    const outputText = getOutputText(openAIPayload);
    if (!outputText) {
      if (reservedDailyUse) await refundDailyDetailUse(user.id);
      reservedDailyUse = null;
      return NextResponse.json(
        { error: "OpenAI 已回應，但沒有取得可解析的詳解。" },
        { status: 502 },
      );
    }

    let explanation: ExplanationResult;
    try {
      explanation = JSON.parse(outputText) as ExplanationResult;
    } catch {
      if (reservedDailyUse) await refundDailyDetailUse(user.id);
      reservedDailyUse = null;
      return NextResponse.json({ error: "AI 詳解格式異常，請再試一次。" }, { status: 502 });
    }

    await saveExplanation({
      supabase,
      userId: user.id,
      source,
      sourceLabel,
      questionKey,
      explanation,
    });
    await recordExplanationEvent({
      supabase,
      userId: user.id,
      questionKey,
      source,
      eventType: "generated",
    });

    reservedDailyUse = null;
    return NextResponse.json({
      cached: false,
      explanation,
      accessSource,
      aiDetailRemaining: dailyRemaining,
      explanationVersion: EXPLANATION_VERSION,
    });
  } catch (error) {
    if (reservedDailyUse) await refundDailyDetailUse(reservedDailyUse.userId);
    console.error("AI explanation route failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 詳解發生未知錯誤。" },
      { status: 500 },
    );
  }
}
