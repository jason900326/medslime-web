import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ExplanationPayload = {
  questionKey?: string;
  source?: "national-exam" | "material";
  sourceLabel?: string;
  stem?: string;
  options?: string[];
  correctIndex?: number | null;
  userAnswer?: number | null;
  uncertain?: boolean;
  existingExplanation?: string | null;
};

type ExplanationResult = {
  whatItTests: string;
  correctAnswer: string;
  whyCorrect: string;
  optionAnalysis: Array<{
    label: string;
    explanation: string;
  }>;
  quickSummary: string[];
  memoryPoint: string;
  commonTrap: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const explanationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    whatItTests: { type: "string" },
    correctAnswer: { type: "string" },
    whyCorrect: { type: "string" },
    optionAnalysis: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["label", "explanation"],
      },
    },
    quickSummary: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: { type: "string" },
    },
    memoryPoint: { type: "string" },

    /*
     * 不再使用 null。
     * 如果沒有明顯陷阱，請回傳空字串 ""。
     * 前端看到空字串就不顯示「常見陷阱」區塊。
     */
    commonTrap: { type: "string" },
  },
  required: [
    "whatItTests",
    "correctAnswer",
    "whyCorrect",
    "optionAnalysis",
    "quickSummary",
    "memoryPoint",
    "commonTrap",
  ],
} as const;

function getOutputText(payload: OpenAIResponse) {
  if (
    typeof payload.output_text === "string" &&
    payload.output_text.trim()
  ) {
    return payload.output_text;
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (
        content.type === "output_text" &&
        typeof content.text === "string" &&
        content.text.trim()
      ) {
        return content.text;
      }
    }
  }

  return "";
}

function normalizeSource(
  value: unknown,
): "national-exam" | "material" {
  return value === "material"
    ? "material"
    : "national-exam";
}

async function readCachedExplanation(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  source: "national-exam" | "material";
  questionKey: string;
}) {
  const {
    supabase,
    userId,
    source,
    questionKey,
  } = input;

  if (source === "national-exam") {
    /*
     * 國考 AI 基礎解析：
     * 全站共用，同一題只生成一次。
     */
    const { data, error } = await supabase
      .from("shared_ai_explanations")
      .select("explanation")
      .eq("question_key", questionKey)
      .maybeSingle();

    if (error) {
      throw new Error(
        `共用 AI 解析讀取失敗：${error.message}`,
      );
    }

    return (
      (data?.explanation as ExplanationResult | null) ??
      null
    );
  }

  /*
   * 教材解析：
   * 教材是使用者自己的內容，所以維持個人快取。
   */
  const { data, error } = await supabase
    .from("ai_question_explanations")
    .select("explanation")
    .eq("user_id", userId)
    .eq("question_key", questionKey)
    .maybeSingle();

  if (error) {
    throw new Error(
      `教材 AI 解析讀取失敗：${error.message}`,
    );
  }

  return (
    (data?.explanation as ExplanationResult | null) ??
    null
  );
}

async function saveExplanation(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  source: "national-exam" | "material";
  sourceLabel: string;
  questionKey: string;
  explanation: ExplanationResult;
}) {
  const {
    supabase,
    userId,
    source,
    sourceLabel,
    questionKey,
    explanation,
  } = input;

  const now = new Date().toISOString();

  if (source === "national-exam") {
    const { error } = await supabase
      .from("shared_ai_explanations")
      .upsert(
        {
          question_key: questionKey,
          source: "national-exam",
          source_label: sourceLabel,
          explanation,
          updated_at: now,
        },
        {
          onConflict: "question_key",
        },
      );

    if (error) {
      throw new Error(
        `共用 AI 解析儲存失敗：${error.message}`,
      );
    }

    return;
  }

  const { error } = await supabase
    .from("ai_question_explanations")
    .upsert(
      {
        user_id: userId,
        question_key: questionKey,
        source: "material",
        source_label: sourceLabel,
        explanation,
        updated_at: now,
      },
      {
        onConflict: "user_id,question_key",
      },
    );

  if (error) {
    throw new Error(
      `教材 AI 解析儲存失敗：${error.message}`,
    );
  }
}

