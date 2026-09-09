"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import OfficialQuestionCrop from "@/components/official-question-crop";
import AIExplanationButton from "@/components/ai-explanation-button";
import { useGameState } from "@/components/game-state-provider";
import { saveNationalExamAttempt } from "@/lib/exam-attempt-store";
import { upsertMistakes } from "@/lib/mistake-store";

type FreeQuestion = {
  id: string;
  questionNumber: number;
  sourceQuestionNumber: number;
  sourceYear: string;
  sourceSession: string;
  sourceSubject: string;
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

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; questions: FreeQuestion[] };

const STARTED_AT_KEY = "medslime_free_quiz_started_at";
const EXAM_FINISHED_EVENT = "medslime:exam-finished";

export default function FreeQuizRunnerPage() {
  return (
    <Suspense fallback={<LoadingQuiz />}>
      <FreeQuizRunner />
    </Suspense>
  );
}

function FreeQuizRunner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const game = useGameState();
  const from = searchParams.get("from") ?? "110";
  const to = searchParams.get("to") ?? "115";
  const subject = searchParams.get("subject") ?? "生物化學與臨床生化學";
  const count = searchParams.get("count") ?? "20";
  const configKey = `${from}-${to}-${subject}-${count}`;

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [uncertain, setUncertain] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [elapsedAtFinish, setElapsedAtFinish] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showOfficial, setShowOfficial] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoadState({ status: "loading" });
      setIndex(0);
      setAnswers({});
      setUncertain({});
      setFinished(false);
      setRecorded(false);
      setElapsedAtFinish(0);
      sessionStorage.setItem(STARTED_AT_KEY, String(Date.now()));

      try {
        const params = new URLSearchParams({ from, to, subject, count });
        const response = await fetch(`/api/free-quiz?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error ?? "自由測驗題庫讀取失敗。");
        const questions = Array.isArray(payload?.questions) ? payload.questions : [];
        if (questions.length === 0) throw new Error("這組條件目前沒有可用題目。");
        setLoadState({ status: "ready", questions });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "自由測驗題庫讀取失敗。",
        });
      }
    }

    void load();
    return () => controller.abort();
  }, [configKey, from, to, subject, count]);

  if (loadState.status === "loading") return <LoadingQuiz />;

  if (loadState.status === "error") {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <TopBar showBack backHref="/study/free-quiz" backLabel="返回自由測驗" />
          <section className="mt-8 rounded-[24px] border border-[#f0dddd] bg-white p-6">
            <div className="text-xl font-black text-[#9b5050]">無法建立自由測驗</div>
            <div className="mt-2 text-sm font-bold leading-6 text-[#70877a]">{loadState.message}</div>
            <button
              type="button"
              onClick={() => router.push("/study/free-quiz")}
              className="mt-5 rounded-xl bg-[#31c978] px-5 py-3 text-sm font-black text-white"
            >
              重新設定
            </button>
          </section>
        </div>
      </main>
    );
  }

  const questions = loadState.questions;
  const question = questions[index];
  const correctCount = questions.reduce(
    (sum, item) => sum + (item.correctIndex !== null && answers[item.id] === item.correctIndex ? 1 : 0),
    0,
  );
  const gradableCount = questions.filter((item) => item.correctIndex !== null).length;
  const answeredCount = Object.keys(answers).length;
  const uncertainCount = Object.values(uncertain).filter(Boolean).length;
  const unanswered = questions.filter((item) => answers[item.id] === undefined);
  const score = gradableCount > 0 ? (correctCount / gradableCount) * 100 : 0;
  const reviewQuestions = questions.filter((item) => {
    const answer = answers[item.id];
    return (
      (item.correctIndex !== null && answer !== undefined && answer !== item.correctIndex) ||
      Boolean(uncertain[item.id])
    );
  });

  const sourceId = (item: FreeQuestion) =>
    `national-exam:${item.sourceYear}:${item.sourceSession}:${subject}:${item.sourceQuestionNumber}`;
  const sourceLabel = (item: FreeQuestion) =>
    `民國 ${item.sourceYear} 年 · 第 ${item.sourceSession} 次 · ${subject}`;

  const finish = async () => {
    const startedAt = Number(sessionStorage.getItem(STARTED_AT_KEY));
    const elapsed = Number.isFinite(startedAt)
      ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      : 0;
    setElapsedAtFinish(elapsed);
    window.dispatchEvent(new Event(EXAM_FINISHED_EVENT));

    if (!recorded) {
      setRecorded(true);
      try {
        await saveNationalExamAttempt({
          year: `${from}-${to}`,
          session: "自由測驗",
          subject,
          answeredCount,
          correctCount,
          score,
          reviewCount: reviewQuestions.length,
          uncertainCount,
          durationSeconds: elapsed,
          reviewItems: reviewQuestions.map((item) => ({
            id: sourceId(item),
            questionNumber: item.sourceQuestionNumber,
            stem: item.stem,
            options: item.options,
            correctIndex: item.correctIndex,
            userAnswer: answers[item.id] ?? null,
            uncertain: Boolean(uncertain[item.id]),
            officialPdfUrl: item.questionPdfUrl,
          })),
        });
        game.recordQuestionsAnswered(answeredCount);
      } catch (error) {
        console.error("自由測驗作答紀錄儲存失敗：", error);
      }
    }

    try {
      await upsertMistakes(
        reviewQuestions.map((item) => ({
          id: sourceId(item),
          source: "national-exam" as const,
          sourceLabel: sourceLabel(item),
          subject,
          year: item.sourceYear,
          session: item.sourceSession,
          questionNumber: item.sourceQuestionNumber,
          stem: item.stem,
          options: item.options,
          correctIndex: item.correctIndex,
          userAnswer: answers[item.id] ?? null,
          uncertain: Boolean(uncertain[item.id]),
          officialPdfUrl: item.questionPdfUrl,
          createdAt: new Date().toISOString(),
          reviewed: false,
        })),
      );
    } catch (error) {
      console.error("自由測驗錯題儲存失敗：", error);
    }

    setShowSubmit(false);
    setFinished(true);
  };

  if (finished) {
    const preview = reviewQuestions.slice(0, 3);
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <TopBar showBack backHref="/study/free-quiz" backLabel="返回自由測驗" />

          <section className="mt-6 rounded-[28px] border border-[#dce9e1] bg-white p-5 text-center shadow-[0_14px_34px_rgba(30,78,50,0.055)] sm:p-8">
            <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">FREE QUIZ RESULT</div>
            <h1 className="mt-2 text-3xl font-black">自由測驗完成</h1>
            <div className="mt-2 text-sm font-bold text-[#789083]">民國 {from}–{to} 年 · {subject}</div>

            <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3">
              <ResultCard label="答對" value={`${correctCount} / ${gradableCount}`} />
              <ResultCard label="正確率" value={`${score.toFixed(1)}%`} />
              <ResultCard label="需要複習" value={`${reviewQuestions.length} 題`} />
              <ResultCard label="作答時間" value={formatElapsed(elapsedAtFinish)} />
            </div>

            <div className="mx-auto mt-6 flex max-w-xl flex-col gap-2 sm:flex-row">
              {reviewQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => router.push("/study/records?tab=mistakes")}
                  className="flex-1 rounded-xl bg-[#31c978] px-5 py-3 font-black text-white"
                >
                  前往錯題紀錄
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push(`/study/free-quiz?from=${from}&to=${to}&subject=${encodeURIComponent(subject)}`)}
                className="flex-1 rounded-xl border border-[#d7e7de] bg-white px-5 py-3 font-black text-[#315b45]"
              >
                再組一份
              </button>
            </div>

            {preview.length > 0 && (
              <div className="mx-auto mt-8 max-w-3xl space-y-3 text-left">
                <div>
                  <div className="text-lg font-black">先看這次最需要複習的題目</div>
                  <div className="mt-1 text-xs font-bold text-[#789083]">完整清單已存入錯題紀錄。</div>
                </div>
                {preview.map((item) => {
                  const chosen = answers[item.id];
                  return (
                    <article key={item.id} className="rounded-[20px] border border-[#e0ebe4] bg-[#fbfefc] p-4">
                      <div className="text-xs font-black text-[#2ba962]">
                        民國 {item.sourceYear} 年・第 {item.sourceSession} 次・第 {item.sourceQuestionNumber} 題
                      </div>
                      <div className="ms-question-stem mt-2">{item.stem}</div>
                      <div className="mt-3 space-y-2">
                        {item.options.map((option, optionIndex) => (
                          <div
                            key={`${item.id}-${optionIndex}`}
                            className={[
                              "ms-question-option rounded-xl border px-4 py-3",
                              item.correctIndex === optionIndex
                                ? "border-[#9ed9b5] bg-[#edf9f1] text-[#315b45]"
                                : chosen === optionIndex
                                  ? "border-[#e6a2a2] bg-[#fff1f1] text-[#8b4747]"
                                  : "border-[#e1e9e4] bg-white text-[#60786c]",
                            ].join(" ")}
                          >
                            {String.fromCharCode(65 + optionIndex)}. {option}
                            {item.correctIndex === optionIndex && " ✓"}
                            {chosen === optionIndex && chosen !== item.correctIndex && " ← 你的答案"}
                          </div>
                        ))}
                      </div>
                      {item.correctIndex !== null && (
                        <AIExplanationButton
                          payload={{
                            questionKey: sourceId(item),
                            source: "national-exam",
                            sourceLabel: sourceLabel(item),
                            stem: item.stem,
                            options: item.options,
                            correctIndex: item.correctIndex,
                            userAnswer: chosen ?? null,
                            uncertain: Boolean(uncertain[item.id]),
                          }}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study/free-quiz" backLabel="返回設定" />

        <section className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">自由測驗 · 民國 {from}–{to} 年</div>
            <h1 className="mt-1 text-2xl font-black">{subject}</h1>
          </div>
          <div className="text-sm font-black text-[#789083]">{index + 1} / {questions.length}</div>
        </section>

        <ProgressGrid
          questions={questions}
          index={index}
          answers={answers}
          uncertain={uncertain}
          onJump={setIndex}
        />

        <section className="mt-5 rounded-[26px] border border-[#dce9e1] bg-white p-5 shadow-[0_12px_28px_rgba(30,78,50,0.05)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="text-xs font-black text-[#2ba962]">
              民國 {question.sourceYear} 年・第 {question.sourceSession} 次・官方第 {question.sourceQuestionNumber} 題
            </div>
            <button
              type="button"
              onClick={() => setShowSubmit(true)}
              className="shrink-0 text-xs font-black text-[#9b5050]"
            >
              結束測驗
            </button>
          </div>

          <div className="ms-question-stem mt-4">{question.stem}</div>

          {(question.hasImageHint || question.sourceOnlyMode) && (
            <div className="mt-4 rounded-xl bg-[#fff9e8] px-4 py-3 text-xs font-bold leading-5 text-[#80651e]">
              {question.hasImageHint ? "本題包含圖表／影像，建議查看官方原題。" : "本題文字解析可能不完整，建議查看官方原題。"}
            </div>
          )}

          {question.questionPdfUrl && (
            <button
              type="button"
              onClick={() => setShowOfficial(true)}
              className="mt-4 rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-black text-[#315b45]"
            >
              📄 官方原題
            </button>
          )}

          <div className="mt-5 space-y-2">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.id] === optionIndex;
              return (
                <button
                  key={`${question.id}-${optionIndex}`}
                  type="button"
                  onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                  className={[
                    "ms-question-option flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition",
                    selected
                      ? "border-[#65d795] bg-[#eaf9f0] text-[#315b45]"
                      : "border-[#dfe8e2] bg-white text-[#466a58] hover:bg-[#f7faf8]",
                  ].join(" ")}
                >
                  <span className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black",
                    selected ? "border-[#31c978] bg-[#31c978] text-white" : "border-[#cad8d0] bg-white text-[#789083]",
                  ].join(" ")}>
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setUncertain((current) => ({ ...current, [question.id]: !current[question.id] }))}
            className={[
              "mt-4 w-full rounded-2xl border px-4 py-3 text-left text-sm font-black",
              uncertain[question.id]
                ? "border-[#e2b94f] bg-[#fff8df] text-[#80651e]"
                : "border-[#dfe8e2] bg-white text-[#557768]",
            ].join(" ")}
          >
            ❓ 我不確定
          </button>

          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3 font-black text-[#315b45] disabled:opacity-35"
            >
              ← 上一題
            </button>
            {index < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setIndex((current) => Math.min(questions.length - 1, current + 1))}
                className="rounded-xl bg-[#31c978] px-5 py-3 font-black text-white"
              >
                下一題 →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmit(true)}
                className="rounded-xl bg-[#31c978] px-5 py-3 font-black text-white"
              >
                完成測驗
              </button>
            )}
          </div>
        </section>
      </div>

      {showSubmit && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-[26px] bg-white p-6 shadow-2xl">
            <div className="text-2xl font-black">是否要交卷？</div>
            <div className="mt-3 text-sm font-bold leading-6 text-[#70877a]">
              已作答 {answeredCount} / {questions.length} 題
              {unanswered.length > 0 ? `，還有 ${unanswered.length} 題未作答。` : "，已完成全部題目。"}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowSubmit(false)}
                className="rounded-xl border border-[#d7e7de] px-4 py-3 font-black text-[#315b45]"
              >
                繼續作答
              </button>
              <button
                type="button"
                onClick={finish}
                className="rounded-xl bg-[#31c978] px-4 py-3 font-black text-white"
              >
                確認交卷
              </button>
            </div>
          </div>
        </div>
      )}

      {showOfficial && question.questionPdfUrl && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/35 px-3 py-5">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">OFFICIAL QUESTION</div>
                <div className="mt-1 text-xl font-black">民國 {question.sourceYear} 年・第 {question.sourceSession} 次・第 {question.sourceQuestionNumber} 題</div>
              </div>
              <button
                type="button"
                onClick={() => setShowOfficial(false)}
                className="rounded-xl border border-[#d7e7de] px-3 py-2 text-sm font-black text-[#60786c]"
              >
                關閉
              </button>
            </div>
            <div className="mt-5">
              <OfficialQuestionCrop
                pdfUrl={question.questionPdfUrl}
                questionNumber={question.sourceQuestionNumber}
                largePreview
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ProgressGrid({
  questions,
  index,
  answers,
  uncertain,
  onJump,
}: {
  questions: FreeQuestion[];
  index: number;
  answers: Record<string, number>;
  uncertain: Record<string, boolean>;
  onJump: (index: number) => void;
}) {
  return (
    <section className="mt-4 rounded-[20px] border border-[#dce9e1] bg-white px-3 py-3">
      <div className="grid grid-cols-10 gap-1.5">
        {questions.map((item, questionIndex) => {
          const answered = answers[item.id] !== undefined;
          const unsure = Boolean(uncertain[item.id]);
          const active = index === questionIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onJump(questionIndex)}
              className={[
                "aspect-square rounded-lg text-[10px] font-black transition",
                active
                  ? "bg-[#17372a] text-white"
                  : unsure
                    ? "bg-[#fff1c9] text-[#80651e]"
                    : answered
                      ? "bg-[#eaf9f0] text-[#237849]"
                      : "bg-[#f4f7f5] text-[#8a9c92]",
              ].join(" ")}
            >
              {questionIndex + 1}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f7faf8] px-4 py-4">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#17372a]">{value}</div>
    </div>
  );
}

function LoadingQuiz() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-10 text-center text-sm font-black text-[#789083]">
        正在替你組卷…
      </div>
    </main>
  );
}

function formatElapsed(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  if (minutes < 60) return `${minutes}:${String(seconds).padStart(2, "0")}`;
  const hours = Math.floor(minutes / 60);
  return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
