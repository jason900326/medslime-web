"use client";

import QuizDialog from "@/components/quiz-dialog";
import QuizOption from "@/components/quiz-option";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import OfficialQuestionCrop from "@/components/official-question-crop";
import AIExplanationButton from "@/components/ai-explanation-button";
import { useGameState } from "@/components/game-state-provider";
import { saveNationalExamAttempt } from "@/lib/exam-attempt-store";
import { upsertMistakes } from "@/lib/mistake-store";
import { useQuizSession } from "@/lib/use-quiz-session";

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
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; questions: FreeQuestion[] };

type ReviewFormat =
  | "comparison_table"
  | "steps"
  | "bullets"
  | "formula_rules"
  | "causal_chain"
  | "pattern_match";

type WeakTopicReview = {
  title: string;
  summary: string;
  format: ReviewFormat;
  items: Array<{
    label: string;
    content: string;
  }>;
};

type ReviewState =
  | { status: "loading" }
  | { status: "ready"; review: WeakTopicReview }
  | { status: "locked"; message: string }
  | { status: "error"; message: string };

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
  const topic = searchParams.get("topic")?.trim() ?? "";
  const subtopic = topic ? searchParams.get("subtopic")?.trim() ?? "" : "";
  const targeted = Boolean(topic);
  const targetLabel = subtopic || topic;
  const configKey = `${from}-${to}-${subject}-${count}-${topic}-${subtopic}`;

  const buildConfiguratorHref = () => {
    if (targeted) return "/study/records/what-to-study";

    const params = new URLSearchParams({ from, to, subject, count });
    if (topic) params.set("topic", topic);
    if (subtopic) params.set("subtopic", subtopic);
    return `/study/free-quiz?${params.toString()}`;
  };

  const buildTargetedQuizHref = () => {
    const params = new URLSearchParams({ from, to, subject, topic, count: "10" });
    if (subtopic) params.set("subtopic", subtopic);
    return `/study/free-quiz/quiz?${params.toString()}`;
  };

  const {
    index,
    setIndex,
    answers,
    setAnswers,
    uncertain,
    setUncertain,
    struckOptions,
    toggleStrike,
    getStatus: getQuestionStatus,
    resetSession,
  } = useQuizSession();
  const [reviewGateOpen, setReviewGateOpen] = useState(!targeted);
  const [reviewState, setReviewState] = useState<ReviewState | null>(
    targeted ? { status: "loading" } : null,
  );
  const [loadState, setLoadState] = useState<LoadState>({
    status: targeted ? "idle" : "loading",
  });
  const [finished, setFinished] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [elapsedAtFinish, setElapsedAtFinish] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showOfficial, setShowOfficial] = useState(false);

  useEffect(() => {
    if (!targeted) return;

    const controller = new AbortController();

    void fetch(
      `/api/weak-topic-review?${new URLSearchParams({ subject, topic }).toString()}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const payload = (await response.json()) as {
          review?: WeakTopicReview;
          error?: string;
          code?: string;
        };

        if (response.status === 403 || payload.code === "PRO_REQUIRED") {
          setReviewState({
            status: "locked",
            message: payload.error ?? "快速弱點補強是 Pro 功能。",
          });
          return;
        }

        if (!response.ok || !payload.review) {
          throw new Error(payload.error ?? "快速補強內容讀取失敗。");
        }

        setReviewState({ status: "ready", review: payload.review });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReviewState({
          status: "error",
          message: error instanceof Error ? error.message : "快速補強內容讀取失敗。",
        });
      });

    return () => controller.abort();
  }, [subject, targeted, topic]);

  useEffect(() => {
    if (targeted && !reviewGateOpen) return;

    const controller = new AbortController();

    async function load() {
      setLoadState({ status: "loading" });
      resetSession();
      setFinished(false);
      setRecorded(false);
      setElapsedAtFinish(0);
      sessionStorage.setItem(STARTED_AT_KEY, String(Date.now()));

      try {
        const params = new URLSearchParams({ from, to, subject, count });
        if (topic) params.set("topic", topic);
        if (subtopic) params.set("subtopic", subtopic);
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
  }, [configKey, from, to, subject, count, reviewGateOpen, targeted, topic, subtopic, resetSession]);

  const startTargetedPractice = () => {
    setReviewGateOpen(true);
  };

  if (targeted && !reviewGateOpen) {
    return (
      <TargetedReviewGate
        topic={targetLabel}
        state={reviewState ?? { status: "loading" }}
        onStart={startTargetedPractice}
        onBack={() => router.push("/study/records/what-to-study")}
      />
    );
  }

  if (loadState.status === "loading") return <LoadingQuiz />;

  if (loadState.status === "idle") return <LoadingQuiz />;

  if (loadState.status === "error") {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <TopBar
            showBack
            backHref={buildConfiguratorHref()}
            backLabel={targeted ? "返回學習分析" : "返回自由測驗"}
          />
          <section className="mt-8 rounded-[24px] border border-[#f0dddd] bg-white p-6">
            <div className="text-xl font-black text-[#9b5050]">無法建立自由測驗</div>
            <div className="mt-2 text-sm font-bold leading-6 text-[#70877a]">{loadState.message}</div>
            <button
              type="button"
              onClick={() => router.push(buildConfiguratorHref())}
              className="mt-5 rounded-xl bg-[#247451] px-5 py-3 text-sm font-black text-white"
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
    `${item.sourceYear} 年 · 第 ${item.sourceSession} 次 · ${subject}`;

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
          questionOutcomes: questions.map((item) => {
            const answer = answers[item.id];
            const answered = answer !== undefined;
            return {
              questionId: item.id,
              questionKey: sourceId(item),
              questionNumber: item.sourceQuestionNumber,
              userAnswer: answered ? answer : null,
              correctIndex: item.correctIndex,
              answered,
              correct:
                answered && item.correctIndex !== null
                  ? answer === item.correctIndex
                  : null,
              uncertain: Boolean(uncertain[item.id]),
            };
          }),
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
          <TopBar
            showBack
            backHref={buildConfiguratorHref()}
            backLabel={targeted ? "返回學習分析" : "返回自由測驗"}
          />

          <section className="study-panel mt-6 text-center">

            <h1 className="mt-2 text-3xl font-black">{targeted ? "這次補強完成" : "自由測驗完成"}</h1>
            <div className="mt-2 text-sm font-bold text-[#789083]">{from}–{to} 年 · {subject}</div>
            {targeted && (
              <div className="mx-auto mt-2 inline-flex rounded-full bg-[#eaf9f0] px-3 py-1 text-xs font-black text-[#237849]">
                {subtopic ? `${topic} · ${subtopic}` : topic}
              </div>
            )}

            <div className="mt-8 text-6xl font-black tracking-[-0.06em] text-[#17372a] sm:text-7xl">
              {score.toFixed(1)}
              <span className="ml-1 text-2xl tracking-normal text-[#789083]">%</span>
            </div>
            <div className="mt-4 text-sm font-bold text-[#70877a]">
              答對 {correctCount} / {gradableCount} 題 · {reviewQuestions.length} 題需要再看
            </div>
            <div className="mt-1 text-xs font-bold text-[#9aa9a1]">
              作答時間 {formatElapsed(elapsedAtFinish)}
            </div>

            {targeted && (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-[#bfe1cb] bg-[#eefaf2] px-4 py-4 text-left">
                <div className="text-sm font-black text-[#237849]">
                  這次補強正確率 {score.toFixed(1)}%
                </div>
                <div className="mt-1 text-xs font-bold leading-5 text-[#668276]">
                  {score >= 80
                    ? "這次表現不錯，但先不急著把弱點移除；之後在不同考卷再作答幾次，才能確認是否真的改善。"
                    : "這個主題還需要再補，先看這次錯題，再用下一份同主題練習驗證。"}
                </div>
              </div>
            )}

            <div className="mx-auto mt-6 flex max-w-xl flex-col gap-2 sm:flex-row">
              {reviewQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => router.push("/study/records?tab=mistakes")}
                  className="flex-1 rounded-xl bg-[#247451] px-5 py-3 font-black text-white"
                >
                  查看待複習題目
                </button>
              )}
              {targeted ? (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(buildTargetedQuizHref())}
                    className="flex-1 rounded-xl bg-[#247451] px-5 py-3 font-black text-white"
                  >
                    再做 10 題
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/study/records/what-to-study")}
                    className="flex-1 rounded-xl border border-[#d7e7de] bg-white px-5 py-3 font-black text-[#315b45]"
                  >
                    回到學習分析
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(buildConfiguratorHref())}
                  className="flex-1 rounded-xl border border-[#d7e7de] bg-white px-5 py-3 font-black text-[#315b45]"
                >
                  再組一份
                </button>
              )}
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
                        {item.sourceYear} 年・第 {item.sourceSession} 次・第 {item.sourceQuestionNumber} 題
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
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref={buildConfiguratorHref()} backLabel="返回設定" />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            {targeted ? "弱主題練習" : "自由測驗"} · {from}–{to} 年
          </div>
          <h1 className="mt-2 text-2xl font-black">{subject}</h1>
          {targeted && (
            <div className="mt-2 inline-flex rounded-full bg-[#eaf9f0] px-3 py-1.5 text-xs font-black text-[#237849]">
              {targetLabel}
            </div>
          )}
        </section>

        <p className="mt-4 text-sm leading-6 text-[#60786c]">點選項即可作答；不確定可先標記，交卷前再回來檢查。</p>
        <QuestionProgress
          questions={questions}
          currentIndex={index}
          getStatus={getQuestionStatus}
          onJump={setIndex}
        />

        <section className="study-panel mt-6 ">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-black text-[#789083]">
              Q{index + 1} / {questions.length}
            </div>
            <button
              type="button"
              onClick={() => setShowSubmit(true)}
              className="rounded-xl border border-[#ead8d8] bg-white px-4 py-2 text-sm font-black text-[#9b5050]"
            >
              交卷
            </button>
          </div>

          <div className="mt-4 text-xs font-black text-[#2ba962]">
            {question.sourceYear} 年・第 {question.sourceSession} 次・官方第 {question.sourceQuestionNumber} 題
          </div>

          <div className="ms-question-stem mt-5">{question.stem}</div>

          {question.hasImageHint && (
            <div className="mt-4 rounded-2xl border border-[#f0dfaa] bg-[#fff9e8] px-4 py-3 text-sm font-black leading-6 text-[#80651e]">
              🖼️ 本題包含圖表／影像，建議點開官方原題確認。
            </div>
          )}

          {question.sourceOnlyMode && !question.hasImageHint && (
            <div className="mt-4 rounded-2xl border border-[#e1e7e3] bg-[#f7faf8] px-4 py-3 text-sm font-black leading-6 text-[#60786c]">
              📄 本題文字解析可能不完整，建議點開官方原題確認。
            </div>
          )}

          {question.questionPdfUrl && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowOfficial(true)}
                className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-black text-[#315b45] transition hover:bg-[#f5faf7]"
              >
                📄 官方原題
              </button>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.id] === optionIndex;
              const struck = struckOptions[question.id]?.includes(optionIndex) ?? false;

              return (
                <QuizOption
                  key={`${question.id}-${optionIndex}`}
                  label={String.fromCharCode(65 + optionIndex)}
                  text={option}
                  selected={selected}
                  excluded={struck}
                  onSelect={() => setAnswers(current => ({ ...current, [question.id]: optionIndex }))}
                  onExclude={() => toggleStrike(question.id, optionIndex)}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              setUncertain((current) => ({
                ...current,
                [question.id]: !current[question.id],
              }))
            }
            className={[
              "mt-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left font-black transition",
              uncertain[question.id]
                ? "border-[#e2b94f] bg-[#fff8df] text-[#8a6814]"
                : "border-[#dfe8e2] bg-white text-[#557768] hover:bg-[#f7faf8]",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                uncertain[question.id]
                  ? "border-[#e2b94f] bg-[#e2b94f]"
                  : "border-[#b8c9bf] bg-white",
              ].join(" ")}
            >
              {uncertain[question.id] && (
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
              )}
            </span>
            ❓ 我不確定
          </button>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3 font-black text-[#315b45] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← 上一題
            </button>

            {index < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setIndex((current) => Math.min(questions.length - 1, current + 1))}
                className="rounded-xl bg-[#247451] px-5 py-3 font-black text-white transition hover:bg-[#1c5e40]"
              >
                下一題 →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmit(true)}
                className="rounded-xl bg-[#247451] px-5 py-3 font-black text-white transition hover:bg-[#1c5e40]"
              >
                交卷
              </button>
            )}
          </div>
        </section>
      </div>

      {showSubmit && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 px-4">
          <QuizDialog onClose={() => setShowSubmit(false)}>
            <div className="text-2xl font-black">是否要交卷？</div>
            {unanswered.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-[#f0dddd] bg-[#fff7f7] p-4 text-sm font-bold leading-6 text-[#9b5050]">
                尚有 {unanswered.length} 題未作答。
                <div className="mt-3 border-t border-[#ead8d8] pt-3 text-left leading-6 text-[#8f5151]">
                  未作答題號：{unanswered.map((item) => item.questionNumber).join("、")}
                </div>
                <div className="mt-3">確定仍要交卷嗎？</div>
              </div>
            ) : (
              <p className="mt-3 text-sm font-bold text-[#70877a]">已完成所有題目。</p>
            )}
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
                className="rounded-xl bg-[#247451] px-4 py-3 font-black text-white"
              >
                確認交卷
              </button>
            </div>
          </QuizDialog>
        </div>
      )}

      {showOfficial && question.questionPdfUrl && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/35 px-3 py-5">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[26px] border border-[#dce9e1] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>

                <div className="mt-1 text-xl font-black">
                  {question.sourceYear} 年・第 {question.sourceSession} 次・第 {question.sourceQuestionNumber} 題
                </div>
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

function QuestionProgress({
  questions,
  currentIndex,
  getStatus,
  onJump,
}: {
  questions: FreeQuestion[];
  currentIndex: number;
  getStatus: (questionId: string) => "green" | "yellow" | "red" | "gray";
  onJump: (index: number) => void;
}) {
  const segmentSize = 10;
  const segmentCount = Math.ceil(questions.length / segmentSize);
  const currentSegment = Math.floor(currentIndex / segmentSize);
  const segmentStart = currentSegment * segmentSize;
  const segmentEnd = Math.min(segmentStart + segmentSize, questions.length);
  const visibleQuestions = questions.slice(segmentStart, segmentEnd);

  const getSegmentStatus = (segmentIndex: number) => {
    const start = segmentIndex * segmentSize;
    const end = Math.min(start + segmentSize, questions.length);
    const segmentQuestions = questions.slice(start, end);
    const statuses = segmentQuestions.map((item) => getStatus(item.id));

    if (statuses.every((status) => status === "green")) return "green";
    if (
      statuses.every((status) => status !== "gray") &&
      statuses.some((status) => status === "yellow")
    ) {
      return "yellow";
    }
    if (statuses.some((status) => status === "red")) return "red";
    return "gray";
  };

  return (
    <section className="mt-5 rounded-[22px] border border-[#dce9e1] bg-white px-3 py-4 shadow-[0_8px_22px_rgba(31,83,53,0.04)] sm:px-4">
      <div className="flex items-center gap-3 overflow-x-auto pb-1 text-[11px] font-black text-[#70877a] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex shrink-0 items-center gap-1.5">
          <LegendDot color="green" />已作答
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <LegendDot color="yellow" />作答＋不確定
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <LegendDot color="red" />只有不確定
        </span>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Array.from({ length: segmentCount }, (_, segmentIndex) => {
          const active = segmentIndex === currentSegment;
          const status = getSegmentStatus(segmentIndex);
          const firstQuestionIndex = segmentIndex * segmentSize;
          const lastQuestionNumber = Math.min(firstQuestionIndex + segmentSize, questions.length);

          return (
            <button
              key={segmentIndex}
              type="button"
              onClick={() => onJump(firstQuestionIndex)}
              className={[
                "flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 transition",
                active
                  ? "border-[#8fd9aa] bg-[#eefaf2]"
                  : "border-[#e0e9e3] bg-white",
              ].join(" ")}
              title={`第 ${firstQuestionIndex + 1}–${lastQuestionNumber} 題`}
            >
              <SimpleSlime status={status} size="segment" active={active} />
              <span
                className={[
                  "text-[11px] font-black",
                  active ? "text-[#237849]" : "text-[#789083]",
                ].join(" ")}
              >
                {firstQuestionIndex + 1}–{lastQuestionNumber}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-10 gap-1">
        {visibleQuestions.map((item, offset) => {
          const questionIndex = segmentStart + offset;
          const current = questionIndex === currentIndex;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onJump(questionIndex)}
              className={[
                "flex min-w-0 flex-col items-center gap-0.5 rounded-lg py-1 transition",
                current ? "bg-[#f0faf4]" : "",
              ].join(" ")}
              aria-label={`跳到第 ${item.questionNumber} 題`}
            >
              <SimpleSlime
                status={getStatus(item.id)}
                size="question"
                active={current}
              />
              <span
                className={[
                  "text-[10px] font-black leading-none",
                  current ? "text-[#17372a]" : "text-[#8a9c92]",
                ].join(" ")}
              >
                {item.questionNumber}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SimpleSlime({
  status,
  size,
  active,
}: {
  status: "green" | "yellow" | "red" | "gray";
  size: "segment" | "question";
  active: boolean;
}) {
  const colors = {
    green: { body: "#b9efd1", border: "#55b97b", face: "#315b45" },
    yellow: { body: "#ffe8a3", border: "#e2b94f", face: "#6f5a1d" },
    red: { body: "#ffc9cf", border: "#de7777", face: "#7c3d46" },
    gray: { body: "#eef6f1", border: "#d6e5dc", face: "#759184" },
  }[status];

  const segment = size === "segment";
  const width = segment ? 26 : 20;
  const height = segment ? 19 : 15;

  return (
    <div
      className="relative shrink-0 transition"
      style={{
        width,
        height,
        borderRadius: "48% 48% 42% 42% / 56% 56% 42% 42%",
        background: colors.body,
        border: `1.5px solid ${colors.border}`,
        boxShadow: active ? "0 0 0 3px rgba(49,201,120,0.12)" : "none",
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          width: segment ? 2.5 : 2,
          height: segment ? 3.5 : 3,
          background: colors.face,
          left: segment ? 7.5 : 5.5,
          top: segment ? 6 : 4.5,
        }}
      />
      <span
        className="absolute rounded-full"
        style={{
          width: segment ? 2.5 : 2,
          height: segment ? 3.5 : 3,
          background: colors.face,
          right: segment ? 7.5 : 5.5,
          top: segment ? 6 : 4.5,
        }}
      />
      <span
        className="absolute rounded-b-full border-b"
        style={{
          width: segment ? 5.5 : 4.5,
          height: segment ? 3 : 2.5,
          borderColor: colors.face,
          left: "50%",
          bottom: segment ? 3.5 : 2.5,
          transform: "translateX(-50%)",
        }}
      />
    </div>
  );
}

function LegendDot({ color }: { color: "green" | "yellow" | "red" }) {
  const className = {
    green: "bg-[#55b97b]",
    yellow: "bg-[#e2b94f]",
    red: "bg-[#de7777]",
  }[color];
  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}

function ReviewContent({ review }: { review: WeakTopicReview }) {
  if (review.format === "comparison_table") {
    return (
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#dce9e1]">
        {review.items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="grid grid-cols-[minmax(88px,0.8fr)_1.7fr] border-b border-[#e8efeb] last:border-b-0"
          >
            <div className="bg-[#f2f8f4] px-3 py-3 text-xs font-black leading-5 text-[#315b45]">
              {item.label}
            </div>
            <div className="px-3 py-3 text-sm font-bold leading-6 text-[#557768]">
              {item.content}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (review.format === "steps") {
    return (
      <ol className="mt-5 space-y-3">
        {review.items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex gap-3 rounded-2xl bg-[#f7faf8] px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dff4e8] text-xs font-black text-[#237849]">
              {index + 1}
            </span>
            <div>
              <div className="text-sm font-black text-[#315b45]">{item.label}</div>
              <div className="mt-1 text-sm font-bold leading-6 text-[#557768]">{item.content}</div>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  if (review.format === "causal_chain") {
    return (
      <div className="mt-5 space-y-2">
        {review.items.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            <div className="rounded-2xl bg-[#f7faf8] px-4 py-3">
              <div className="text-sm font-black text-[#315b45]">{item.label}</div>
              <div className="mt-1 text-sm font-bold leading-6 text-[#557768]">{item.content}</div>
            </div>
            {index < review.items.length - 1 && (
              <div className="py-1 text-center text-lg font-black text-[#65b987]">↓</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (review.format === "pattern_match") {
    return (
      <div className="mt-5 space-y-3">
        {review.items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="grid gap-2 rounded-2xl bg-[#f7faf8] px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="text-sm font-black text-[#315b45]">看到：{item.label}</div>
            <div className="hidden font-black text-[#65b987] sm:block">→</div>
            <div className="text-sm font-bold leading-6 text-[#557768]">想到：{item.content}</div>
          </div>
        ))}
      </div>
    );
  }

  if (review.format === "formula_rules") {
    const [formula, ...rules] = review.items;
    return (
      <div className="mt-5">
        {formula && (
          <div className="rounded-2xl border border-[#cfe7d8] bg-[#eefaf2] px-4 py-4">
            <div className="text-xs font-black text-[#237849]">{formula.label}</div>
            <div className="mt-1 break-words text-base font-black leading-7 text-[#315b45]">{formula.content}</div>
          </div>
        )}
        <ul className="mt-3 space-y-2">
          {rules.map((item, index) => (
            <li key={`${item.label}-${index}`} className="rounded-2xl bg-[#f7faf8] px-4 py-3">
              <span className="text-sm font-black text-[#315b45]">{item.label}：</span>
              <span className="text-sm font-bold leading-6 text-[#557768]">{item.content}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className="mt-5 space-y-3">
      {review.items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="flex gap-3 rounded-2xl bg-[#f7faf8] px-4 py-3 text-sm leading-6">
          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#dff4e8] text-xs font-black text-[#237849]">
            ✓
          </span>
          <span>
            <strong className="font-black text-[#315b45]">{item.label}：</strong>
            <span className="font-bold text-[#557768]">{item.content}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function TargetedReviewGate({
  topic,
  state,
  onStart,
  onBack,
}: {
  topic: string;
  state: ReviewState;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study/records/what-to-study" backLabel="返回學習分析" />

        <section className="mt-7 rounded-[28px] border border-[#cfe7d8] bg-white p-5 shadow-[0_14px_34px_rgba(30,78,50,0.055)] sm:p-8">

          <h1 className="mt-2 text-3xl font-black">先補一下，再做題</h1>
          <div className="mt-2 inline-flex rounded-full bg-[#eaf9f0] px-3 py-1.5 text-xs font-black text-[#237849]">
            {topic}
          </div>

          {state.status === "loading" && (
            <div className="mt-7 rounded-2xl bg-[#f7faf8] px-4 py-6 text-center text-sm font-black text-[#789083]">
              正在整理 1–3 分鐘重點⋯
            </div>
          )}

          {state.status === "ready" && (
            <div className="mt-6">
              <h2 className="text-xl font-black text-[#237849]">{state.review.title}</h2>
              <p className="mt-3 text-sm font-bold leading-7 text-[#557768]">{state.review.summary}</p>
              <ReviewContent review={state.review} />
            </div>
          )}

          {state.status === "locked" && (
            <div className="mt-6 rounded-2xl border border-[#eadba9] bg-[#fffaf0] px-4 py-4 text-sm font-bold leading-6 text-[#80651e]">
              {state.message} 你仍可以直接做 10 題同主題練習，先確認自己的表現。
            </div>
          )}

          {state.status === "error" && (
            <div className="mt-6 rounded-2xl border border-[#f0dddd] bg-[#fff8f8] px-4 py-4 text-sm font-bold leading-6 text-[#9b5050]">
              {state.message} 你仍可以直接開始練習。
            </div>
          )}

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onStart}
              disabled={state.status === "loading"}
              className="flex-1 rounded-2xl bg-[#247451] px-5 py-4 text-base font-black text-white transition hover:bg-[#1c5e40] disabled:cursor-wait disabled:opacity-55"
            >
              開始 10 題補強 →
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded-2xl border border-[#d7e7de] bg-white px-5 py-4 text-sm font-black text-[#315b45]"
            >
              先回去
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function LoadingQuiz() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="flex min-h-[72vh] flex-col items-center justify-center px-4 text-center">
        <img
          src="/slimes/n-green.png"
          alt="正在組卷的綠色史萊姆"
          className="h-28 w-28 animate-bounce object-contain sm:h-32 sm:w-32"
        />
        <div className="mt-3 text-base font-black text-[#557768]">正在替你組卷…</div>
        <div className="mt-1 text-xs font-bold text-[#8a9c92]">從你選的年份與科目中抽題</div>
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
