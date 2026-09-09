import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTION_TAXONOMY_VERSION } from "@/lib/question-taxonomy";
import {
  getTaxonomySubjectKey,
  TOPIC_TAXONOMY_CATALOG,
} from "@/lib/topic-taxonomy-catalog";

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
};

type ClassificationItem = {
  id: string;
  topic: string;
  subtopic: string;
  concepts: string[];
  confidence: number;
  needsReview: boolean;
};

const classificationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      minItems: 1,
      maxItems: 25,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          topic: { type: "string" },
          subtopic: { type: "string" },
          concepts: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: { type: "string" },
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          needsReview: { type: "boolean" },
        },
        required: [
          "id",
          "topic",
          "subtopic",
          "concepts",
          "confidence",
          "needsReview",
        ],
      },
    },
  },
  required: ["items"],
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

function isAuthorized(request: NextRequest) {
  const configured = String(process.env.TAXONOMY_ADMIN_SECRET ?? "").trim();
  const supplied = String(request.headers.get("x-taxonomy-secret") ?? "").trim();
  return Boolean(configured && supplied && configured === supplied);
}

function normalizeConcepts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 6);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const statuses = ["pending", "classified", "needs_review"] as const;
    const counts = await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await admin
          .from("national_exam_questions")
          .select("id", { count: "exact", head: true })
          .eq("taxonomy_status", status);
        if (error) throw new Error(error.message);
        return [status, count ?? 0] as const;
      }),
    );

    return NextResponse.json({
      version: QUESTION_TAXONOMY_VERSION,
      counts: Object.fromEntries(counts),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Taxonomy status failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    const requestedLimit = Number(body.limit ?? 12);
    const limit = Math.max(1, Math.min(25, Math.floor(requestedLimit || 12)));
    const apiKey = String(process.env.OPENAI_API_KEY ?? "").trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 503 },
      );
    }

    const admin = createAdminClient();
    const { data: rows, error: readError } = await admin
      .from("national_exam_questions")
      .select("id,subject,question,options")
      .eq("taxonomy_status", "pending")
      .order("id", { ascending: true })
      .limit(limit);

    if (readError) throw new Error(`讀取待分類題目失敗：${readError.message}`);
    if (!rows?.length) {
      return NextResponse.json({
        version: QUESTION_TAXONOMY_VERSION,
        processed: 0,
        remaining: 0,
        message: "No pending questions.",
      });
    }

    const prepared = rows.map((row) => {
      const subject = String(row.subject ?? "").trim();
      const subjectKey = getTaxonomySubjectKey(subject);
      return {
        id: String(row.id),
        subject,
        subjectKey,
        allowedTopics: subjectKey ? TOPIC_TAXONOMY_CATALOG[subjectKey] : [],
        stem: String(row.question ?? "").trim(),
        options: Array.isArray(row.options)
          ? row.options.map((item) => String(item ?? "").trim())
          : [],
      };
    });

    const instructions = [
      "你是 MedSlime 醫檢師國考題庫的題目分類器。",
      "目標是建立穩定、可長期統計的 topic / subtopic / concepts，不是產生詳解。",
      "topic 必須從該題 allowedTopics 中原樣選一個，不可自行創造同義詞。",
      "subtopic 要比 topic 更具體，但避免過度細碎；同類題應盡量使用相同名稱。",
      "concepts 放 1–6 個真正被考到的關鍵概念，可保留常用英文、縮寫、菌名、基因名或檢驗名詞。",
      "若題幹不足、跨主題太強、allowedTopics 為空，或你對分類沒有把握，needsReview=true。",
      "confidence 代表對主題分類的信心，0 到 1。",
      "只根據提供的題幹與選項分類，不要補造題目沒有提供的資訊。",
    ].join("\n");

    const prompt = JSON.stringify(
      prepared.map((item) => ({
        id: item.id,
        subject: item.subject,
        allowedTopics: item.allowedTopics,
        question: item.stem,
        options: item.options,
      })),
    );

    const model =
      process.env.OPENAI_TAXONOMY_MODEL ??
      process.env.OPENAI_EXPLANATION_MODEL ??
      "gpt-5-mini";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "medslime_question_taxonomy",
            strict: true,
            schema: classificationSchema,
          },
        },
      }),
    });

    const raw = (await response.json()) as OpenAIResponse;
    if (!response.ok) {
      throw new Error(raw.error?.message ?? `OpenAI HTTP ${response.status}`);
    }

    const outputText = getOutputText(raw);
    if (!outputText) throw new Error("分類模型沒有回傳可解析內容。");

    const parsed = JSON.parse(outputText) as { items?: ClassificationItem[] };
    const returned = new Map(
      (parsed.items ?? []).map((item) => [String(item.id), item] as const),
    );

    const updates = [] as Array<{
      id: string;
      status: "classified" | "needs_review";
      topic: string;
      subtopic: string;
      concepts: string[];
      confidence: number;
    }>;

    for (const source of prepared) {
      const result = returned.get(source.id);
      if (!result) continue;

      const topic = String(result.topic ?? "").trim();
      const subtopic = String(result.subtopic ?? "").trim();
      const concepts = normalizeConcepts(result.concepts);
      const confidence = Math.min(1, Math.max(0, Number(result.confidence ?? 0)));
      const allowed = source.allowedTopics.includes(topic);
      const needsReview =
        result.needsReview ||
        !source.subjectKey ||
        !allowed ||
        !topic ||
        !subtopic ||
        concepts.length === 0 ||
        confidence < 0.65;
      const status = needsReview ? "needs_review" : "classified";

      const { error: updateError } = await admin
        .from("national_exam_questions")
        .update({
          topic,
          subtopic,
          concepts,
          taxonomy_status: status,
          taxonomy_confidence: confidence,
          taxonomy_version: QUESTION_TAXONOMY_VERSION,
          taxonomy_model: model,
          taxonomy_updated_at: new Date().toISOString(),
        })
        .eq("id", source.id);

      if (updateError) {
        throw new Error(`寫入題目 ${source.id} 分類失敗：${updateError.message}`);
      }

      updates.push({
        id: source.id,
        status,
        topic,
        subtopic,
        concepts,
        confidence,
      });
    }

    const { count: remaining, error: countError } = await admin
      .from("national_exam_questions")
      .select("id", { count: "exact", head: true })
      .eq("taxonomy_status", "pending");
    if (countError) throw new Error(countError.message);

    return NextResponse.json({
      version: QUESTION_TAXONOMY_VERSION,
      model,
      processed: updates.length,
      remaining: remaining ?? 0,
      updates,
    });
  } catch (error) {
    console.error("Taxonomy backfill failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Taxonomy backfill failed." },
      { status: 500 },
    );
  }
}
