"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import OfficialQuestionCrop from "@/components/official-question-crop";
import AIExplanationButton from "@/components/ai-explanation-button";

type Question = {
  id: string;
  questionNumber: number;
  stem: string;
  options: string[];
  correctIndex: number | null;
  sourceOnlyMode: boolean;
  hasImageHint: boolean;
  imageUrl: string | null;
  questionPdfUrl: string | null;
  sourcePageUrl: string | null;
  sourceUrl: string | null;
};

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "locked" }
  | { status: "ready"; questions: Question[]; purchasedAt: string | null };

export default function ExamExplanationPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <ExamExplanationContent />
    </Suspense>
  );
}

function ExamExplanationContent() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year") ?? "";
  const session = searchParams.get("session") ?? "";
  const subject = searchParams.get("subject") ?? "";
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [index, setIndex] = useState(0);
  const [showOfficialQuestion, setShowOfficialQuestion] = useState(false);

  const examParams = useMemo(
    () => new URLSearchParams({ year, session, subject }),
    [year, session, subject],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!year || !session || !subject) {
        setState({ status: "error", message: "缺少年度、梯次或科目。" });
        return;
      }

      setState({ status: "loading" });
      setIndex(0);
      setShowOfficialQuestion(false);

      try {
        const accessResponse = await fetch(
          `/api/exam-explanation-access?${examParams.toString()}`,
          { cache: "no-store", signal: controller.signal },
        );
        const accessPayload = await accessResponse.json();

        if (!accessResponse.ok) {
          throw new Error(accessPayload?.error ?? "讀取完整詳解權限失敗。");
        }

        if (!accessPayload?.purchased) {
          setState({ status: "locked" });
          return;
        }

        const examResponse = await fetch(
          `/api/national-exam?${examParams.toString()}`,
          { cache: "no-store", signal: controller.signal },
        );
        const examPayload = await examResponse.json();

        if (!examResponse.ok) {
          throw new Error(examPayload?.error ?? "讀取國考題庫失敗。");
        }

        const questions = Array.isArray(examPayload?.questions)
          ? (examPayload.questions as Question[])
          : [];

        if (questions.length === 0) {
          throw new Error("這份考卷目前找不到可顯示的題目。");
        }

        setState({
          status: "ready",
          questions,
          purchasedAt:
            typeof accessPayload?.purchasedAt === "string"
              ? accessPayload.purchasedAt
              : null,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          status: "error",
          message:
            error instanceof Error ? error.message : "讀取完整詳解失敗。",
        });
      }
    }

    void load();
    return () => controller.abort();
  }, [examParams, session, subject, year]);

  const jumpToQuestion = (nextIndex: number) => {
    setIndex(nextIndex);
    setShowOfficialQuestion(false);
    window.setTimeout(() => {
      document
        .getElementById("full-explanation-question")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  if (state.status === "loading") return <LoadingPage />;

  if (state.status === "error") {
    return (
      <Shell>
        <StatusCard title="完整詳解讀取失敗" tone="error">
          {state.message}
        </StatusCard>
      </Shell>
    );
  }

  if (state.status === "locked") {
    return (
      <Shell>
        <StatusCard title="這份完整詳解尚未解鎖" tone="locked">
          這個閱讀模式只開放給已購買這份國考完整詳解的帳號。
          <div className="mt-5">
            <Link
              href={`/study/exam/quiz?${examParams.toString()}`}
              className="inline-flex rounded-xl bg-[#31c978] px-5 py-3 text-sm font-black text-white"
            >
              前往這份考卷
            </Link>
          </div>
        </StatusCard>
      </Shell>
    );
  }

  const questions = state.questions;
  const question = questions[index];
  const correctLabel =
    question.correctIndex === null
      ? null
      : String.fromCharCode(65 + question.correctIndex);

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study/exam" backLabel="返回國考題庫" />

        <section className="mt-6 rounded-[26px] border border-[#bfe1cb] bg-gradient-to-br from-[#effbf4] via-white to-[#fffaf0] p-5 shadow-[0_12px_30px_rgba(30,78,50,0.05)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
                FULL EXPLANATION
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
                {subject}
              </h1>
              <div className="mt-2 text-sm font-bold text-[#70877a]">
                {year} 年 · 第 {session} 次 · 共 {questions.length} 題
              </div>
            </div>
            <div className="rounded-full bg-[#eaf9f0] px-3 py-1.5 text-xs font-black text-[#237849]">
              ✓ 永久解鎖
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-[#668276]">
            每題都可直接查看標準答案；完整解析採按題載入，已產生過的解析會直接讀取共用內容，尚未產生的題目則在你展開時建立，不會一次生成整份考卷。
          </p>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">
                QUESTION INDEX
              </div>
              <div className="mt-1 text-sm font-black text-[#315b45]">
                點題號直接跳到該題
              </div>
            </div>
            <div className="text-xs font-bold text-[#789083]">
              Q{question.questionNumber} / {questions.length}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-12">
            {questions.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpToQuestion(itemIndex)}
                className={[
                  "aspect-square rounded-lg border text-xs font-black transition",
                  itemIndex === index
                    ? "border-[#31c978] bg-[#31c978] text-white"
                    : "border-[#dce9e1] bg-[#f8fcf9] text-[#557768] hover:border-[#9ed9b5] hover:bg-[#eefaf2]",
                ].join(" ")}
              >
                {item.questionNumber}
              </button>
            ))}
          </div>
        </section>

        <section
          id="full-explanation-question"
          className="mt-5 scroll-mt-5 rounded-[28px] border border-[#dce9e1] bg-white p-5 shadow-[0_12px_28px_rgba(30,78,50,0.055)] sm:p-6 md:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-black text-[#2ba962]">
              第 {question.questionNumber} 題
            </div>
            {correctLabel ? (
              <div className="rounded-full bg-[#eaf9f0] px-3 py-1 text-xs font-black text-[#237849]">
                正確答案 {correctLabel}
              </div>
            ) : (
              <div className="rounded-full bg-[#f3f4f3] px-3 py-1 text-xs font-black text-[#789083]">
                無單一標準答案
              </div>
            )}
          </div>

          <div className="mt-4 text-base font-black leading-7 text-[#17372a] sm:text-lg sm:leading-8">
            {question.stem}
          </div>

          {(question.hasImageHint || question.sourceOnlyMode) && (
            <div className="mt-4 rounded-2xl border border-[#f0dfaa] bg-[#fff9e8] px-4 py-3 text-sm font-black leading-6 text-[#80651e]">
              {question.hasImageHint
                ? "🖼️ 本題包含圖表／影像，建議搭配官方原題閱讀。"
                : "📄 本題文字解析資料不完整，請以官方原題為準。"}
            </div>
          )}

          <div className="mt-5 space-y-2.5">
            {question.options.map((option, optionIndex) => {
              const isCorrect = question.correctIndex === optionIndex;
              return (
                <div
                  key={`${question.id}-${optionIndex}`}
                  className={[
                    "rounded-2xl border px-4 py-3 text-sm font-bold leading-6 sm:text-base",
                    isCorrect
                      ? "border-[#9ed9b5] bg-[#edf9f1] text-[#315b45]"
                      : "border-[#e1e9e4] bg-white text-[#60786c]",
                  ].join(" ")}
                >
                  <span className="font-black">
                    {String.fromCharCode(65 + optionIndex)}.
                  </span>{" "}
                  {option}
                  {isCorrect && " ✓"}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowOfficialQuestion((current) => !current)}
              className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2.5 text-sm font-black text-[#315b45] transition hover:bg-[#f5faf7]"
            >
              {showOfficialQuestion ? "收起官方原題" : "📄 查看官方原題"}
            </button>
          </div>

          {showOfficialQuestion && (
            <div className="mt-4">
              <OfficialQuestionCrop
                pdfUrl={question.questionPdfUrl}
                questionNumber={question.questionNumber}
                largePreview
              />
            </div>
          )}

          {question.correctIndex !== null && !question.sourceOnlyMode ? (
            <div className="mt-2">
              <AIExplanationButton
                directPurchasedAccess
                buttonLabel="展開本題完整解析"
                payload={{
                  questionKey: `national-exam:${year}:${session}:${subject}:${question.questionNumber}`,
                  source: "national-exam",
                  sourceLabel: `${year} 年 · 第 ${session} 次 · ${subject}`,
                  stem: question.stem,
                  options: question.options,
                  correctIndex: question.correctIndex,
                  userAnswer: null,
                  uncertain: false,
                }}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-[#e1e7e3] bg-[#f7faf8] px-4 py-3 text-sm font-bold leading-6 text-[#60786c]">
              這題目前缺少可供可靠解析的完整文字選項或單一標準答案，先以官方原題與公布答案為準。
            </div>
          )}

          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-[#e7eee9] pt-5">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => jumpToQuestion(Math.max(0, index - 1))}
              className="rounded-xl border border-[#d7e7de] bg-white px-4 py-3 text-sm font-black text-[#315b45] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← 上一題
            </button>
            <button
              type="button"
              disabled={index >= questions.length - 1}
              onClick={() => jumpToQuestion(Math.min(questions.length - 1, index + 1))}
              className="rounded-xl bg-[#31c978] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一題 →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study/exam" backLabel="返回國考題庫" />
        {children}
      </div>
    </main>
  );
}

function StatusCard({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone: "error" | "locked";
}) {
  return (
    <section
      className={[
        "mt-8 rounded-[26px] border bg-white p-6 shadow-[0_12px_30px_rgba(30,78,50,0.05)]",
        tone === "error" ? "border-[#f0dddd]" : "border-[#dce9e1]",
      ].join(" ")}
    >
      <h1
        className={[
          "text-2xl font-black",
          tone === "error" ? "text-[#9b5050]" : "text-[#17372a]",
        ].join(" ")}
      >
        {title}
      </h1>
      <div className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
        {children}
      </div>
    </section>
  );
}

function LoadingPage() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-12 w-16 animate-bounce rounded-[50%_50%_42%_42%/56%_56%_42%_42%] border-2 border-[#8fd0a9] bg-[#d9f3e4]" />
          <div className="mt-4 text-sm font-black text-[#557768]">
            正在打開完整詳解…
          </div>
        </div>
      </div>
    </main>
  );
}
