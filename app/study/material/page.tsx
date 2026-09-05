"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/top-bar";
import { useAuthUser } from "@/hooks/use-auth-user";

type AnalysisState = "idle" | "reading" | "analyzing" | "ready" | "error";

type GeneratedQuestion = {
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  sourcePage: number | null;
};

type MaterialAnalysisResult = {
  analysis: {
    title: string;
    summary: string;
    keyPoints: string[];
  };
  questions: GeneratedQuestion[];
};

const QUIZ_STORAGE_KEY = "medslime_material_quiz_v2";
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const DAILY_ANALYSIS_LIMIT = 5;
const MATERIAL_USAGE_PREFIX = "medslime_material_usage_v1";

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getUsageStorageKey(userId: string | null) {
  return `${MATERIAL_USAGE_PREFIX}:${userId ?? "anonymous"}:${getLocalDateKey()}`;
}

function readDailyUsage(userId: string | null) {
  try {
    const value = Number(localStorage.getItem(getUsageStorageKey(userId)) ?? "0");
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch {
    return 0;
  }
}

function incrementDailyUsage(userId: string | null) {
  try {
    const key = getUsageStorageKey(userId);
    const next = readDailyUsage(userId) + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch {
    return 0;
  }
}

async function readPdfText(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const stream = page.streamTextContent();
      const reader = stream.getReader();
      const parts: string[] = [];

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          if (value?.items && Array.isArray(value.items)) {
            for (const item of value.items) {
              if (
                item &&
                typeof item === "object" &&
                "str" in item &&
                typeof item.str === "string"
              ) {
                const text = item.str.trim();
                if (text) parts.push(text);
              }
            }
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // iPad Safari 某些版本 releaseLock 失敗不影響已讀到的文字。
        }
      }

      const pageText = parts.join(" ").replace(/\s+/g, " ").trim();
      if (pageText) pages.push(`[Page ${pageNumber}]\n${pageText}`);
    }
  } finally {
    await loadingTask.destroy();
  }

  return pages.join("\n\n");
}

