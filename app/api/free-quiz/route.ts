import { NextRequest, NextResponse } from "next/server";

function cleanEnv(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/\u200B/g, "")
    .replace(/^["']|["']$/g, "");
}

function normalizeText(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/[()（）]/g, "")
    .replace(/[、，,。．·・]/g, "")
    .trim();
}

function getSubjectKey(value: string) {
  const text = normalizeText(value);
  if (text.includes("微生物") || text.includes("細菌") || text.includes("黴菌")) return "microbiology";
  if (text.includes("生物化學") || text.includes("臨床生化")) return "biochemistry";
  if (text.includes("生理") || text.includes("病理")) return "physiology-pathology";
  if (text.includes("血液") || text.includes("血庫")) return "hematology-bloodbank";
  if (text.includes("血清免疫") || text.includes("臨床免疫") || text.includes("病毒")) return "immunology-virology";
  if (text.includes("分子檢驗") || text.includes("鏡檢") || text.includes("寄生蟲")) return "molecular-microscopy";
  return text;
}

function normalizeOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim());
}

function normalizeCorrectIndex(value: unknown): number | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const answer = String(value[0] ?? "").trim().toUpperCase();
  return ({ A: 0, B: 1, C: 2, D: 3 } as Record<string, number>)[answer] ?? null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
    /圖(?:\d+|[一二三四五六七八九十]+)(?:中|為|所示|顯示)/,
    /圖中(?:所示|顯示|箭頭|標示)/,
    /圖示(?:中|為|所示)?/,
    /影像(?:中|如下|所示)/,
    /照片(?:中|如下|所示)/,
    /顯微鏡下(?:圖|影像|照片)/,
    /箭頭所指/,
  ].some((pattern) => pattern.test(text));
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const fromRoc = Number(request.nextUrl.searchParams.get("from"));
    const toRoc = Number(request.nextUrl.searchParams.get("to"));
    const subject = String(request.nextUrl.searchParams.get("subject") ?? "").trim();
    const requestedCount = Number(request.nextUrl.searchParams.get("count"));

    if (
      !Number.isFinite(fromRoc) ||
      !Number.isFinite(toRoc) ||
      fromRoc < 1 ||
      toRoc < fromRoc ||
      toRoc - fromRoc > 20 ||
      !subject ||
      !Number.isFinite(requestedCount)
    ) {
      return NextResponse.json({ error: "自由測驗設定無效。" }, { status: 400 });
    }

    const count = Math.max(5, Math.min(80, Math.floor(requestedCount)));
    const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const supabaseKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase 環境變數尚未設定完整。" }, { status: 500 });
    }

    const restUrl = new URL("/rest/v1/national_exam_questions", supabaseUrl);
    restUrl.searchParams.set("select", "*");
    restUrl.searchParams.set("exam_year", `gte.${fromRoc + 1911}`);
    restUrl.searchParams.append("exam_year", `lte.${toRoc + 1911}`);
    restUrl.searchParams.set("order", "exam_year.desc,question_number.asc");
    restUrl.searchParams.set("limit", "5000");

    const response = await fetch(restUrl.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const rawText = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: `Supabase REST 讀取失敗：HTTP ${response.status}`, details: rawText.slice(0, 800) },
        { status: 500 },
      );
    }

    const data = JSON.parse(rawText) as unknown;
    const rows = (Array.isArray(data) ? data : []).filter((rawRow) => {
      const row = rawRow as Record<string, unknown>;
      return getSubjectKey(asString(row.subject)) === getSubjectKey(subject);
    });

    const candidates = rows
      .map((rawRow) => {
        const row = rawRow as Record<string, unknown>;
        const actualQuestionNumber = asNumber(row.question_number);
        const rawOptions = normalizeOptions(row.options);
        const sourceOnlyMode =
          asString(row.parse_status) !== "ok" ||
          rawOptions.length !== 4 ||
          rawOptions.some((option) => !option);
        const options = sourceOnlyMode ? ["A", "B", "C", "D"] : rawOptions;
        const stem = asString(row.question).trim() || `官方第 ${actualQuestionNumber} 題（題目內容請查看官方原題）`;
        const imageUrl = firstImageUrl(row);
        const gregorianYear = asNumber(row.exam_year);
        const sourceYear = String(Math.max(1, gregorianYear - 1911));
        const round = asString(row.exam_round);
        const sourceSession = round.includes("第二") ? "2" : "1";

        return {
          id: String(row.id ?? `${gregorianYear}-${sourceSession}-${actualQuestionNumber}`),
          questionNumber: 0,
          sourceQuestionNumber: actualQuestionNumber,
          sourceYear,
          sourceSession,
          sourceSubject: asString(row.subject).trim() || subject,
          stem,
          options,
          correctIndex: normalizeCorrectIndex(row.correct_answers),
          sourceOnlyMode,
          hasImageHint: hasExplicitVisualReference(stem, imageUrl),
          imageUrl,
          questionPdfUrl: asNullableString(row.question_pdf_url),
          sourcePageUrl: asNullableString(row.source_page_url),
          sourceUrl:
            asNullableString(row.source_page_url) ?? asNullableString(row.question_pdf_url),
        };
      })
      .filter((item) => item.sourceQuestionNumber > 0);

    if (candidates.length === 0) {
      return NextResponse.json({
        error: "這個年份範圍與科目目前找不到可用題目。",
      }, { status: 404 });
    }

    const selected = shuffle(candidates)
      .slice(0, Math.min(count, candidates.length))
      .map((item, index) => ({ ...item, questionNumber: index + 1 }));

    return NextResponse.json({
      meta: {
        from: fromRoc,
        to: toRoc,
        subject,
        requestedCount: count,
        count: selected.length,
        availableCount: candidates.length,
      },
      questions: selected,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? `API 錯誤：${error.message}` : "API 錯誤：未知錯誤" },
      { status: 500 },
    );
  }
}
