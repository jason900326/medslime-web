import { NextRequest, NextResponse } from "next/server";

function cleanEnv(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/\u200B/g, "")
    .replace(/^["']|["']$/g, "");
}

export async function GET(request: NextRequest) {
  const pdfUrl = String(request.nextUrl.searchParams.get("pdfUrl") ?? "").trim();
  const questionNumber = Number(request.nextUrl.searchParams.get("questionNumber"));

  if (!pdfUrl || !Number.isInteger(questionNumber) || questionNumber < 1) {
    return NextResponse.json({ imageUrl: null }, { status: 400 });
  }

  const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ imageUrl: null }, { status: 500 });
  }

  try {
    const url = new URL("/rest/v1/national_exam_questions", supabaseUrl);
    url.searchParams.set("select", "image_url");
    url.searchParams.set("question_pdf_url", `eq.${pdfUrl}`);
    url.searchParams.set("question_number", `eq.${questionNumber}`);
    url.searchParams.set("image_url", "not.is.null");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ imageUrl: null }, { status: 200 });
    }

    const rows = (await response.json()) as Array<{ image_url?: unknown }>;
    const imageUrl =
      typeof rows?.[0]?.image_url === "string" && rows[0].image_url.trim()
        ? rows[0].image_url.trim()
        : null;

    return NextResponse.json({ imageUrl });
  } catch {
    // Static images are an optimization and reliability layer. The caller will
    // transparently fall back to the existing PDF renderer when lookup fails.
    return NextResponse.json({ imageUrl: null }, { status: 200 });
  }
}