export default function MaterialPage() {
  const router = useRouter();
  const auth = useAuthUser();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [result, setResult] = useState<MaterialAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [dailyUsage, setDailyUsage] = useState(0);

  useEffect(() => {
    setFile(null);
    setAnalysisState("idle");
    setResult(null);
    setErrorMessage("");

    try {
      sessionStorage.removeItem(QUIZ_STORAGE_KEY);
    } catch {
      // sessionStorage 不可用時不影響頁面顯示。
    }

    if (inputRef.current) inputRef.current.value = "";
  }, []);

  useEffect(() => {
    setDailyUsage(readDailyUsage(auth.userId ?? null));
  }, [auth.userId]);

  const chooseFile = () => inputRef.current?.click();

  const resetFile = () => {
    setFile(null);
    setAnalysisState("idle");
    setResult(null);
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";

    try {
      sessionStorage.removeItem(QUIZ_STORAGE_KEY);
    } catch {
      // 不影響重新選檔。
    }
  };

  const setSelectedFile = (selected: File | null) => {
    setAnalysisState("idle");
    setResult(null);
    setErrorMessage("");

    if (!selected) {
      setFile(null);
      return;
    }

    const isPdf =
      selected.type === "application/pdf" ||
      selected.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setFile(null);
      setErrorMessage("目前只支援 PDF 教材。");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (selected.size > MAX_PDF_BYTES) {
      setFile(null);
      setErrorMessage("PDF 單檔上限為 10 MB，請壓縮或拆分後再上傳。");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFile(selected);
  };

  const analyzeFile = async () => {
    if (!file || analysisState === "reading" || analysisState === "analyzing") return;

    const usedToday = readDailyUsage(auth.userId ?? null);
    if (usedToday >= DAILY_ANALYSIS_LIMIT) {
      setErrorMessage(`今天已使用 ${DAILY_ANALYSIS_LIMIT} 次教材 AI 分析，明天再繼續。`);
      setAnalysisState("error");
      return;
    }

    setErrorMessage("");
    setResult(null);

    try {
      setAnalysisState("reading");
      const extractedText = await readPdfText(file);

      if (extractedText.trim().length < 300) {
        throw new Error("這份 PDF 目前讀不到足夠的文字。可以換一份文字型 PDF 再試一次。");
      }

      setAnalysisState("analyzing");

      const response = await fetch("/api/material-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          text: extractedText.slice(0, 120_000),
        }),
      });

      const payload = (await response.json()) as
        | MaterialAnalysisResult
        | { error?: string };

      if (!response.ok || !("analysis" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "教材分析失敗，請再試一次。",
        );
      }

      if (!Array.isArray(payload.questions) || payload.questions.length !== 10) {
        throw new Error("AI 沒有產生完整的 10 題測驗，請再分析一次。");
      }

      const nextResult: MaterialAnalysisResult = {
        analysis: payload.analysis,
        questions: payload.questions.map((question) => ({
          stem: question.stem,
          options: question.options,
          answer: question.answer,
          explanation: question.explanation,
          sourcePage: question.sourcePage,
        })),
      };

      setResult(nextResult);
      const nextUsage = incrementDailyUsage(auth.userId ?? null);
      setDailyUsage(nextUsage);

      sessionStorage.setItem(
        QUIZ_STORAGE_KEY,
        JSON.stringify({
          ownerUserId: auth.userId ?? null,
          fileName: file.name,
          createdAt: new Date().toISOString(),
          ...nextResult,
        }),
      );

      setAnalysisState("ready");
    } catch (error) {
      console.error("教材分析失敗：", error);
      setErrorMessage(
        error instanceof Error ? error.message : "教材分析失敗，請再試一次。",
      );
      setAnalysisState("error");
    }
  };

  const startQuiz = () => {
    if (result) router.push("/study/material/quiz");
  };

  const busy = analysisState === "reading" || analysisState === "analyzing";
  const remaining = Math.max(0, DAILY_ANALYSIS_LIMIT - dailyUsage);

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">MATERIAL</div>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">我有教材</h1>
          <p className="mt-3 max-w-2xl leading-7 text-[#70877a]">
            上傳 PDF，MedSlime 會讀取教材內容、整理重點，並產生 10 題四選一測驗。
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-[#70877a]">
            <span className="rounded-full bg-white px-3 py-1.5">單檔上限 10 MB</span>
            <span className="rounded-full bg-white px-3 py-1.5">今日剩餘 {remaining} / {DAILY_ANALYSIS_LIMIT} 次</span>
          </div>
        </section>

        <section className="mt-8 rounded-[30px] border border-[#dce9e1] bg-white p-6 shadow-[0_14px_34px_rgba(30,78,50,0.06)] md:p-8">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />

          {!file ? (
            <>
              <button
                type="button"
                onClick={chooseFile}
                disabled={remaining <= 0}
                className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#cfe0d6] bg-[#fbfefc] px-6 text-center transition hover:border-[#78d79f] hover:bg-[#f5fcf8] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf9f0] text-3xl">📄</div>
                <div className="mt-5 text-xl font-black">
                  {remaining > 0 ? "選擇 PDF 教材" : "今天的教材分析次數已用完"}
                </div>
                <div className="mt-2 text-sm font-bold text-[#789083]">
                  {remaining > 0
                    ? "選好教材後，MedSlime 會幫你整理成 10 題測驗。"
                    : "每日最多分析 5 份教材，明天會自動恢復。"}
                </div>
              </button>

              {errorMessage && (
                <div className="mt-4 rounded-xl border border-[#f0dddd] bg-[#fff8f8] px-4 py-3 text-sm font-bold text-[#9b5050]">
                  {errorMessage}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-5 rounded-[24px] border border-[#dfeae3] bg-[#f9fcfa] p-5 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">📄</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-black">{file.name}</div>
                  <div className="mt-1 text-sm font-bold text-[#789083]">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetFile}
                  disabled={busy}
                  className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-black text-[#60786c] transition hover:bg-[#f5faf7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  更換檔案
                </button>
              </div>

              {analysisState === "idle" && (
                <button
                  type="button"
                  onClick={analyzeFile}
                  disabled={remaining <= 0}
                  className="mt-5 w-full rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white transition hover:bg-[#2dbc70] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  AI 分析教材
                </button>
              )}

              {busy && <AnalysisLoading fileName={file.name} stage={analysisState} />}

              {analysisState === "error" && (
                <div className="mt-5 rounded-[22px] border border-[#f0dddd] bg-[#fff8f8] p-5">
                  <div className="font-black text-[#9b5050]">教材分析失敗</div>
                  <div className="mt-2 text-sm font-bold leading-6 text-[#9b5050]">{errorMessage}</div>
                  <button
                    type="button"
                    onClick={analyzeFile}
                    disabled={remaining <= 0}
                    className="mt-4 rounded-xl bg-[#31c978] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    再試一次
                  </button>
                </div>
              )}

              {analysisState === "ready" && result && (
                <button
                  type="button"
                  onClick={startQuiz}
                  className="mt-5 w-full rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white transition hover:bg-[#2dbc70]"
                >
                  開始 10 題測驗 →
                </button>
              )}
            </>
          )}
        </section>

        <section className="mt-6 rounded-[22px] border border-[#dfece4] bg-white p-5">
          <div className="text-sm font-black text-[#315b45]">小提醒</div>
          <p className="mt-2 text-sm font-bold leading-7 text-[#789083]">
            文字型 PDF 的讀取效果最好。若教材主要是掃描圖片，可能暫時無法產生測驗。
          </p>
        </section>
      </div>
    </main>
  );
}

function AnalysisLoading({
  fileName,
  stage,
}: {
  fileName: string;
  stage: "reading" | "analyzing";
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-[24px] border border-[#dce9e1] bg-[#fbfefc] p-6">
      <div className="flex flex-col items-center text-center">
        <div className="slime-float relative h-24 w-24">
          <img
            src="/slimes/n-green.png"
            alt="綠色史萊姆正在處理教材"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="mt-2 text-lg font-black text-[#245a3e]">
          {stage === "reading" ? "史萊姆正在讀取教材文字" : "史萊姆正在反覆咀嚼教材"}
        </div>

        <div className="mt-1 max-w-full truncate text-sm font-bold text-[#789083]">{fileName}</div>

        <div className="mt-5 h-2 w-full max-w-md overflow-hidden rounded-full bg-[#e4efe8]">
          <div className="analysis-bar h-full w-1/3 rounded-full bg-[#55b97b]" />
        </div>

        <div className="mt-3 text-xs font-bold text-[#93a49a]">
          {stage === "reading" ? "先把教材內容讀進來" : "再等一下，測驗快準備好了"}
        </div>
      </div>

      <style jsx>{`
        .slime-float {
          animation: slimeFloat 1.5s ease-in-out infinite;
        }

        .analysis-bar {
          animation: analysisMove 1.4s ease-in-out infinite;
        }

        @keyframes slimeFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes analysisMove {
          0% {
            transform: translateX(-110%);
          }
          100% {
            transform: translateX(310%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .slime-float,
          .analysis-bar {
            animation: none;
          }

          .analysis-bar {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
