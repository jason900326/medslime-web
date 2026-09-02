import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json(
      { error: "缺少 PDF URL。" },
      { status: 400 },
    );
  }

  let target: URL;

  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { error: "PDF URL 格式不正確。" },
      { status: 400 },
    );
  }

  if (!ALLOWED_PROTOCOLS.has(target.protocol)) {
    return NextResponse.json(
      { error: "不支援這個 PDF URL protocol。" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 MedSlime/1.0",
        Accept: "application/pdf,*/*",
      },
      cache: "force-cache",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `官方 PDF 下載失敗：HTTP ${response.status}`,
        },
        { status: 502 },
      );
    }

    const contentType =
      response.headers.get("content-type") ??
      "application/pdf";

    const bytes = await response.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType.includes("pdf")
          ? contentType
          : "application/pdf",
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `官方 PDF 下載失敗：${error.message}`
            : "官方 PDF 下載失敗。",
      },
      { status: 502 },
    );
  }
}