async function recordExplanationEvent(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  questionKey: string;
  source: "national-exam" | "material";
  eventType: "cache_view" | "generated";
}) {
  const {
    supabase,
    userId,
    questionKey,
    source,
    eventType,
  } = input;

  const { error } = await supabase
    .from("ai_explanation_events")
    .insert({
      user_id: userId,
      question_key: questionKey,
      source,
      event_type: eventType,
    });

  if (error) {
    console.error(
      "AI 解析事件統計寫入失敗：",
      error,
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "請先登入才能使用 AI 詳解。",
        },
        { status: 401 },
      );
    }

    const questionKey = String(
      request.nextUrl.searchParams.get("questionKey") ?? "",
    ).trim();

    const source = normalizeSource(
      request.nextUrl.searchParams.get("source"),
    );

    if (!questionKey) {
      return NextResponse.json(
        {
          error: "缺少 questionKey。",
        },
        { status: 400 },
      );
    }

    const cached =
      await readCachedExplanation({
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
    }

    return NextResponse.json({
      cached: Boolean(cached),
      explanation: cached ?? undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI 詳解讀取失敗。",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "伺服器尚未設定 OPENAI_API_KEY。",
        },
        { status: 500 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "請先登入才能使用 AI 詳解。",
        },
        { status: 401 },
      );
    }

    const body =
      (await request.json()) as ExplanationPayload;

    const source =
      normalizeSource(body.source);

    const questionKey =
      typeof body.questionKey === "string"
        ? body.questionKey.trim()
        : "";

    const sourceLabel =
      typeof body.sourceLabel === "string"
        ? body.sourceLabel.trim()
        : "";

    const stem =
      typeof body.stem === "string"
        ? body.stem.trim()
        : "";

    const options = Array.isArray(body.options)
      ? body.options.map((item) =>
          String(item ?? "").trim(),
        )
      : [];

    const correctIndex =
      typeof body.correctIndex === "number"
        ? body.correctIndex
        : null;

    if (
      !questionKey ||
      !stem ||
      options.length !== 4 ||
      correctIndex === null ||
      correctIndex < 0 ||
      correctIndex > 3
    ) {
      return NextResponse.json(
        {
          error:
            "這題缺少完整題幹、四個選項或單一正確答案，暫時無法產生 AI 詳解。",
        },
        { status: 400 },
      );
    }

    /*
     * 先查快取，避免同一題重複呼叫 OpenAI。
     * 國考：全站共用。
     * 教材：每個使用者自己的教材解析。
     */
    const cached =
      await readCachedExplanation({
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

      return NextResponse.json({
        cached: true,
        explanation: cached,
      });
    }

    const userAnswer =
      typeof body.userAnswer === "number"
        ? body.userAnswer
        : null;

    const correctLabel =
      `${String.fromCharCode(65 + correctIndex)}. ${options[correctIndex]}`;

    const userAnswerLabel =
      userAnswer === null ||
      userAnswer < 0 ||
      userAnswer > 3
        ? "未作答"
        : `${String.fromCharCode(65 + userAnswer)}. ${options[userAnswer]}`;

    const existingExplanation =
      typeof body.existingExplanation === "string"
        ? body.existingExplanation.trim()
        : "";

    /*
     * MedSlime AI 解析 Prompt
     *
     * 依照「訓練 MedSlime AI 解析」規範：
     * - 醫檢師國考學習解析助手
     * - 冷靜、清楚、像很會教人的學長姐
     * - 不過度鼓勵、不裝可愛、不責備
     * - 不把每題講成教科書
     * - 固定解析結構
     * - 專有名詞保留原文
     */
    const instructions = [
      "你是 MedSlime 的醫檢師國考學習解析助手。",
      "你的任務不是只告訴學生答案，而是幫他理解這題在考什麼、為什麼正解成立、其他選項錯在哪，以及下次遇到類似題型怎麼辨認。",
      "",
      "【語氣】",
      "冷靜、清楚、直接，像很會教人的學長姐。",
      "專業但不要僵硬。",
      "避免過度鼓勵、裝可愛、責備使用者、空泛稱讚。",
      "不要把每一題都寫成教科書長文。",
      "",
      "【專有名詞】",
      "一般敘述使用自然繁體中文。",
      "教材或國考常用的英文專有名詞請保留原文，不要擅自漢化或翻成不常見中文。",
      "例如 Beta-lactam 應保留 Beta-lactam。",
      "",
      "【固定解析結構】",
      "1. 這題在考什麼：一句到數句指出核心考點。",
      "2. 正確答案：直接指出正確選項與核心概念。",
      "3. 為什麼：用 2–4 句左右說清楚因果或判斷依據；若需要更長才能說清楚，可以適度增加。",
      "4. 其他選項為什麼錯：A、B、C、D 都要逐一處理，不要只寫『錯』；正確選項可簡短補充。",
      "5. 快速整理：整理 2–6 個最值得帶走的 bullet points。",
      "6. 國考記憶點：給一個能幫助下次辨認類似題目的重點。",
      "7. 常見陷阱：只有真的存在明顯陷阱才寫；如果沒有，commonTrap 必須回傳空字串，不准回 null、不准寫『無』。",
      "",
      "【排版與內容原則】",
      "單一概念、機轉、流程優先用短句與 bullet points，不要硬塞成長段落。",
      "比較型內容如果沒有必要，不要硬做表格。",
      "不要重複題幹。",
      "不要用沒有資訊量的句子湊篇幅。",
      "",
      "【正確性】",
      "題目提供的 correctIndex 是本系統的官方答案，必須以它為正解，不要自行改答案。",
      "若題目資訊本身不足以支持某個延伸細節，請保守表述，不要猜。",
      "不要捏造題目沒有提供的檢驗數值、機轉、疾病特徵或其他背景。",
      "",
      "【optionAnalysis】",
      "必須依序回傳 A、B、C、D 四項。",
      "label 請使用『A.』『B.』『C.』『D.』。",
      "explanation 說明該選項為何符合或不符合題目。",
      "",
      "【commonTrap】",
      "沒有明顯陷阱時一律回傳空字串 \"\"。",
    ].join("\n");

    const prompt = [
      `來源：${sourceLabel || source}`,
      `題目：${stem}`,
      "",
      "選項：",
      ...options.map(
        (option, index) =>
          `${String.fromCharCode(65 + index)}. ${option}`,
      ),
      "",
      `官方正確答案：${correctLabel}`,
      `使用者答案：${userAnswerLabel}`,
      `使用者是否標記不確定：${body.uncertain ? "是" : "否"}`,
      existingExplanation
        ? `教材產題時的簡短解析（僅供參考，不要原句照抄）：${existingExplanation}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
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
          instructions,
          input: prompt,
          text: {
            format: {
              type: "json_schema",
              name: "medslime_ai_explanation",
              strict: true,
              schema: explanationSchema,
            },
          },
        }),
      },
    );

    const openAIPayload =
      (await openAIResponse.json()) as OpenAIResponse;

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI explanation failed:",
        openAIPayload,
      );

      return NextResponse.json(
        {
          error:
            openAIPayload.error?.message ??
            `OpenAI 詳解失敗（HTTP ${openAIResponse.status}）。`,
        },
        { status: 502 },
      );
    }

    const outputText =
      getOutputText(openAIPayload);

    if (!outputText) {
      return NextResponse.json(
        {
          error:
            "OpenAI 已回應，但沒有取得可解析的詳解。",
        },
        { status: 502 },
      );
    }

    let explanation: ExplanationResult;

    try {
      explanation =
        JSON.parse(outputText) as ExplanationResult;
    } catch {
      return NextResponse.json(
        {
          error:
            "AI 詳解格式異常，請再試一次。",
        },
        { status: 502 },
      );
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

    return NextResponse.json({
      cached: false,
      explanation,
    });
  } catch (error) {
    console.error(
      "AI explanation route failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI 詳解發生未知錯誤。",
      },
      { status: 500 },
    );
  }
}
