import { connection, NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const REVIEW_VERSION = "weak-topic-review-v2";

type ReviewFormat =
  | "comparison_table"
  | "steps"
  | "bullets"
  | "formula_rules"
  | "causal_chain"
  | "pattern_match";

type ReviewItem = {
  label: string;
  content: string;
};

type WeakTopicReview = {
  version: typeof REVIEW_VERSION;
  title: string;
  summary: string;
  format: ReviewFormat;
  items: ReviewItem[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

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

function cacheKey(subject: string, topic: string) {
  return [REVIEW_VERSION, subject, topic]
    .map((value) => encodeURIComponent(value))
    .join("::");
}

function normalizeReview(value: unknown): WeakTopicReview | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  const allowedFormats = new Set<ReviewFormat>([
    "comparison_table",
    "steps",
    "bullets",
    "formula_rules",
    "causal_chain",
    "pattern_match",
  ]);
  const format =
    typeof raw.format === "string" && allowedFormats.has(raw.format as ReviewFormat)
      ? (raw.format as ReviewFormat)
      : null;
  const items = Array.isArray(raw.items)
    ? raw.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const label = typeof row.label === "string" ? row.label.trim() : "";
          const content = typeof row.content === "string" ? row.content.trim() : "";
          if (!label || !content) return null;
          return { label, content } satisfies ReviewItem;
        })
        .filter((item): item is ReviewItem => Boolean(item))
        .slice(0, 6)
    : [];

  if (!title || !summary || !format || items.length < 2) return null;

  return {
    version: REVIEW_VERSION,
    title,
    summary,
    format,
    items,
  };
}

function parseReview(value: string) {
  try {
    return normalizeReview(JSON.parse(value));
  } catch {
    return null;
  }
}

async function hasActivePro(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("player_entitlements")
    .select("pro_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Pro 權限讀取失敗：${error.message}`);

  return Boolean(
    data?.pro_expires_at && new Date(data.pro_expires_at).getTime() > Date.now(),
  );
}

export async function GET(request: NextRequest) {
  try {
    await connection();
    const subject = request.nextUrl.searchParams.get("subject")?.trim() ?? "";
    const topic = request.nextUrl.searchParams.get("topic")?.trim() ?? "";

    if (!subject || !topic) {
      return NextResponse.json({ error: "缺少科目或主題。" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

    if (!(await hasActivePro(user.id))) {
      return NextResponse.json(
        { error: "快速弱點補強是 Pro 功能。", code: "PRO_REQUIRED" },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const key = cacheKey(subject, topic);
    const cached = await admin
      .from("shared_ai_explanations")
      .select("explanation")
      .eq("question_key", key)
      .maybeSingle();

    if (cached.error) throw new Error(`弱點補強 cache 讀取失敗：${cached.error.message}`);

    const cachedReview = normalizeReview(cached.data?.explanation);
    if (cachedReview) {
      return NextResponse.json({ review: cachedReview, cached: true });
    }

    const { data: questions, error: questionError } = await admin
      .from("national_exam_questions")
      .select("topic,subtopic,concepts,question")
      .eq("subject", subject)
      .eq("topic", topic)
      .eq("taxonomy_status", "classified")
      .limit(12);

    if (questionError) {
      throw new Error(`弱點題目資料讀取失敗：${questionError.message}`);
    }

    const evidence = (questions ?? [])
      .map((item) => {
        const row = item as {
          subtopic: string | null;
          concepts: string[] | null;
          question: string | null;
        };
        const concepts = Array.isArray(row.concepts) ? row.concepts.join("、") : "";
        return [
          row.subtopic ? `細分主題：${row.subtopic}` : "",
          concepts ? `考點：${concepts}` : "",
          row.question ? `題目：${row.question}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .filter(Boolean)
      .slice(0, 8)
      .join("\n\n");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "伺服器尚未設定 OPENAI_API_KEY。" }, { status: 500 });
    }

    const instructions = [
      "你是 MedSlime 的弱點補強編輯。使用者的弱點主題已由程式與作答資料決定，你只負責把這個主題整理成 1–3 分鐘可以讀完的複習內容。",
      "不要重新判斷使用者是否真的弱，也不要比較其他主題。",
      "使用繁體中文，語氣直接、清楚、專業。不要寫成完整教科書章節。",
      "summary 用 2–3 句話說清楚這個主題最該先掌握的核心。",
      "請依內容自動挑一種 format：比較題用 comparison_table；流程用 steps；單純記憶重點用 bullets；計算題用 formula_rules；機轉用 causal_chain；鑑別或看到線索要聯想到答案時用 pattern_match。",
      "items 產生 2–6 個最值得記住的單位。label 要短，content 要能獨立理解。comparison_table 用 label 放比較項目、content 放差異；steps 用 label 放步驟名稱；formula_rules 第一項可放核心公式；causal_chain 依因果順序排列；pattern_match 用 label 放『看到什麼』、content 放『想到什麼』。",
      "只能根據主題、考點與題目證據整理；證據不足時要保守，不要捏造數值、疾病特徵或機轉。",
    ].join("\n");

    const prompt = [
      `科目：${subject}`,
      `已確認弱點主題：${topic}`,
      evidence ? `歷屆題目與 taxonomy 證據：\n${evidence}` : "目前沒有足夠的題目證據。",
    ].join("\n\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_WEAK_TOPIC_MODEL ?? process.env.OPENAI_EXPLANATION_MODEL ?? "gpt-5-mini",
        store: false,
        instructions,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "medslime_weak_topic_review_v2",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                format: {
                  type: "string",
                  enum: [
                    "comparison_table",
                    "steps",
                    "bullets",
                    "formula_rules",
                    "causal_chain",
                    "pattern_match",
                  ],
                },
                items: {
                  type: "array",
                  minItems: 2,
                  maxItems: 6,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      label: { type: "string" },
                      content: { type: "string" },
                    },
                    required: ["label", "content"],
                  },
                },
              },
              required: ["title", "summary", "format", "items"],
            },
          },
        },
      }),
    });

    const payload = (await response.json()) as OpenAIResponse;
    if (!response.ok) {
      return NextResponse.json(
        { error: payload.output_text || "弱點補強內容生成失敗。" },
        { status: 502 },
      );
    }

    const review = parseReview(getOutputText(payload));
    if (!review) {
      return NextResponse.json({ error: "弱點補強內容格式無效。" }, { status: 502 });
    }

    const saved = await admin.from("shared_ai_explanations").upsert(
      {
        question_key: key,
        source: "weak-topic-review",
        source_label: `${subject} · ${topic}`,
        explanation: review,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "question_key" },
    );

    if (saved.error) throw new Error(`弱點補強 cache 儲存失敗：${saved.error.message}`);

    return NextResponse.json({ review, cached: false });
  } catch (error) {
    console.error("Weak topic review route failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "弱點補強內容讀取失敗。" },
      { status: 500 },
    );
  }
}
