import { NextRequest, NextResponse } from "next/server";

function cleanEnv(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/\u200B/g, "")
    .replace(/^["']|["']$/g, "");
}

function normalizeOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim());
}

function normalizeCorrectIndex(value: unknown): number | null {
  if (!Array.isArray(value) || value.length !== 1) return null;

  const answer = String(value[0] ?? "").trim().toUpperCase();

  const answerMap: Record<string, number> = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
  };

  return answerMap[answer] ?? null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstImageUrl(row: Record<string, unknown>) {
  const candidates = [
    row.question_image_url,
    row.image_url,
    row.cropped_image_url,
    row.original_image_url,
    row.question_crop_url,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeText(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/[()（）]/g, "")
    .replace(/[、，,。．·・]/g, "")
    .trim();
}

/*
 * 舊資料庫的 has_image_hint 有部分是由題目文字關鍵字推測，
 * 因此「心電圖變化」「心電圖圖形」這類純文字題也可能被誤判。
 *
 * 新版只把「明確要求看圖」的句型視為圖片題。
 * 若資料庫本身已有實際 image URL，也一定視為圖片題。
 */
function hasExplicitVisualReference(
  questionText: string,
  imageUrl: string | null,
) {
  if (imageUrl) return true;

  const text = questionText
    .replace(/\s+/g, "")
    .replace(/[「」『』]/g, "");

  const patterns = [
    /如下圖/,
    /如圖(?:\d+|[一二三四五六七八九十]+)?(?:所示|顯示|中|為)?/,
    /下圖(?:中|為|所示|顯示)?/,
    /上圖(?:中|為|所示|顯示)?/,
    /附圖(?:中|為|所示|顯示)?/,
    /圖(?:\d+|[一二三四五六七八九十]+)(?:中|為|所示|顯示)/,
    /圖中(?:所示|顯示|箭頭|標示)/,
    /圖示(?:中|為|所示)?/,
    /影像(?:中|如下|所示)/,
    /照片(?:中|如下|所示)/,
    /顯微鏡下(?:圖|影像|照片)/,
    /箭頭所指/,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

/*
 * 前端顯示名稱與舊 Supabase subject 文字不一定完全相同。
 * 不再用完整字串完全相等查 subject。
 * 改成先抓同年度＋同梯次的 6 科，再依科目關鍵字分類。
 */
function getSubjectKey(value: string) {
  const text = normalizeText(value);

  if (
    text.includes("微生物") ||
    text.includes("細菌") ||
    text.includes("黴菌")
  ) {
    return "microbiology";
  }

  if (
    text.includes("生物化學") ||
    text.includes("臨床生化")
  ) {
    return "biochemistry";
  }

  if (
    text.includes("生理") ||
    text.includes("病理")
  ) {
    return "physiology-pathology";
  }

  if (
    text.includes("血液") ||
    text.includes("血庫")
  ) {
    return "hematology-bloodbank";
  }

  if (
    text.includes("血清免疫") ||
    text.includes("臨床免疫") ||
    text.includes("病毒")
  ) {
    return "immunology-virology";
  }

  if (
    text.includes("分子檢驗") ||
    text.includes("鏡檢") ||
    text.includes("寄生蟲")
  ) {
    return "molecular-microscopy";
  }

  return text;
}

export async function GET(request: NextRequest) {
  try {
    const rocYear = Number(
      request.nextUrl.searchParams.get("year"),
    );
    const session = Number(
      request.nextUrl.searchParams.get("session"),
    );
    const requestedSubject = String(
      request.nextUrl.searchParams.get("subject") ?? "",
    ).trim();

    if (
      !Number.isFinite(rocYear) ||
      rocYear < 1 ||
      ![1, 2].includes(session) ||
      !requestedSubject
    ) {
      return NextResponse.json(
        {
          error: "缺少或無效的 year / session / subject。",
        },
        { status: 400 },
      );
    }

    const supabaseUrl = cleanEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
    const supabaseKey = cleanEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error: "Supabase 環境變數尚未設定完整。",
        },
        { status: 500 },
      );
    }

    let restUrl: URL;

    try {
      restUrl = new URL(
        "/rest/v1/national_exam_questions",
        supabaseUrl,
      );
    } catch {
      return NextResponse.json(
        {
          error: "Supabase URL 無法解析。",
        },
        { status: 500 },
      );
    }

    const examYear = rocYear + 1911;
    const examRound =
      session === 1 ? "第一次" : "第二次";

    restUrl.searchParams.set("select", "*");
    restUrl.searchParams.set(
      "exam_year",
      `eq.${examYear}`,
    );
    restUrl.searchParams.set(
      "exam_round",
      `eq.${examRound}`,
    );
    restUrl.searchParams.set(
      "order",
      "question_number.asc",
    );
    restUrl.searchParams.set("limit", "1000");

    const response = await fetch(
      restUrl.toString(),
      {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const rawText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Supabase REST 讀取失敗：HTTP ${response.status}`,
          details: rawText.slice(0, 1000),
        },
        { status: 500 },
      );
    }

    let data: unknown;

    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error: "Supabase 回傳內容不是有效 JSON。",
        },
        { status: 500 },
      );
    }

    const allRows = Array.isArray(data) ? data : [];
    const requestedKey =
      getSubjectKey(requestedSubject);

    const rows = allRows.filter((rawRow) => {
      const row =
        rawRow as Record<string, unknown>;
      const databaseSubject =
        asString(row.subject);

      return (
        getSubjectKey(databaseSubject) ===
        requestedKey
      );
    });

    if (rows.length === 0) {
      const availableSubjects =
        Array.from(
          new Set(
            allRows
              .map((rawRow) =>
                asString(
                  (
                    rawRow as Record<
                      string,
                      unknown
                    >
                  ).subject,
                ),
              )
              .filter(Boolean),
          ),
        );

      return NextResponse.json({
        meta: {
          rocYear,
          examYear,
          examRound,
          requestedSubject,
          count: 0,
          availableSubjects,
        },
        questions: [],
      });
    }

    const questions = rows
      .map((rawRow) => {
        const row =
          rawRow as Record<string, unknown>;

        const rawOptions =
          normalizeOptions(row.options);

        const sourceOnlyMode =
          asString(row.parse_status) !== "ok" ||
          rawOptions.length !== 4 ||
          rawOptions.some((option) => !option);

        const options = sourceOnlyMode
          ? ["A", "B", "C", "D"]
          : rawOptions;

        const questionNumber =
          asNumber(row.question_number);

        const questionText =
          asString(row.question).trim() ||
          `官方第 ${questionNumber} 題（題目內容請查看官方原題）`;

        const imageUrl = firstImageUrl(row);

        return {
          id: String(
            row.id ?? questionNumber,
          ),
          questionNumber,
          stem: questionText,
          options,
          correctIndex:
            normalizeCorrectIndex(
              row.correct_answers,
            ),
          sourceOnlyMode,

          // 不再直接相信舊的 row.has_image_hint，
          // 改用實際 image URL 或明確的看圖句型。
          hasImageHint:
            hasExplicitVisualReference(
              questionText,
              imageUrl,
            ),

          imageUrl,
          questionPdfUrl:
            asNullableString(
              row.question_pdf_url,
            ),
          sourcePageUrl:
            asNullableString(
              row.source_page_url,
            ),
          sourceUrl:
            asNullableString(
              row.source_page_url,
            ) ??
            asNullableString(
              row.question_pdf_url,
            ),
        };
      })
      .sort(
        (a, b) =>
          a.questionNumber -
          b.questionNumber,
      );

    return NextResponse.json({
      meta: {
        rocYear,
        examYear,
        examRound,
        requestedSubject,
        count: questions.length,
      },
      questions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `API 錯誤：${error.message}`
            : "API 錯誤：未知錯誤",
      },
      { status: 500 },
    );
  }
}
