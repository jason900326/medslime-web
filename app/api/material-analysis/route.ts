import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";


type MaterialRequest = {
  fileName?: string;
  text?: string;
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

const materialSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    analysis: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        keyPoints: {
          type: "array",
          minItems: 3,
          maxItems: 8,
          items: { type: "string" },
        },
      },
      required: ["title", "summary", "keyPoints"],
    },
    questions: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          stem: { type: "string" },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "string" },
          },
          answer: {
            type: "integer",
            minimum: 0,
            maximum: 3,
          },
          explanation: { type: "string" },
          sourcePage: {
            type: ["integer", "null"],
            minimum: 1,
          },
        },
        required: [
          "stem",
          "options",
          "answer",
          "explanation",
          "sourcePage",
        ],
      },
    },
  },
  required: ["analysis", "questions"],
} as const;

function getOutputText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
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

function normalizeText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}


function normalizedForFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/\[page\s+\d+\]/gi, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fnv1a64(value: string) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return hash;
}

function similarityHash(value: string) {
  const normalized = normalizedForFingerprint(value);
  const tokens = normalized.split(" ").filter(Boolean);
  const usable =
    tokens.length > 200
      ? tokens
      : Array.from(
          { length: Math.max(0, normalized.length - 11) },
          (_, index) => normalized.slice(index, index + 12),
        ).filter((_, index) => index % 4 === 0);

  const vector = new Int32Array(64);

  for (const token of usable.slice(0, 12_000)) {
    const hash = fnv1a64(token);

    for (let bit = 0; bit < 64; bit += 1) {
      const enabled = (hash & (1n << BigInt(bit))) !== 0n;
      vector[bit] += enabled ? 1 : -1;
    }
  }

  let result = 0n;

  for (let bit = 0; bit < 64; bit += 1) {
    if (vector[bit] >= 0) {
      result |= 1n << BigInt(bit);
    }
  }

  return result.toString(16).padStart(16, "0");
}

function hammingDistanceHex(a: string, b: string) {
  try {
    let xor = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
    let count = 0;

    while (xor > 0n) {
      count += Number(xor & 1n);
      xor >>= 1n;
    }

    return count;
  } catch {
    return 64;
  }
}

type CachedMaterialRow = {
  similarity_hash: string;
  char_count: number;
  analysis: unknown;
  questions: unknown;
};

async function findCachedMaterial(
  userId: string,
  contentHash: string,
  simHash: string,
  charCount: number,
) {
  const supabase = await createServerSupabaseClient();

  const { data: exact, error: exactError } = await supabase
    .from("material_analysis_cache")
    .select("analysis, questions")
    .eq("user_id", userId)
    .eq("content_hash", contentHash)
    .maybeSingle();

  if (!exactError && exact?.analysis && exact?.questions) {
    return {
      analysis: exact.analysis,
      questions: exact.questions,
      cache: { hit: true, type: "exact" },
    };
  }

  const minLength = Math.max(1, Math.floor(charCount * 0.85));
  const maxLength = Math.ceil(charCount * 1.15);

  const { data: candidates, error: similarError } = await supabase
    .from("material_analysis_cache")
    .select("similarity_hash, char_count, analysis, questions")
    .eq("user_id", userId)
    .gte("char_count", minLength)
    .lte("char_count", maxLength)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (similarError || !Array.isArray(candidates)) {
    return null;
  }

  const similar = (candidates as CachedMaterialRow[])
    .map((item) => ({
      item,
      distance: hammingDistanceHex(item.similarity_hash, simHash),
    }))
    .sort((a, b) => a.distance - b.distance)
    .find(({ distance }) => distance <= 5);

  if (!similar?.item.analysis || !similar.item.questions) {
    return null;
  }

  return {
    analysis: similar.item.analysis,
    questions: similar.item.questions,
    cache: { hit: true, type: "similar", distance: similar.distance },
  };
}

