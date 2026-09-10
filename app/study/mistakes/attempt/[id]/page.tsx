"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import OfficialQuestionCrop from "@/components/official-question-crop";
import AIExplanationButton from "@/components/ai-explanation-button";
import {
  formatAttemptDate,
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
      items: ExamAttemptReviewItem[];
      usingFallback: boolean;
    };

export default function MistakeAttemptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [officialItem, setOfficialItem] = useState<ExamAttemptReviewItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (!id) throw new Error("找不到這筆測驗紀錄。");
        const attempt = await readExamAttempt(id);
        if (!attempt) throw new Error("找不到這筆測驗紀錄，或這筆紀錄不屬於目前帳號。");

        let items = attempt.reviewItems;
        let usingFallback = false;

        if (
          items.length === 0 &&
          attempt.reviewCount > 0 &&
          attempt.session !== "自由測驗"
        ) {
          const mistakes = await readMistakes();
          items = mistakes
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
          usingFallback = items.length > 0;
        }

        if (!cancelled) setState({ status: "ready", attempt, items, usingFallback });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "讀取錯題紀錄失敗。",
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
          正在讀取這份測驗的錯題...
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <TopBar showBack backHref="/study/mistakes" backLabel="返回錯題複習" />
          <div className="mt-8 rounded-[24px] border border-[#f0dddd] bg-white p-6">
            <div className="text-xl font-black text-[#9b5050]">無法開啟錯題紀錄</div>
            <div className="mt-2 text-sm font-bold leading-6 text-[#70877a]">{state.message}</div>
          </div>
        </div>
      </main>
    );
  }

  const { attempt, items, usingFallback } = state;
  const freeQuiz = attempt.session === "自由測驗";
  const wrongCount = items.filter(
    (item) =>
      item.correctIndex !== null &&
      item.userAnswer !== null &&
      item.userAnswer !== item.correctIndex,
  ).length;
  const title = freeQuiz
    ? `自由測驗 · ${attempt.year.replace("-", "–")} 年`
    : `${attempt.year} 年・第 ${attempt.session} 次國考`;

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study/mistakes" backLabel="返回錯題複習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">MISTAKE DETAIL</div>
          <h1 className="ms-page-title mt-2">這份測驗的錯題</h1>
          <div className="mt-2 text-lg font-black leading-7 text-[#315b45]">{title}</div>
          <div className="mt-1 text-sm font-bold leading-6 text-[#70877a]">{attempt.subject}</div>
          <div className="mt-1 text-xs font-bold text-[#8a9c92]">{formatAttemptDate(attempt.completedAt)}</div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="需要複習" value={`${attempt.reviewCount} 題`} />
          <Stat label="答錯" value={`${wrongCount} 題`} />
          <Stat label="不確定" value={`${attempt.uncertainCount} 題`} />
        </section>

        {usingFallback && (
          <div className="mt-4 rounded-2xl border border-[#f0dfaa] bg-[#fff9e8] px-4 py-3 text-xs font-bold leading-5 text-[#80651e]">
            這筆較舊的紀錄沒有保存當次逐題快照，因此以下使用目前仍屬於這份考卷的錯題資料補上。
          </div>
        )}

        <section className="mt-7">
          {attempt.reviewCount === 0 ? (
            <div className="rounded-[22px] border border-[#cfe7d8] bg-[#f3fbf6] p-5 font-black text-[#237849]">
              ✓ 這次沒有答錯或標記不確定的題目。
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[22px] border border-[#dce9e1] bg-white p-5 text-sm font-bold leading-6 text-[#70877a]">
              這筆舊紀錄當時只保存了成績摘要，沒有逐題錯題快照。之後完成的新測驗都會保留當次錯題。
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <MistakeQuestionCard
                  key={`${item.id}-${index}`}
                  item={item}
                  attempt={attempt}
                  freeQuiz={freeQuiz}
                  onShowOfficial={() => setOfficialItem(item)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href="/study/mistakes"
            className="rounded-xl bg-[#31c978] px-5 py-3 text-center text-sm font-black text-white"
          >
            返回錯題複習
          </Link>
          <Link
            href="/study/mistakes/individual"
            className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3 text-center text-sm font-black text-[#315b45]"
          >
            個別錯題管理
          </Link>
        </div>
      </div>

      {officialItem?.officialPdfUrl && officialItem.questionNumber && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/35 px-3 py-5 sm:px-5 sm:py-8">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-[#dce9e1] bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">OFFICIAL QUESTION</div>
                <div className="mt-1 text-xl font-black">官方原題 · 第 {officialItem.questionNumber} 題</div>
              </div>
              <button
                type="button"
                onClick={() => setOfficialItem(null)}
                className="rounded-xl border border-[#d7e7de] bg-white px-3 py-2 text-sm font-black text-[#60786c]"
              >
                關閉
              </button>
            </div>
            <div className="mt-6">
              <OfficialQuestionCrop
                pdfUrl={officialItem.officialPdfUrl}
                questionNumber={officialItem.questionNumber}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MistakeQuestionCard({
  item,
  attempt,
  freeQuiz,
  onShowOfficial,
}: {
  item: ExamAttemptReviewItem;
  attempt: ExamAttempt;
  freeQuiz: boolean;
  onShowOfficial: () => void;
}) {
  const isWrong =
    item.correctIndex !== null &&
    item.userAnswer !== null &&
    item.userAnswer !== item.correctIndex;
  const source = freeQuiz ? parseSourceId(item.id) : null;
  const sourceLabel = source
    ? `${source.year} 年 · 第 ${source.session} 次 · ${attempt.subject}`
    : `${attempt.year} 年 · 第 ${attempt.session} 次 · ${attempt.subject}`;

  return (
    <article className="rounded-[24px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-black text-[#2ba962]">
          {source
            ? `${source.year} 年・第 ${source.session} 次・第 ${source.questionNumber} 題`
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

      <div className="mt-5 flex flex-wrap gap-3">
        {item.officialPdfUrl && item.questionNumber && (
          <button
            type="button"
            onClick={onShowOfficial}
            className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-black text-[#315b45]"
          >
            📄 官方原題
          </button>
        )}
      </div>

      {item.correctIndex !== null && (
        <AIExplanationButton
          payload={{
            questionKey: item.id,
            source: "national-exam",
            sourceLabel,
            stem: item.stem,
            options: item.options,
            correctIndex: item.correctIndex,
            userAnswer: item.userAnswer,
            uncertain: item.uncertain,
          }}
        />
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-3 py-3 text-center sm:px-4">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#17372a]">{value}</div>
    </div>
  );
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
