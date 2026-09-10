import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTION_TAXONOMY_VERSION } from "@/lib/question-taxonomy";
import {
  getAllowedSubtopics,
  getAllowedTaxonomy,
  getTaxonomySubjectKey,
  type TaxonomySubjectKey,
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

type ClassificationMode = "queue" | "calibration";
type SourceRow = Record<string, unknown>;

const TAXONOMY_SUBJECT_KEYS: TaxonomySubjectKey[] = [
  "biochemistry",
  "microbiology",
  "physiology-pathology",
  "hematology-bloodbank",
  "immunology-virology",
  "molecular-microscopy",
];

const SUBJECT_SCAN_PAGE_SIZE = 200;

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
            maxItems: 3,
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

function isTaxonomySubjectKey(value: string): value is TaxonomySubjectKey {
  return TAXONOMY_SUBJECT_KEYS.includes(value as TaxonomySubjectKey);
}

function normalizeConcepts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 3);
}

function normalizeCorrectAnswers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim().toUpperCase())
    .filter((item) => /^[A-D]$/.test(item));
}

function firstImageUrl(row: SourceRow) {
  const candidates = [
    row.question_image_url,
    row.image_url,
    row.cropped_image_url,
    row.original_image_url,
    row.question_crop_url,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function hasExplicitVisualReference(questionText: string, imageUrl: string | null) {
  if (imageUrl) return true;
  const text = questionText.replace(/\s+/g, "").replace(/[「」『』]/g, "");
  return [
    /如下圖/,
    /如圖(?:\d+|[一二三四五六七八九十]+)?(?:所示|顯示|中|為)?/,
    /下圖(?:中|為|所示|顯示)?/,
    /上圖(?:中|為|所示|顯示)?/,
    /附圖(?:中|為|所示|顯示)?/,
    /此圖(?:中|為|所示|顯示)?/,
    /這張圖/,
    /圖(?:\d+|[一二三四五六七八九十]+)(?:中|為|所示|顯示)/,
    /圖中(?:所示|顯示|箭頭|標示)/,
    /圖示(?:中|為|所示)?/,
    /影像(?:中|如下|所示)/,
    /照片(?:中|如下|所示)/,
    /顯微鏡下(?:圖|影像|照片)/,
    /箭頭所指/,
    /(?:這張|此張|下列)心電圖/,
    /(?:這張|此張|下列)腦波圖/,
    /(?:這張|此張|下列)血球圖/,
  ].some((pattern) => pattern.test(text));
}

async function scanRowsForSubject(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    subjectKey: TaxonomySubjectKey;
    limit: number;
    state: "pending" | "outdated";
    ascending: boolean;
  },
) {
  const rows: SourceRow[] = [];
  let offset = 0;

  while (rows.length < input.limit) {
    let query = admin
      .from("national_exam_questions")
      .select("*")
      .order("id", { ascending: input.ascending })
      .range(offset, offset + SUBJECT_SCAN_PAGE_SIZE - 1);

    if (input.state === "pending") {
      query = query.eq("taxonomy_status", "pending");
    } else {
      query = query
        .neq("taxonomy_status", "pending")
        .not("taxonomy_version", "is", null)
        .neq("taxonomy_version", QUESTION_TAXONOMY_VERSION);
    }

    const { data, error } = await query;
    if (error) {
      const label = input.state === "pending" ? "待分類" : "舊版分類";
      throw new Error(`讀取${label}題目失敗：${error.message}`);
    }

    const page = (data ?? []) as SourceRow[];
    for (const row of page) {
      if (getTaxonomySubjectKey(String(row.subject ?? "")) === input.subjectKey) {
        rows.push(row);
        if (rows.length >= input.limit) break;
      }
    }

    if (page.length < SUBJECT_SCAN_PAGE_SIZE) break;
    offset += SUBJECT_SCAN_PAGE_SIZE;
  }

  return rows.slice(0, input.limit);
}

function dedupeRows(rows: SourceRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = String(row.id ?? "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function loadClassificationRows(
  admin: ReturnType<typeof createAdminClient>,
  limit: number,
  subjectKey: TaxonomySubjectKey | null,
  mode: ClassificationMode,
) {
  if (!subjectKey) {
    const { data: outdatedRows, error: outdatedError } = await admin
      .from("national_exam_questions")
      .select("*")
      .neq("taxonomy_status", "pending")
      .not("taxonomy_version", "is", null)
      .neq("taxonomy_version", QUESTION_TAXONOMY_VERSION)
      .order("id", { ascending: false })
      .limit(limit);

    if (outdatedError) {
      throw new Error(`讀取舊版分類題目失敗：${outdatedError.message}`);
    }

    const rows = [...((outdatedRows ?? []) as SourceRow[])];
    const remainingSlots = Math.max(0, limit - rows.length);
    if (remainingSlots === 0) return rows;

    const { data: pendingRows, error: pendingError } = await admin
      .from("national_exam_questions")
      .select("*")
      .eq("taxonomy_status", "pending")
      .order("id", { ascending: true })
      .limit(remainingSlots);

    if (pendingError) {
      throw new Error(`讀取待分類題目失敗：${pendingError.message}`);
    }

    return [...rows, ...((pendingRows ?? []) as SourceRow[])];
  }

  const outdatedRows = await scanRowsForSubject(admin, {
    subjectKey,
    limit,
    state: "outdated",
    ascending: false,
  });
  const remainingSlots = Math.max(0, limit - outdatedRows.length);
  if (remainingSlots === 0) return outdatedRows;

  if (mode === "queue") {
    const pendingRows = await scanRowsForSubject(admin, {
      subjectKey,
      limit: remainingSlots,
      state: "pending",
      ascending: true,
    });
    return dedupeRows([...outdatedRows, ...pendingRows]).slice(0, limit);
  }

  const olderTarget = Math.ceil(remainingSlots / 2);
  const newerTarget = Math.floor(remainingSlots / 2);
  const [oldestPending, newestPending] = await Promise.all([
    scanRowsForSubject(admin, {
      subjectKey,
      limit: olderTarget,
      state: "pending",
      ascending: true,
    }),
    scanRowsForSubject(admin, {
      subjectKey,
      limit: newerTarget,
      state: "pending",
      ascending: false,
    }),
  ]);

  let rows = dedupeRows([...outdatedRows, ...oldestPending, ...newestPending]);
  if (rows.length < limit) {
    const fallback = await scanRowsForSubject(admin, {
      subjectKey,
      limit,
      state: "pending",
      ascending: true,
    });
    rows = dedupeRows([...rows, ...fallback]);
  }

  return rows.slice(0, limit);
}

async function getRemainingCounts(admin: ReturnType<typeof createAdminClient>) {
  const [pendingResult, outdatedResult] = await Promise.all([
    admin
      .from("national_exam_questions")
      .select("id", { count: "exact", head: true })
      .eq("taxonomy_status", "pending"),
    admin
      .from("national_exam_questions")
      .select("id", { count: "exact", head: true })
      .neq("taxonomy_status", "pending")
      .not("taxonomy_version", "is", null)
      .neq("taxonomy_version", QUESTION_TAXONOMY_VERSION),
  ]);

  if (pendingResult.error) throw new Error(pendingResult.error.message);
  if (outdatedResult.error) throw new Error(outdatedResult.error.message);

  const pending = pendingResult.count ?? 0;
  const outdated = outdatedResult.count ?? 0;
  return { pending, outdated, total: pending + outdated };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const [pendingResult, classifiedResult, needsReviewResult, outdatedResult] =
      await Promise.all([
        admin
          .from("national_exam_questions")
          .select("id", { count: "exact", head: true })
          .eq("taxonomy_status", "pending"),
        admin
          .from("national_exam_questions")
          .select("id", { count: "exact", head: true })
          .eq("taxonomy_status", "classified")
          .eq("taxonomy_version", QUESTION_TAXONOMY_VERSION),
        admin
          .from("national_exam_questions")
          .select("id", { count: "exact", head: true })
          .eq("taxonomy_status", "needs_review")
          .eq("taxonomy_version", QUESTION_TAXONOMY_VERSION),
        admin
          .from("national_exam_questions")
          .select("id", { count: "exact", head: true })
          .neq("taxonomy_status", "pending")
          .not("taxonomy_version", "is", null)
          .neq("taxonomy_version", QUESTION_TAXONOMY_VERSION),
      ]);

    for (const result of [
      pendingResult,
      classifiedResult,
      needsReviewResult,
      outdatedResult,
    ]) {
      if (result.error) throw new Error(result.error.message);
    }

    return NextResponse.json({
      version: QUESTION_TAXONOMY_VERSION,
      calibrationSubjectKeys: TAXONOMY_SUBJECT_KEYS,
      counts: {
        pending: pendingResult.count ?? 0,
        classified: classifiedResult.count ?? 0,
        needs_review: needsReviewResult.count ?? 0,
        outdated: outdatedResult.count ?? 0,
      },
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
    const body = (await request.json().catch(() => ({}))) as {
      limit?: number;
      subjectKey?: string;
      mode?: string;
    };
    const requestedLimit = Number(body.limit ?? 12);
    const limit = Math.max(1, Math.min(25, Math.floor(requestedLimit || 12)));
    const requestedSubjectKey = String(body.subjectKey ?? "").trim();
    const subjectKey = requestedSubjectKey
      ? isTaxonomySubjectKey(requestedSubjectKey)
        ? requestedSubjectKey
        : null
      : null;
    const mode: ClassificationMode = body.mode === "calibration" ? "calibration" : "queue";

    if (requestedSubjectKey && !subjectKey) {
      return NextResponse.json(
        {
          error: "Unknown taxonomy subjectKey.",
          allowedSubjectKeys: TAXONOMY_SUBJECT_KEYS,
        },
        { status: 400 },
      );
    }
    if (mode === "calibration" && !subjectKey) {
      return NextResponse.json(
        {
          error: "Calibration mode requires subjectKey.",
          allowedSubjectKeys: TAXONOMY_SUBJECT_KEYS,
        },
        { status: 400 },
      );
    }

    const apiKey = String(process.env.OPENAI_API_KEY ?? "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 503 },
      );
    }

    const admin = createAdminClient();
    const rows = await loadClassificationRows(admin, limit, subjectKey, mode);

    if (!rows.length) {
      const remaining = await getRemainingCounts(admin);
      return NextResponse.json({
        version: QUESTION_TAXONOMY_VERSION,
        mode,
        subjectKey,
        processed: 0,
        remaining: remaining.total,
        remainingPending: remaining.pending,
        remainingOutdated: remaining.outdated,
        message: subjectKey
          ? `No ${subjectKey} questions need classification for the current taxonomy version.`
          : "No questions need classification for the current taxonomy version.",
      });
    }

    const prepared = rows.map((row) => {
      const subject = String(row.subject ?? "").trim();
      const rowSubjectKey = getTaxonomySubjectKey(subject);
      const stem = String(row.question ?? "").trim();
      const options = Array.isArray(row.options)
        ? row.options.map((item) => String(item ?? "").trim())
        : [];
      const visualDependent = hasExplicitVisualReference(stem, firstImageUrl(row));

      return {
        id: String(row.id),
        examYear: row.exam_year ?? null,
        examRound: String(row.exam_round ?? "").trim() || null,
        questionNumber: Number.isFinite(Number(row.question_number))
          ? Number(row.question_number)
          : null,
        subject,
        subjectKey: rowSubjectKey,
        allowedTaxonomy: rowSubjectKey ? getAllowedTaxonomy(rowSubjectKey) : [],
        stem,
        options,
        correctAnswers: normalizeCorrectAnswers(row.correct_answers),
        visualDependent,
        previousVersion:
          typeof row.taxonomy_version === "string" ? row.taxonomy_version : null,
      };
    });

    const instructions = [
      "你是 MedSlime 醫檢師國考題庫的題目分類器。",
      "目標是建立穩定、可長期統計的 topic / subtopic / concepts，不是產生詳解。",
      "topic 必須從該題 allowedTaxonomy 的 topic 中原樣選一個，不可自行創造同義詞。",
      "subtopic 也必須從所選 topic 對應的 subtopics 中原樣選一個，不可自行創造新名稱。",
      "若沒有精準符合的 subtopic，選『其他』並把 needsReview 設為 true。",
      "concepts 只放 1–3 個『答對這題真正需要掌握的知識點』。",
      "不要因為某個名詞出現在錯誤選項或干擾選項就把它列入 concepts。",
      "若提供 correctAnswers，請利用正確答案辨別核心考點與 distractors；除非題目本身就是在比較多個鑑別項目，否則不要把錯誤選項列成 concepts。",
      "若 visualDependent=true，代表題目需要心電圖、腦波、顯微圖、照片或其他未提供給你的影像才能完成細節判讀；此時仍可選最合理的固定 topic/subtopic，但 needsReview 必須為 true。",
      "若題幹不足、跨主題太強、allowedTaxonomy 為空，或你對分類沒有把握，needsReview=true。",
      "confidence 代表對 topic/subtopic 分類的信心，0 到 1。",
      "只根據提供的題幹、選項與正確答案分類，不要補造題目沒有提供的資訊。",
    ].join("\n");

    const prompt = JSON.stringify(
      prepared.map((item) => ({
        id: item.id,
        subject: item.subject,
        allowedTaxonomy: item.allowedTaxonomy,
        question: item.stem,
        options: item.options.map((option, index) => ({
          label: String.fromCharCode(65 + index),
          text: option,
        })),
        correctAnswers: item.correctAnswers,
        visualDependent: item.visualDependent,
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
      examYear: unknown;
      examRound: string | null;
      questionNumber: number | null;
      subject: string;
      subjectKey: TaxonomySubjectKey | null;
      question: string;
      status: "classified" | "needs_review";
      topic: string;
      subtopic: string;
      concepts: string[];
      confidence: number;
      visualDependent: boolean;
      previousVersion: string | null;
    }>;

    for (const source of prepared) {
      const result = returned.get(source.id);
      if (!result) continue;

      const topic = String(result.topic ?? "").trim();
      const subtopic = String(result.subtopic ?? "").trim();
      const concepts = normalizeConcepts(result.concepts);
      const confidence = Math.min(1, Math.max(0, Number(result.confidence ?? 0)));
      const allowedTopics = source.allowedTaxonomy.map((item) => item.topic);
      const allowedTopic = allowedTopics.includes(topic);
      const allowedSubtopics =
        source.subjectKey && allowedTopic
          ? getAllowedSubtopics(source.subjectKey, topic)
          : [];
      const allowedSubtopic = allowedSubtopics.includes(subtopic);
      const needsReview =
        result.needsReview ||
        source.visualDependent ||
        !source.subjectKey ||
        !allowedTopic ||
        !allowedSubtopic ||
        subtopic === "其他" ||
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
        examYear: source.examYear,
        examRound: source.examRound,
        questionNumber: source.questionNumber,
        subject: source.subject,
        subjectKey: source.subjectKey,
        question: source.stem,
        status,
        topic,
        subtopic,
        concepts,
        confidence,
        visualDependent: source.visualDependent,
        previousVersion: source.previousVersion,
      });
    }

    const remaining = await getRemainingCounts(admin);

    return NextResponse.json({
      version: QUESTION_TAXONOMY_VERSION,
      model,
      mode,
      subjectKey,
      processed: updates.length,
      remaining: remaining.total,
      remainingPending: remaining.pending,
      remainingOutdated: remaining.outdated,
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
