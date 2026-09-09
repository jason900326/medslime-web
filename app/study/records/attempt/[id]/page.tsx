"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import ExamExplanationPurchaseButton from "@/components/exam-explanation-purchase-button";
import {
  formatAttemptDate,
  formatAttemptDuration,
  readExamAttempt,
  type ExamAttempt,
  type ExamAttemptReviewItem,
} from "@/lib/exam-attempt-store";
import { readMistakes } from "@/lib/mistake-store";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      attempt: ExamAttempt;
      fallbackItems: ExamAttemptReviewItem[];
    };

export default function AttemptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (!id) throw new Error("找不到這筆作答紀錄。");
        const attempt = await readExamAttempt(id);
        if (!attempt) throw new Error("找不到這筆作答紀錄，或這筆紀錄不屬於目前帳號。");

        let fallbackItems: ExamAttemptReviewItem[] = [];
        if (
          attempt.session !== "自由測驗" &&
          attempt.reviewCount > 0 &&
          attempt.reviewItems.length === 0
        ) {
          const mistakes = await readMistakes();
          fallbackItems = mistakes
            .filter(
              (item) =>
                item.source === "national-exam" &&
                item.year === attempt.year &&
                item.session === attempt.session &&
                item.subject === attempt.subject,
            )
            .map((item) => ({
              id: item.id,
              questionNumber: item.questionNumber ?? null,
              stem: item.stem,
              options: item.options,
              correctIndex: item.correctIndex,
              userAnswer: item.userAnswer,
              uncertain: item.uncertain,
              officialPdfUrl: item.officialPdfUrl ?? null,
            }));
        }

        if (!cancelled) setState({ status: "ready", attempt, fallbackItems });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "讀取作答紀錄失敗。",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center font-black text-[#789083]">
          正在讀取這次作答...
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <TopBar showBack backHref="/study/records?tab=attempts" backLabel="返回作答紀錄" />
          <div className="mt-8 rounded-[24px] border border-[#f0dddd] bg-white p-6">
            <div className="text-xl font-black text-[#9b5050]">無法開啟作答紀錄</div>
            <div className="mt-2 text-sm font-bold leading-6 text-[#70877a]">{state.message}</div>
          </div>
        </div>
      </main>
    );
  }

  const { attempt, fallbackItems } = state;
  const freeQuiz = attempt.session === "自由測驗";
  const items = attempt.reviewItems.length > 0 ? attempt.reviewItems : fallbackItems;
  const usingFallback = attempt.reviewItems.length === 0 && fallbackItems.length > 0;
  const quizParams = new URLSearchParams({
    year: attempt.year,
    session: attempt.session,
    subject: attempt.subject,
  });
  const range = parseYearRange(attempt.year);
  const freeQuizParams = new URLSearchParams({
    from: range?.from ?? "110",
    to: range?.to ?? "115",
    subject: attempt.subject,
  });

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study/records?tab=attempts" backLabel="返回作答紀錄" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">ATTEMPT DETAIL</div>
          <h1 className="ms-page-title mt-2">這次作答</h1>
          <div className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            {freeQuiz
              ? `自由測驗 · 民國 ${attempt.year.replace("-", "–")} 年 · ${attempt.subject}`
              : `民國 ${attempt.year} 年・第 ${attempt.session} 次・${attempt.subject}`}
          </div>
          <div className="mt-1 text-xs font-bold text-[#8a9c92]">{formatAttemptDate(attempt.completedAt)}</div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="分數" value={`${attempt.score.toFixed(2)}`} />
          <Stat label="答對" value={`${attempt.correctCount} 題`} />
          <Stat label="需要複習" value={`${attempt.reviewCount} 題`} />
          <Stat label="作答時間" value={formatAttemptDuration(attempt.durationSeconds)} />
        </section>

        {!freeQuiz && (
          <section className="mt-5 rounded-[22px] border border-[#dce9e1] bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-black text-[#315b45]">這份考卷的完整詳解</div>
                <div className="mt-1 text-xs font-bold text-[#789083]">單次 NT$59，購買後永久存取這份考卷完整解析。</div>
              </div>
              <ExamExplanationPurchaseButton
                year={attempt.year}
                session={attempt.session}
                subject={attempt.subject}
                compact
              />
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">REVIEW</div>
              <h2 className="mt-1 text-2xl font-black">這次需要複習的題目</h2>
            </div>
            <span className="shrink-0 text-sm font-black text-[#789083]">{attempt.reviewCount} 題</span>
          </div>

          {usingFallback && (
            <div className="mt-4 rounded-2xl border border-[#f0dfaa] bg-[#fff9e8] px-4 py-3 text-xs font-bold leading-5 text-[#80651e]">
              這筆紀錄建立於逐題作答快照上線前；以下暫時顯示目前仍收在這份考卷錯題紀錄中的題目。之後的新作答會保存每一次當下的錯題快照。
            </div>
          )}

          {attempt.reviewCount === 0 ? (
            <div className="mt-4 rounded-[22px] border border-[#cfe7d8] bg-[#f3fbf6] p-5 font-black text-[#237849]">
              ✓ 這次沒有答錯或標記不確定的題目。
            </div>
          ) : items.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-[#dce9e1] bg-white p-5 text-sm font-bold leading-6 text-[#70877a]">
              這筆紀錄當時只保存了成績摘要，沒有逐題快照。重新作答後，下一筆紀錄就能直接查看當次錯題。
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {items.map((item) => (
                <ReviewCard key={item.id} item={item} freeQuiz={freeQuiz} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href={
              freeQuiz
                ? `/study/free-quiz?${freeQuizParams.toString()}`
                : `/study/exam/quiz?${quizParams.toString()}`
            }
            className="rounded-xl bg-[#31c978] px-5 py-3 text-center text-sm font-black text-white"
          >
            {freeQuiz ? "再組一份自由測驗" : "再次作答這份考卷"}
          </Link>
          <Link
            href="/study/records?tab=attempts"
            className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3 text-center text-sm font-black text-[#315b45]"
          >
            返回作答紀錄
          </Link>
        </div>
      </div>
    </main>
  );
}

function ReviewCard({ item, freeQuiz }: { item: ExamAttemptReviewItem; freeQuiz: boolean }) {
  const isWrong =
    item.correctIndex !== null &&
    item.userAnswer !== null &&
    item.userAnswer !== item.correctIndex;
  const source = freeQuiz ? parseSourceId(item.id) : null;

  return (
    <article className="rounded-[24px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-black text-[#2ba962]">
          {source
            ? `民國 ${source.year} 年・第 ${source.session} 次・第 ${source.questionNumber} 題`
            : item.questionNumber
              ? `第 ${item.questionNumber} 題`
              : "題目"}
        </div>
        {isWrong && (
          <span className="rounded-full bg-[#fff1f1] px-3 py-1 text-xs font-black text-[#9b5050]">答錯</span>
        )}
        {item.uncertain && (
          <span className="rounded-full bg-[#fff8df] px-3 py-1 text-xs font-black text-[#80651e]">❓ 不確定</span>
        )}
      </div>

      <div className="ms-question-stem mt-3">{item.stem}</div>

      <div className="mt-4 space-y-2">
        {item.options.map((option, index) => {
          const correct = item.correctIndex === index;
          const chosen = item.userAnswer === index;
          return (
            <div
              key={`${item.id}-${index}`}
              className={[
                "ms-question-option rounded-xl border px-4 py-3",
                correct
                  ? "border-[#9ed9b5] bg-[#edf9f1] text-[#315b45]"
                  : chosen
                    ? "border-[#e6a2a2] bg-[#fff1f1] text-[#8b4747]"
                    : "border-[#e1e9e4] bg-white text-[#60786c]",
              ].join(" ")}
            >
              {String.fromCharCode(65 + index)}. {option}
              {correct && " ✓"}
              {chosen && !correct && " ← 你的答案"}
            </div>
          );
        })}
      </div>

      {item.userAnswer === null && item.uncertain && (
        <div className="mt-4 rounded-xl bg-[#fff8df] px-4 py-3 text-sm font-bold text-[#80651e]">
          這題沒有正式作答，但你標記了「我不確定」。
        </div>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-4 py-3">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#17372a]">{value}</div>
    </div>
  );
}

function parseYearRange(value: string) {
  const match = value.match(/^(\d{2,3})-(\d{2,3})$/);
  return match ? { from: match[1], to: match[2] } : null;
}

function parseSourceId(value: string) {
  const parts = value.split(":");
  if (parts.length < 5 || parts[0] !== "national-exam") return null;
  const questionNumber = Number(parts[parts.length - 1]);
  if (!Number.isFinite(questionNumber)) return null;
  return {
    year: parts[1],
    session: parts[2],
    questionNumber,
  };
}
