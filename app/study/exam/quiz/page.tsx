"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import TopBar from "@/components/top-bar";
import OfficialQuestionCrop from "@/components/official-question-crop";
import AIExplanationButton from "@/components/ai-explanation-button";
import { useGameState } from "@/components/game-state-provider";
import { upsertMistakes } from "@/lib/mistake-store";

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

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; questions: Question[] };

const TUTORIAL_STORAGE_KEY =
  "medslime_exam_tutorial_seen_v2";

export default function ExamQuizPage() {
  return (
    <Suspense
      fallback={
        <LoadingExam />
      }
    >
      <ExamQuizContent />
    </Suspense>
  );
}

function ExamQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const game = useGameState();

  const year = searchParams.get("year") ?? "115";
  const session = searchParams.get("session") ?? "1";
  const subject =
    searchParams.get("subject") ?? "國考";

  const examKey = `${year}-${session}-${subject}`;

  const [loadState, setLoadState] =
    useState<LoadState>({
      status: "loading",
    });

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, number>
  >({});
  const [uncertain, setUncertain] = useState<
    Record<string, boolean>
  >({});
  const [struckOptions, setStruckOptions] =
    useState<Record<string, number[]>>({});
  const [finished, setFinished] =
    useState(false);
  const [
    showSubmitDialog,
    setShowSubmitDialog,
  ] = useState(false);
  const [showTutorial, setShowTutorial] =
    useState(false);
  const [showOriginalQuestion, setShowOriginalQuestion] =
    useState(false);
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadExam() {
      setLoadState({
        status: "loading",
      });

      setIndex(0);
      setAnswers({});
      setUncertain({});
      setStruckOptions({});
      setFinished(false);
      setRecorded(false);
      setShowSubmitDialog(false);

      try {
        const params =
          new URLSearchParams({
            year,
            session,
            subject,
          });

        const response = await fetch(
          `/api/national-exam?${params.toString()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "讀取國考題庫失敗。",
          );
        }

        const questions = Array.isArray(
          payload?.questions,
        )
          ? payload.questions
          : [];

        if (questions.length === 0) {
          throw new Error(
            "這份考卷在資料庫中找不到題目。請確認年度、梯次與科目名稱。",
          );
        }

        setLoadState({
          status: "ready",
          questions,
        });
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setLoadState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "讀取國考題庫失敗。",
        });
      }
    }

    loadExam();

    return () => {
      controller.abort();
    };
  }, [examKey, year, session, subject]);

  useEffect(() => {
    const seen =
      localStorage.getItem(
        TUTORIAL_STORAGE_KEY,
      );

    if (!seen) {
      setShowTutorial(true);
    }
  }, []);

  if (loadState.status === "loading") {
    return <LoadingExam />;
  }

  if (loadState.status === "error") {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">
          <TopBar
            showBack
            backHref="/study/exam"
            backLabel="返回選卷"
          />

          <div className="mt-10 rounded-[26px] border border-[#f0dddd] bg-white p-7">
            <div className="text-2xl font-black text-[#9b5050]">
              題庫讀取失敗
            </div>

            <div className="mt-3 font-bold leading-7 text-[#70877a]">
              {loadState.message}
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/study/exam",
                )
              }
              className="mt-6 rounded-xl bg-[#31c978] px-5 py-3 font-black text-white"
            >
              返回選卷
            </button>
          </div>
        </div>
      </main>
    );
  }

  const questions =
    loadState.questions;

  const question = questions[index];

  const correctCount =
    questions.reduce(
      (sum, item) =>
        sum +
        (item.correctIndex !== null &&
        answers[item.id] ===
          item.correctIndex
          ? 1
          : 0),
      0,
    );

  const gradableCount =
    questions.filter(
      (item) =>
        item.correctIndex !== null,
    ).length;

  const unansweredNumbers =
    questions
      .filter(
        (item) =>
          answers[item.id] ===
          undefined,
      )
      .map((item) => item.questionNumber);

  const unansweredCount =
    unansweredNumbers.length;

  const uncertainCount =
    Object.values(
      uncertain,
    ).filter(Boolean).length;

  const score =
    correctCount * 1.25;

  const toggleStrike = (
    questionId: string,
    optionIndex: number,
  ) => {
    setStruckOptions((current) => {
      const list =
        current[questionId] ?? [];
      const exists =
        list.includes(optionIndex);

      return {
        ...current,
        [questionId]: exists
          ? list.filter(
              (item) =>
                item !== optionIndex,
            )
          : [...list, optionIndex],
      };
    });
  };

  const getQuestionStatus = (
    questionId: string,
  ) => {
    const hasAnswer =
      answers[questionId] !==
      undefined;
    const isUncertain =
      uncertain[questionId] ??
      false;

    if (
      hasAnswer &&
      isUncertain
    ) {
      return "yellow";
    }

    if (hasAnswer) {
      return "green";
    }

    if (isUncertain) {
      return "red";
    }

    return "gray";
  };

  const saveMistakes = async () => {
    const now = new Date().toISOString();

    const records = questions
      .filter((item) => {
        const userAnswer = answers[item.id];
        const isWrong =
          item.correctIndex !== null &&
          userAnswer !== undefined &&
          userAnswer !== item.correctIndex;

        const isUncertain = uncertain[item.id] ?? false;

        return isWrong || isUncertain;
      })
      .map((item) => ({
        id: `national-exam:${year}:${session}:${subject}:${item.questionNumber}`,
        source: "national-exam" as const,
        sourceLabel: `民國 ${year} 年 · 第 ${session} 次 · ${subject}`,
        subject,
        year,
        session,
        questionNumber: item.questionNumber,
        stem: item.stem,
        options: item.options,
        correctIndex: item.correctIndex,
        userAnswer: answers[item.id] ?? null,
        uncertain: uncertain[item.id] ?? false,
        officialPdfUrl: item.questionPdfUrl,
        createdAt: now,
        reviewed: false,
      }));

    await upsertMistakes(records);
  };

  const finishExam = async () => {
    try {
      await saveMistakes();
    } catch (error) {
      console.error("國考錯題儲存失敗：", error);
    }

    if (!recorded) {
      game.recordQuestionsAnswered(Object.keys(answers).length);
      setRecorded(true);
    }

    setShowSubmitDialog(false);
    setFinished(true);
  };

  const closeTutorial = () => {
    localStorage.setItem(
      TUTORIAL_STORAGE_KEY,
      "1",
    );
    setShowTutorial(false);
  };

  const reviewQuestions = questions.filter((item) => {
    const userAnswer = answers[item.id];
    const isWrong =
      item.correctIndex !== null &&
      userAnswer !== undefined &&
      userAnswer !== item.correctIndex;
    const isUncertain = uncertain[item.id] ?? false;

    return isWrong || isUncertain;
  });

  if (finished) {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">
          <TopBar
            showBack
            backHref="/study/exam"
            backLabel="返回選卷"
          />

          <section className="mt-10 rounded-[30px] border border-[#dce9e1] bg-white p-8 text-center shadow-[0_14px_34px_rgba(30,78,50,0.06)]">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              RESULT
            </div>

            <h1 className="mt-2 text-4xl font-black">
              作答完成
            </h1>

            <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
              <ResultCard
                label="答對"
                value={`${correctCount} / ${gradableCount}`}
              />

              <ResultCard
                label="換算分數"
                value={`${score.toFixed(2)} 分`}
              />

              <ResultCard
                label="需要複習"
                value={`${reviewQuestions.length} 題`}
              />
            </div>

            {gradableCount < questions.length && (
              <div className="mx-auto mt-4 max-w-3xl rounded-2xl bg-[#fff8df] p-4 text-sm font-bold text-[#80651e]">
                有 {questions.length - gradableCount} 題目前沒有可用的單一標準答案，因此未納入計分。
              </div>
            )}

            {uncertainCount > 0 && (
              <div className="mt-4 text-sm font-bold text-[#789083]">
                你另外標記了 {uncertainCount} 題「我不確定」。
              </div>
            )}

            {reviewQuestions.length > 0 ? (
              <section className="mx-auto mt-8 max-w-3xl space-y-4 text-left">
                <div className="text-lg font-black text-[#17372a]">
                  需要複習的題目
                </div>

                {reviewQuestions.map((item) => {
                  const userAnswer = answers[item.id];
                  const isUncertain = uncertain[item.id] ?? false;
                  const isWrong =
                    item.correctIndex !== null &&
                    userAnswer !== undefined &&
                    userAnswer !== item.correctIndex;

                  return (
                    <div
                      key={`result-review-${item.id}`}
                      className="rounded-[22px] border border-[#dfe9e3] bg-[#fbfefc] p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-[#2ba962]">
                          第 {item.questionNumber} 題
                        </div>

                        {isWrong && (
                          <span className="rounded-full bg-[#fff1f1] px-3 py-1 text-xs font-black text-[#9b5050]">
                            答錯
                          </span>
                        )}

                        {isUncertain && (
                          <span className="rounded-full bg-[#fff8df] px-3 py-1 text-xs font-black text-[#80651e]">
                            ❓ 不確定
                          </span>
                        )}
                      </div>

                      <div className="mt-3 font-black leading-7 text-[#17372a]">
                        {item.stem}
                      </div>

                      <div className="mt-4 space-y-2">
                        {item.options.map((option, optionIndex) => {
                          const isCorrect =
                            item.correctIndex === optionIndex;
                          const isChosen =
                            userAnswer === optionIndex;

                          return (
                            <div
                              key={`result-${item.id}-${optionIndex}`}
                              className={[
                                "rounded-xl border px-4 py-3 text-sm font-bold",
                                isCorrect
                                  ? "border-[#9ed9b5] bg-[#edf9f1] text-[#315b45]"
                                  : isChosen
                                    ? "border-[#e6a2a2] bg-[#fff1f1] text-[#8b4747]"
                                    : "border-[#e1e9e4] bg-white text-[#60786c]",
                              ].join(" ")}
                            >
                              {String.fromCharCode(65 + optionIndex)}. {option}
                              {isCorrect && " ✓"}
                              {isChosen && !isCorrect && " ← 你的答案"}
                            </div>
                          );
                        })}
                      </div>

                      {item.correctIndex !== null && (
                        <AIExplanationButton
                          payload={{
                            questionKey: `national-exam:${year}:${session}:${subject}:${item.questionNumber}`,
                            source: "national-exam",
                            sourceLabel: `民國 ${year} 年 · 第 ${session} 次 · ${subject}`,
                            stem: item.stem,
                            options: item.options,
                            correctIndex: item.correctIndex,
                            userAnswer:
                              userAnswer === undefined
                                ? null
                                : userAnswer,
                            uncertain: isUncertain,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </section>
            ) : (
              <div className="mx-auto mt-8 max-w-3xl rounded-[22px] border border-[#cfe7d8] bg-[#f3fbf6] p-5 font-black text-[#237849]">
                ✓ 這次沒有需要複習的錯題或不確定題目。
              </div>
            )}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/study/mistakes",
                  )
                }
                className="rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white transition hover:bg-[#2dbc70]"
              >
                前往錯題庫
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/study/exam",
                  )
                }
                className="rounded-2xl border border-[#d7e7de] bg-white px-6 py-4 font-black text-[#315b45] transition hover:bg-[#f5faf7]"
              >
                返回上一頁
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
        <TopBar
          showBack
          backHref="/study/exam"
          backLabel="返回選卷"
        />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            民國 {year} 年 · 第{" "}
            {session} 次
          </div>

          <h1 className="mt-2 text-2xl font-black">
            {subject}
          </h1>

        </section>

        <QuestionProgress
          questions={questions}
          currentIndex={index}
          getStatus={
            getQuestionStatus
          }
          onJump={setIndex}
        />

        <section className="mt-6 rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-[0_12px_28px_rgba(30,78,50,0.055)] md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-black text-[#789083]">
              Q
              {
                question.questionNumber
              }{" "}
              / {questions.length}
            </div>

            <button
              type="button"
              onClick={() =>
                setShowSubmitDialog(
                  true,
                )
              }
              className="rounded-xl border border-[#ead8d8] bg-white px-4 py-2 text-sm font-black text-[#9b5050]"
            >
              結束測驗
            </button>
          </div>

          <div className="mt-5 text-base font-black leading-7 sm:text-lg sm:leading-8">
            {question.stem}
          </div>

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

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowOriginalQuestion(true)}
              className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-black text-[#315b45] transition hover:bg-[#f5faf7]"
            >
              📄 官方原題
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {question.options.map(
              (
                option,
                optionIndex,
              ) => {
                const selected =
                  answers[
                    question.id
                  ] === optionIndex;

                const struck =
                  struckOptions[
                    question.id
                  ]?.includes(
                    optionIndex,
                  ) ?? false;

                return (
                  <div
                    key={`${question.id}-${optionIndex}`}
                    className={[
                      "flex items-stretch rounded-2xl border transition",
                      selected
                        ? "border-[#65d795] bg-[#eaf9f0]"
                        : "border-[#dfe8e2] bg-white hover:bg-[#f7faf8]",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setAnswers(
                          (
                            current,
                          ) => ({
                            ...current,
                            [question.id]:
                              optionIndex,
                          }),
                        )
                      }
                      className="flex w-14 shrink-0 items-center justify-center"
                    >
                      <span
                        className={[
                          "flex h-6 w-6 items-center justify-center rounded-full border-2",
                          selected
                            ? "border-[#31c978] bg-[#31c978]"
                            : "border-[#b8c9bf] bg-white",
                        ].join(
                          " ",
                        )}
                      >
                        {selected && (
                          <span className="h-2.5 w-2.5 rounded-full bg-white" />
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleStrike(
                          question.id,
                          optionIndex,
                        )
                      }
                      className={[
                        "flex-1 px-3 py-3.5 text-left text-sm font-bold leading-6 text-[#466a58] sm:text-base",
                        struck
                          ? "line-through opacity-45"
                          : "",
                      ].join(" ")}
                    >
                      {String.fromCharCode(
                        65 +
                          optionIndex,
                      )}
                      . {option}
                    </button>
                  </div>
                );
              },
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setUncertain(
                (current) => ({
                  ...current,
                  [question.id]:
                    !current[
                      question.id
                    ],
                }),
              )
            }
            className={[
              "mt-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left font-black transition",
              uncertain[
                question.id
              ]
                ? "border-[#e2b94f] bg-[#fff8df] text-[#8a6814]"
                : "border-[#dfe8e2] bg-white text-[#557768] hover:bg-[#f7faf8]",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                uncertain[
                  question.id
                ]
                  ? "border-[#e2b94f] bg-[#e2b94f]"
                  : "border-[#b8c9bf] bg-white",
              ].join(" ")}
            >
              {uncertain[
                question.id
              ] && (
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
              )}
            </span>
            ❓ 我不確定
          </button>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() =>
                setIndex(
                  (current) =>
                    Math.max(
                      0,
                      current - 1,
                    ),
                )
              }
              className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3 font-black text-[#315b45] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← 上一題
            </button>

            {index <
            questions.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setIndex(
                    (current) =>
                      Math.min(
                        questions.length -
                          1,
                        current + 1,
                      ),
                  )
                }
                className="rounded-xl bg-[#31c978] px-5 py-3 font-black text-white transition hover:bg-[#2dbc70]"
              >
                下一題 →
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setShowSubmitDialog(
                    true,
                  )
                }
                className="rounded-xl bg-[#31c978] px-5 py-3 font-black text-white transition hover:bg-[#2dbc70]"
              >
                完成測驗
              </button>
            )}
          </div>
        </section>
      </div>

      {showSubmitDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-md rounded-[26px] border border-[#dce9e1] bg-white p-6 shadow-2xl">
            <div className="text-2xl font-black">
              是否要交卷？
            </div>

            {unansweredCount >
            0 ? (
              <div className="mt-3 rounded-2xl border border-[#f0dddd] bg-[#fff7f7] p-4 text-sm font-bold leading-6 text-[#9b5050]">
                尚有{" "}
                {
                  unansweredCount
                }{" "}
                題未作答。
                <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-left leading-6 text-[#8f5151]">
                  未作答題號：{unansweredNumbers.join("、")}
                </div>
                <div className="mt-3">
                  確定仍要交卷嗎？
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm font-bold text-[#70877a]">
                已完成所有題目。
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowSubmitDialog(
                    false,
                  )
                }
                className="rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-black text-[#315b45]"
              >
                繼續作答
              </button>

              <button
                type="button"
                onClick={finishExam}
                className="rounded-xl bg-[#31c978] px-4 py-3 font-black text-white"
              >
                確認交卷
              </button>
            </div>
          </div>
        </div>
      )}

      {showOriginalQuestion && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/35 px-5 py-8">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
                  OFFICIAL QUESTION
                </div>
                <div className="mt-1 text-2xl font-black">
                  官方原題 · 第 {question.questionNumber} 題
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOriginalQuestion(false)}
                className="rounded-xl border border-[#d7e7de] bg-white px-3 py-2 text-sm font-black text-[#60786c]"
              >
                關閉
              </button>
            </div>

            <div className="mt-6">
              <OfficialQuestionCrop
                pdfUrl={question.questionPdfUrl}
                questionNumber={question.questionNumber}
              />
            </div>
          </div>
        </div>
      )}

      {showTutorial && (
        <ExamTutorial
          onClose={
            closeTutorial
          }
        />
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
  questions: Question[];
  currentIndex: number;
  getStatus: (
    questionId: string,
  ) =>
    | "green"
    | "yellow"
    | "red"
    | "gray";
  onJump: (
    index: number,
  ) => void;
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
    if (statuses.every((status) => status !== "gray") && statuses.some((status) => status === "yellow")) {
      return "yellow";
    }
    if (statuses.some((status) => status === "red")) return "red";
    return "gray";
  };

  return (
    <section className="mt-6 rounded-[24px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-black text-[#70877a]">
        <span className="flex items-center gap-2">
          <LegendDot color="green" />
          已作答
        </span>
        <span className="flex items-center gap-2">
          <LegendDot color="yellow" />
          已作答＋不確定
        </span>
        <span className="flex items-center gap-2">
          <LegendDot color="red" />
          只有不確定
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: segmentCount }, (_, segmentIndex) => {
          const active = segmentIndex === currentSegment;
          const status = getSegmentStatus(segmentIndex);
          const firstQuestionIndex = segmentIndex * segmentSize;

          return (
            <button
              key={segmentIndex}
              type="button"
              onClick={() => onJump(firstQuestionIndex)}
              className="flex flex-col items-center"
              title={`第 ${firstQuestionIndex + 1}–${Math.min(
                firstQuestionIndex + segmentSize,
                questions.length,
              )} 題`}
            >
              <SimpleSlime
                status={status}
                large
                active={active}
              />
            </button>
          );
        })}
      </div>

      <div className="my-5 text-center text-base font-black text-[#607c6d]">
        目前區段：第 {segmentStart + 1}–{segmentEnd} 題
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {visibleQuestions.map((item, offset) => {
          const questionIndex = segmentStart + offset;
          const current = questionIndex === currentIndex;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onJump(questionIndex)}
              className="flex flex-col items-center gap-1"
            >
              <SimpleSlime
                status={getStatus(item.id)}
                large={false}
                active={current}
              />

              <span
                className={[
                  "text-[11px] font-black",
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
  large,
  active,
}: {
  status:
    | "green"
    | "yellow"
    | "red"
    | "gray";
  large: boolean;
  active: boolean;
}) {
  const colors = {
    green: {
      body: "#b9efd1",
      border: "#55b97b",
      face: "#315b45",
    },
    yellow: {
      body: "#ffe8a3",
      border: "#e2b94f",
      face: "#6f5a1d",
    },
    red: {
      body: "#ffc9cf",
      border: "#de7777",
      face: "#7c3d46",
    },
    gray: {
      body: "#eef6f1",
      border: "#d6e5dc",
      face: "#759184",
    },
  }[status];

  const width = large ? 42 : 26;
  const height = large ? 30 : 20;

  return (
    <div
      className={[
        "relative flex items-center justify-center transition",
        active ? "scale-105" : "",
      ].join(" ")}
      style={{
        width,
        height,
        borderRadius:
          "48% 48% 42% 42% / 56% 56% 42% 42%",
        background:
          colors.body,
        border: `2px solid ${colors.border}`,
        boxShadow: active
          ? "0 0 0 4px rgba(49,201,120,0.13)"
          : "0 2px 6px rgba(31,83,53,0.06)",
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          width: large ? 4 : 2.5,
          height: large ? 5 : 3.5,
          background:
            colors.face,
          left: large ? 12 : 7.5,
          top: large ? 10 : 6.5,
        }}
      />
      <span
        className="absolute rounded-full"
        style={{
          width: large ? 4 : 2.5,
          height: large ? 5 : 3.5,
          background:
            colors.face,
          right: large ? 12 : 7.5,
          top: large ? 10 : 6.5,
        }}
      />
      <span
        className="absolute rounded-b-full border-b-2"
        style={{
          width: large ? 8 : 5.5,
          height: large ? 4 : 3,
          borderColor:
            colors.face,
          bottom: large ? 6 : 4,
        }}
      />
    </div>
  );
}

function LegendDot({
  color,
}: {
  color:
    | "green"
    | "yellow"
    | "red";
}) {
  const colorMap = {
    green: "#55b97b",
    yellow: "#e2b94f",
    red: "#de4760",
  };

  return (
    <span
      className="inline-block h-3 w-3 rounded-full"
      style={{
        background:
          colorMap[color],
        boxShadow: `0 0 8px ${colorMap[color]}66`,
      }}
    />
  );
}

function ExamTutorial({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#f6fcf8]/96 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            第一次作答？
          </div>
          <h2 className="mt-2 text-3xl font-black">
            三個操作就夠了
          </h2>
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-[26px] border border-[#dce9e1] bg-white p-6 shadow-[0_14px_36px_rgba(31,83,53,0.06)]">
          <div className="grid gap-5 md:grid-cols-3">
            <TutorialItem
              icon="◯"
              title="點圓圈"
              copy="選擇正式答案"
            />
            <TutorialItem
              icon="Aa"
              title="點選項文字"
              copy="劃掉／取消劃掉選項"
            />
            <TutorialItem
              icon="?"
              title="我不確定"
              copy="答案照樣保留，同時標記這題不熟"
            />
          </div>

          <div className="mt-6 border-t border-[#e4ece7] pt-5">
            <div className="text-sm font-black text-[#315b45]">
              上方的史萊姆可以快速跳題
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl bg-[#f8fcf9] px-4 py-3">
                <SimpleSlime
                  status="gray"
                  large
                  active={false}
                />
                <div>
                  <div className="text-sm font-black text-[#315b45]">
                    大史萊姆
                  </div>
                  <div className="mt-0.5 text-xs font-bold leading-5 text-[#789083]">
                    每 10 題一個區段，點一下快速切換。
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-[#f8fcf9] px-4 py-3">
                <SimpleSlime
                  status="gray"
                  large={false}
                  active={false}
                />
                <div>
                  <div className="text-sm font-black text-[#315b45]">
                    小史萊姆
                  </div>
                  <div className="mt-0.5 text-xs font-bold leading-5 text-[#789083]">
                    代表單一題目，點一下直接跳到那一題。
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm font-bold leading-6 text-[#789083]">
              綠色＝已作答、黃色＝已作答＋不確定、紅色＝只有不確定。
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-6 block w-full max-w-4xl rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white"
        >
          知道了，開始作答
        </button>
      </div>
    </div>
  );
}

function TutorialItem({
  icon,
  title,
  copy,
}: {
  icon: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d7e7de] bg-white text-lg font-black">
        {icon}
      </div>

      <div>
        <div className="text-lg font-black">
          {title}
        </div>
        <div className="mt-1 text-sm font-bold leading-6 text-[#789083]">
          {copy}
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#dfece4] bg-[#f8fcf9] p-5">
      <div className="text-sm font-bold text-[#789083]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">
        {value}
      </div>
    </div>
  );
}

function LoadingExam() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-16 w-20 rounded-[50%_50%_42%_42%/56%_56%_42%_42%] border-2 border-[#69c88f] bg-[#b9efd1]" />
          <div className="mt-5 text-xl font-black">
            正在搬出國考題庫...
          </div>
          <div className="mt-2 text-sm font-bold text-[#789083]">
            從 Supabase 讀取真題中
          </div>
        </div>
      </div>
    </main>
  );
}
