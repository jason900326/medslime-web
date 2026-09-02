"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/top-bar";

type AnalysisState = "idle" | "analyzing" | "ready";

export default function MaterialPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [analysisState, setAnalysisState] =
    useState<AnalysisState>("idle");

  const chooseFile = () => {
    inputRef.current?.click();
  };

  const analyzeFile = async () => {
    if (!file || analysisState === "analyzing") return;

    setAnalysisState("analyzing");

    await new Promise((resolve) => setTimeout(resolve, 1800));

    setAnalysisState("ready");
  };

  const startQuiz = () => {
    if (!file) return;

    localStorage.setItem(
      "medslime_material_quiz_source",
      JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
      }),
    );

    router.push("/study/material/quiz");
  };

  const resetFile = () => {
    setFile(null);
    setAnalysisState("idle");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            MATERIAL
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            我有教材
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-[#70877a]">
            上傳 PDF，分析內容後直接產生 10 題選擇題。
          </p>
        </section>

        <section className="mt-8 rounded-[30px] border border-[#dce9e1] bg-white p-6 shadow-[0_14px_34px_rgba(30,78,50,0.06)] md:p-8">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
              setAnalysisState("idle");
            }}
          />

          {!file ? (
            <button
              type="button"
              onClick={chooseFile}
              className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#cfe0d6] bg-[#fbfefc] px-6 text-center transition hover:border-[#78d79f] hover:bg-[#f5fcf8]"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf9f0] text-3xl">
                📄
              </div>

              <div className="mt-5 text-xl font-black">
                選擇 PDF 教材
              </div>

              <div className="mt-2 text-sm font-bold text-[#789083]">
                點這裡選擇電腦中的 PDF 檔案
              </div>
            </button>
          ) : (
            <>
              <div className="flex flex-col gap-5 rounded-[24px] border border-[#dfeae3] bg-[#f9fcfa] p-5 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                  📄
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-black">
                    {file.name}
                  </div>

                  <div className="mt-1 text-sm font-bold text-[#789083]">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetFile}
                  disabled={analysisState === "analyzing"}
                  className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-black text-[#60786c] transition hover:bg-[#f5faf7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  更換檔案
                </button>
              </div>

              {analysisState === "idle" && (
                <button
                  type="button"
                  onClick={analyzeFile}
                  className="mt-5 w-full rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white transition hover:bg-[#2dbc70]"
                >
                  AI 分析教材
                </button>
              )}

              {analysisState === "analyzing" && (
                <DigestingSlime fileName={file.name} />
              )}

              {analysisState === "ready" && (
                <div className="mt-5 rounded-[24px] border border-[#cfe7d8] bg-[#f3fbf6] p-6">
                  <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
                    ANALYSIS COMPLETE
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    教材分析完成
                  </h2>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <InfoCard
                      title="內容概況"
                      text="已成功讀取教材內容，現在可以依照文件內容產生測驗。"
                    />

                    <InfoCard
                      title="測驗設定"
                      text="第一版固定產生 10 題單選題，專有名詞維持原文。"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={startQuiz}
                    className="mt-6 w-full rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white transition hover:bg-[#2dbc70]"
                  >
                    產生 10 題測驗 →
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="mt-6 rounded-[22px] border border-[#dfece4] bg-white p-5">
          <div className="text-sm font-black text-[#315b45]">
            目前階段
          </div>

          <p className="mt-2 text-sm font-bold leading-7 text-[#789083]">
            這一版先完成正式前端上傳與測驗流程；目前不會真的把 PDF
            傳給 OpenAI。之後接回既有 API 邏輯時，這個頁面可以直接沿用。
          </p>
        </section>
      </div>
    </main>
  );
}

function DigestingSlime({ fileName }: { fileName: string }) {
  return (
    <div className="mt-5 overflow-hidden rounded-[26px] border border-[#cfe7d8] bg-gradient-to-br from-[#effaf3] via-white to-[#eef8fb] px-6 py-8 text-center">
      <div className="mx-auto flex max-w-xl flex-col items-center">
        <div className="relative h-[170px] w-[240px]">
          <div className="digest-paper absolute left-[24px] top-[44px] flex h-[72px] w-[58px] items-center justify-center rounded-lg border-2 border-[#d5dfd9] bg-white text-2xl shadow-sm">
            📄
          </div>

          <div className="paper-bit bit-one absolute left-[94px] top-[66px] h-3 w-3 rounded-sm bg-white shadow-sm" />
          <div className="paper-bit bit-two absolute left-[112px] top-[54px] h-2.5 w-2.5 rounded-sm bg-white shadow-sm" />
          <div className="paper-bit bit-three absolute left-[127px] top-[72px] h-2 w-2 rounded-sm bg-white shadow-sm" />

          <div className="digest-slime absolute bottom-[12px] right-[22px] h-[108px] w-[126px]">
            <div className="absolute inset-0 rounded-[50%_50%_42%_42%/58%_58%_42%_42%] border-[3px] border-[#69c88f] bg-[#b9efd1] shadow-[0_10px_24px_rgba(49,124,78,0.14)]">
              <div className="absolute left-[31px] top-[38px] h-[10px] w-[7px] rounded-full bg-[#315b45]" />
              <div className="absolute right-[31px] top-[38px] h-[10px] w-[7px] rounded-full bg-[#315b45]" />
              <div className="mouth absolute left-1/2 top-[62px] h-[12px] w-[24px] -translate-x-1/2 rounded-b-full border-b-[3px] border-[#315b45]" />
              <div className="absolute left-[18px] top-[53px] h-2 w-3 rounded-full bg-[#f5aeb8]/70" />
              <div className="absolute right-[18px] top-[53px] h-2 w-3 rounded-full bg-[#f5aeb8]/70" />
            </div>
          </div>
        </div>

        <div className="mt-1 text-xl font-black text-[#245a3e]">
          史萊姆正在消化教材
          <span className="loading-dots">...</span>
        </div>

        <div className="mt-2 max-w-md truncate text-sm font-bold text-[#789083]">
          {fileName}
        </div>

        <div className="mt-5 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-[#e4efe8]">
          <div className="digest-progress h-full rounded-full bg-[#55b97b]" />
        </div>

        <div className="mt-3 text-sm font-bold text-[#789083]">
          正在把內容變成史萊姆看得懂的知識
        </div>
      </div>

      <style jsx>{`
        .digest-slime {
          animation: slimeChew 0.9s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .mouth {
          animation: mouthChew 0.45s ease-in-out infinite alternate;
        }

        .digest-paper {
          animation: paperFeed 1.8s ease-in-out infinite;
        }

        .paper-bit {
          opacity: 0;
          animation: paperBite 1.8s ease-in-out infinite;
        }

        .bit-two {
          animation-delay: 0.18s;
        }

        .bit-three {
          animation-delay: 0.36s;
        }

        .digest-progress {
          width: 38%;
          animation: digestProgress 1.5s ease-in-out infinite;
        }

        .loading-dots {
          display: inline-block;
          width: 1.4em;
          overflow: hidden;
          vertical-align: bottom;
          animation: dots 1.2s steps(4, end) infinite;
        }

        @keyframes slimeChew {
          0%,
          100% {
            transform: scaleY(1) translateY(0);
          }
          50% {
            transform: scaleY(0.94) translateY(4px);
          }
        }

        @keyframes mouthChew {
          from {
            height: 7px;
            width: 19px;
          }
          to {
            height: 15px;
            width: 25px;
          }
        }

        @keyframes paperFeed {
          0% {
            transform: translateX(0) rotate(-5deg) scale(1);
            opacity: 1;
          }
          55% {
            transform: translateX(42px) rotate(4deg) scale(0.9);
            opacity: 1;
          }
          72% {
            transform: translateX(65px) rotate(7deg) scale(0.55);
            opacity: 0;
          }
          73%,
          100% {
            transform: translateX(0) rotate(-5deg) scale(1);
            opacity: 0;
          }
        }

        @keyframes paperBite {
          0%,
          35% {
            opacity: 0;
            transform: translate(0, 0) rotate(0);
          }
          48% {
            opacity: 1;
          }
          72% {
            opacity: 0;
            transform: translate(25px, 18px) rotate(45deg);
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes digestProgress {
          0% {
            transform: translateX(-110%);
          }
          50% {
            transform: translateX(85%);
          }
          100% {
            transform: translateX(260%);
          }
        }

        @keyframes dots {
          0% {
            width: 0;
          }
          100% {
            width: 1.4em;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .digest-slime,
          .mouth,
          .digest-paper,
          .paper-bit,
          .digest-progress,
          .loading-dots {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function InfoCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#dfece4] bg-white p-5">
      <div className="font-black">{title}</div>
      <div className="mt-2 text-sm font-bold leading-6 text-[#789083]">
        {text}
      </div>
    </div>
  );
}