async function saveMaterialCache(input: {
  userId: string;
  fileName: string;
  extractedText: string;
  contentHash: string;
  simHash: string;
  charCount: number;
  analysis: unknown;
  questions: unknown;
}) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("material_analysis_cache")
    .upsert(
      {
        user_id: input.userId,
        file_name: input.fileName,
        extracted_text: input.extractedText,
        content_hash: input.contentHash,
        similarity_hash: input.simHash,
        char_count: input.charCount,
        analysis: input.analysis,
        questions: input.questions,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,content_hash",
      },
    );

  if (error) {
    console.error("儲存教材分析快取失敗：", error);
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "伺服器尚未設定 OPENAI_API_KEY。請先在 .env.local 加入 OpenAI API Key。",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as MaterialRequest;
    const fileName =
      typeof body.fileName === "string" && body.fileName.trim()
        ? body.fileName.trim()
        : "教材.pdf";

    const sourceText =
      typeof body.text === "string" ? normalizeText(body.text) : "";

    if (sourceText.length < 300) {
      return NextResponse.json(
        {
          error:
            "這份 PDF 可讀取的文字太少。若教材主要是掃描圖片，目前這一版還不支援 OCR。",
        },
        { status: 400 },
      );
    }

    // 避免把超長教材一次全部送進模型。前端也會限制一次，
    // 這裡再做第二層保護。
    const clippedText = sourceText.slice(0, 120_000);
    const normalizedText = normalizedForFingerprint(clippedText);
    const contentHash = await sha256Hex(normalizedText);
    const simHash = similarityHash(normalizedText);
    const charCount = normalizedText.length;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const cached = await findCachedMaterial(
        user.id,
        contentHash,
        simHash,
        charCount,
      );

      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const instructions = [
      "你是 MedSlime 的教材分析與測驗產生器。",
      "只能根據使用者提供的教材內容作答，不可用外部知識補空缺。",
      "若教材本身沒有支持某個細節，不要把該細節寫進題目或解析。",
      "保留教材中的英文專有名詞，不要擅自翻譯成不常用中文名稱。",
      "例如 Beta-lactam 應維持 Beta-lactam，而不是自行改成其他翻譯。",
      "請產生恰好 10 題四選一單選題。",
      "題目應涵蓋教材的重要觀念、機制、比較與容易混淆之處，避免只考瑣碎字面。",
      "每題只有一個最佳答案。",
      "錯誤選項要合理，但不能靠教材以外資訊才能判斷。",
      "explanation 要簡潔說明正確答案為何正確，必要時指出關鍵辨別點。",
      "教材文字中含有 [Page N] 標記；若能明確定位題目主要依據頁面，sourcePage 填 N，否則填 null。",
      "summary 請用繁體中文，keyPoints 每點簡短明確。",
    ].join("\n");

    const userPrompt = [
      `教材檔名：${fileName}`,
      "",
      "以下是從 PDF 擷取出的教材文字：",
      "----- MATERIAL START -----",
      clippedText,
      "----- MATERIAL END -----",
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MATERIAL_MODEL ?? "gpt-5-mini",
        store: false,
        instructions,
        input: userPrompt,
        text: {
          format: {
            type: "json_schema",
            name: "medslime_material_quiz",
            strict: true,
            schema: materialSchema,
          },
        },
      }),
    });

    const payload = (await response.json()) as OpenAIResponse;

    if (!response.ok) {
      console.error("OpenAI material analysis failed:", payload);
      return NextResponse.json(
        {
          error:
            payload.error?.message ??
            `OpenAI 教材分析失敗（HTTP ${response.status}）。`,
        },
        { status: 502 },
      );
    }

    const outputText = getOutputText(payload);

    if (!outputText) {
      console.error("OpenAI response has no output text:", payload);
      return NextResponse.json(
        { error: "OpenAI 已回應，但沒有取得可解析的教材分析結果。" },
        { status: 502 },
      );
    }

    let result: unknown;

    try {
      result = JSON.parse(outputText);
    } catch (error) {
      console.error("Material JSON parse failed:", error, outputText);
      return NextResponse.json(
        { error: "教材分析結果格式異常，請再試一次。" },
        { status: 502 },
      );
    }

    if (
      user &&
      result &&
      typeof result === "object" &&
      "analysis" in result &&
      "questions" in result
    ) {
      const typedResult = result as {
        analysis: unknown;
        questions: unknown;
      };

      await saveMaterialCache({
        userId: user.id,
        fileName,
        extractedText: clippedText,
        contentHash,
        simHash,
        charCount,
        analysis: typedResult.analysis,
        questions: typedResult.questions,
      });
    }

    return NextResponse.json({
      ...(result as Record<string, unknown>),
      cache: { hit: false, type: "new" },
    });
  } catch (error) {
    console.error("Material analysis route failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "教材分析發生未知錯誤。",
      },
      { status: 500 },
    );
  }
}
