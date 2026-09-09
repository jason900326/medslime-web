import { NextResponse } from "next/server";

const retiredResponse = () =>
  NextResponse.json(
    {
      error:
        "快速 AI 解析已整合到新版完整詳解流程，請使用完整詳解功能。",
      code: "AI_QUICK_EXPLANATION_RETIRED",
    },
    { status: 410 },
  );

export async function GET() {
  return retiredResponse();
}

export async function POST() {
  return retiredResponse();
}
