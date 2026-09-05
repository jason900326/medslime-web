"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/top-bar";
import { useGameState } from "@/components/game-state-provider";
import AIExplanationButton from "@/components/ai-explanation-button";
import { upsertMistakes } from "@/lib/mistake-store";

type Question = {
  id: string;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  sourcePage: number | null;
};

type StoredQuiz = {
  ownerUserId: string | null;
  fileName: string;
  createdAt: string;
  analysis: {
    title: string;
    summary: string;
    keyPoints: string[];
  };
  questions: Array<{
    stem: string;
    options: string[];
    answer: number;
    explanation: string;
    sourcePage: number | null;
  }>;
};

const QUIZ_STORAGE_KEY = "medslime_material_quiz_v2";
const ACTIVE_USER_KEY = "medslime_active_user_id";

function loadStoredQuiz(): {
  sourceName: string;
  questions: Question[];
  error: string | null;
} {
  if (typeof window === "undefined") {
    return { sourceName: "你的教材", questions: [], error: null };
  }

  try {
    const raw = sessionStorage.getItem(QUIZ_STORAGE_KEY);

    if (!raw) {
      return {
        sourceName: "你的教材",
        questions: [],
        error: "找不到剛才產生的教材測驗，請回上一頁重新分析教材。",
      };
    }

    const parsed = JSON.parse(raw) as StoredQuiz;
    const activeUserId = sessionStorage.getItem(ACTIVE_USER_KEY) ?? null;

    if ((parsed.ownerUserId ?? null) !== activeUserId) {
      return {
        sourceName: "你的教材",
        questions: [],
        error: "這份教材測驗不是目前帳號產生的，請回上一頁重新分析教材。",
      };
    }

    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 10) {
      return {
        sourceName: parsed.fileName || "你的教材",
        questions: [],
        error: "教材測驗資料不完整，請回上一頁重新分析教材。",
      };
    }

    return {
      sourceName: parsed.fileName || "你的教材",
      questions: parsed.questions.map((item, index) => ({
        id: `material:${parsed.createdAt}:${index + 1}`,
        stem: item.stem,
        options: item.options,
        answer: item.answer,
        explanation: item.explanation,
        sourcePage: item.sourcePage,
      })),
      error: null,
    };
  } catch {
    return {
      sourceName: "你的教材",
      questions: [],
      error: "教材測驗資料讀取失敗，請回上一頁重新分析教材。",
    };
  }
}

export default function MaterialQuizPage() {
  const router = useRouter();
  const game = useGameState();

  const [sourceName, setSourceName] = useState("你的教材");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [uncertain, setUncertain] = useState<Record<string, boolean>>({});
  const [struckOptions, setStruckOptions] = useState<Record<string, number[]>>({});
  const [finished, setFinished] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    const loaded = loadStoredQuiz();
    setSourceName(loaded.sourceName);
    setQuestions(loaded.questions);
    setLoadError(loaded.error);
    setReady(true);
  }, []);

  const question = questions[index];

  const correctCount = useMemo(
    () =>
      questions.reduce(
        (sum, item) => sum + (answers[item.id] === item.answer ? 1 : 0),
        0,
      ),
    [answers, questions],
  );

  const uncertainCount = useMemo(
    () => Object.values(uncertain).filter(Boolean).length,
    [uncertain],
  );

  const reviewQuestions = useMemo(
    () =>
      questions.filter((item) => {
        const userAnswer = answers[item.id];
        const isWrong =
          userAnswer !== undefined && userAnswer !== item.answer;
        return isWrong || (uncertain[item.id] ?? false);
      }),
    [answers, questions, uncertain],
  );

  const score = questions.length > 0
    ? (correctCount / questions.length) * 100
    : 0;

  const unansweredNumbers = useMemo(
    () =>
      questions
        .map((item, questionIndex) => ({ item, number: questionIndex + 1 }))
        .filter(({ item }) => answers[item.id] === undefined)
        .map(({ number }) => number),
    [answers, questions],
  );

  const unansweredCount = unansweredNumbers.length;

  const toggleStrike = (questionId: string, optionIndex: number) => {
    setStruckOptions((current) => {
      const currentList = current[questionId] ?? [];
      const exists = currentList.includes(optionIndex);
      return {
        ...current,
        [questionId]: exists
          ? currentList.filter((item) => item !== optionIndex)
          : [...currentList, optionIndex],
      };
    });
  };

  const getStatus = (id: string) => {
    const hasAnswer = answers[id] !== undefined;
    const isUncertain = uncertain[id] ?? false;
    if (hasAnswer && isUncertain) return "yellow" as const;
    if (hasAnswer) return "green" as const;
    if (isUncertain) return "red" as const;
    return "gray" as const;
  };

  const saveMistakes = async () => {
    const now = new Date().toISOString();

    const records = questions
      .map((item, questionIndex) => ({
        item,
        questionIndex,
        userAnswer: answers[item.id],
        isUncertain: uncertain[item.id] ?? false,
      }))
      .filter(({ item, userAnswer, isUncertain }) => {
        const isWrong =
          userAnswer !== undefined && userAnswer !== item.answer;
        return isWrong || isUncertain;
      })
      .map(({ item, questionIndex, userAnswer, isUncertain }) => ({
        id: `material:${sourceName}:${item.id}`,
        source: "material" as const,
        sourceLabel:
          item.sourcePage !== null
            ? `${sourceName} · Page ${item.sourcePage}`
            : sourceName,
        questionNumber: questionIndex + 1,
        stem: item.stem,
        options: item.options,
        correctIndex: item.answer,
        userAnswer: userAnswer ?? null,
        uncertain: isUncertain,
        officialPdfUrl: null,
        explanation: item.explanation,
        createdAt: now,
        reviewed: false,
      }));

    await upsertMistakes(records);
  };

  const finishQuiz = async () => {
    try {
      await saveMistakes();
    } catch (error) {
      console.error("教材錯題儲存失敗：", error);
    }

    if (!recorded) {
      game.recordQuestionsAnswered(Object.keys(answers).length);
      setRecorded(true);
    }

    setShowSubmitDialog(false);
    setFinished(true);
  };

  if (!ready) return <LoadingQuiz />;

  if (loadError || questions.length === 0 || !question) {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">
          <TopBar showBack backHref="/study/material" backLabel="返回教材" />
          <section className="mt-10 rounded-[28px] border border-[#f0dddd] bg-white p-7">
            <div className="text-2xl font-black text-[#9b5050]">找不到教材測驗</div>
            <p className="mt-3 font-bold leading-7 text-[#70877a]">
              {loadError ?? "請回上一頁重新分析教材。"}
            </p>
            <button
              type="button"
              onClick={() => router.push("/study/material")}
              className="mt-6 rounded-xl bg-[#31c978] px-5 py-3 font-black text-white"
            >
              返回教材分析
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">
          <TopBar showBack backHref="/study/material" backLabel="返回教材" />

          <section className="mt-10 rounded-[30px] border border-[#dce9e1] bg-white p-8 text-center shadow-[0_14px_34px_rgba(30,78,50,0.06)]">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">RESULT</div>
            <h1 className="mt-2 text-4xl font-black">作答完成</h1>

            <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
              <ResultCard label="答對" value={`${correctCount} / ${questions.length}`} />
              <ResultCard label="換算分數" value={`${score.toFixed(2)} 分`} />
              <ResultCard label="需要複習" value={`${reviewQuestions.length} 題`} />
            </div>

            {uncertainCount > 0 && (
              <div className="mt-4 text-sm font-bold text-[#789083]">
                你另外標記了 {uncertainCount} 題「我不確定」。
              </div>
            )}

            {reviewQuestions.length > 0 ? (
              <section className="mx-auto mt-8 max-w-3xl space-y-4 text-left">
                <div className="text-lg font-black text-[#17372a]">需要複習的題目</div>

                {reviewQuestions.map((item) => {
                  const questionIndex = questions.findIndex((questionItem) => questionItem.id === item.id);
                  const userAnswer = answers[item.id];
                  const isUncertain = uncertain[item.id] ?? false;
                  const isWrong =
                    userAnswer !== undefined && userAnswer !== item.answer;

                  return (
                    <div
                      key={`result-review-${item.id}`}
                      className="rounded-[22px] border border-[#dfe9e3] bg-[#fbfefc] p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-[#2ba962]">
                          第 {questionIndex + 1} 題
                          {item.sourcePage !== null ? ` · Page ${item.sourcePage}` : ""}
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
                          const isCorrect = item.answer === optionIndex;
                          const isChosen = userAnswer === optionIndex;
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

                      <AIExplanationButton
                        payload={{
                          questionKey: item.id,
                          source: "material",
                          sourceLabel:
                            item.sourcePage !== null
                              ? `${sourceName} · Page ${item.sourcePage}`
                              : sourceName,
                          stem: item.stem,
                          options: item.options,
                          correctIndex: item.answer,
                          userAnswer: userAnswer === undefined ? null : userAnswer,
                          uncertain: isUncertain,
                          existingExplanation: item.explanation,
                        }}
                      />
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
                onClick={() => router.push("/study/mistakes")}
                className="rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white transition hover:bg-[#2dbc70]"
              >
                前往錯題庫
              </button>
              <button
                type="button"
                onClick={() => router.push("/study/material")}
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
        <TopBar showBack backHref="/study/material" backLabel="返回教材" />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            MATERIAL QUIZ
          </div>
          <h1 className="mt-2 truncate text-2xl font-black">{sourceName}</h1>
        </section>

        <QuestionProgress
          questions={questions}
          currentIndex={index}
          getStatus={getStatus}
          onJump={setIndex}
        />

        <section className="mt-6 rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-[0_12px_28px_rgba(30,78,50,0.055)] md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-[#789083]">
                Q{index + 1} / {questions.length}
              </div>
              {question.sourcePage !== null && (
                <div className="mt-1 text-xs font-bold text-[#93a49a]">
                  教材 Page {question.sourcePage}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitDialog(true)}
              className="rounded-xl border border-[#ead8d8] bg-white px-4 py-2 text-sm font-black text-[#9b5050]"
            >
              結束測驗
            </button>
          </div>

          <div className="mt-5 text-base font-black leading-7 sm:text-lg sm:leading-8">
            {question.stem}
          </div>

          <div className="mt-6 space-y-3">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.id] === optionIndex;
              const struck = struckOptions[question.id]?.includes(optionIndex) ?? false;

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
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: optionIndex,
                      }))
                    }
                    className="flex w-14 shrink-0 items-center justify-center"
                  >
                    <span className={[
                      "flex h-6 w-6 items-center justify-center rounded-full border-2",
                      selected
                        ? "border-[#31c978] bg-[#31c978]"
                        : "border-[#b8c9bf] bg-white",
                    ].join(" ")}>
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStrike(question.id, optionIndex)}
                    className={[
                      "flex-1 px-3 py-3.5 text-left text-sm font-bold leading-6 text-[#466a58] sm:text-base",
                      struck ? "line-through opacity-45" : "",
                    ].join(" ")}
                  >
                    {String.fromCharCode(65 + optionIndex)}. {option}
                  </button>
                </div>
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
            <span className={[
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
              uncertain[question.id]
                ? "border-[#e2b94f] bg-[#e2b94f]"
                : "border-[#b8c9bf] bg-white",
            ].join(" ")}>
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
                onClick={() =>
                  setIndex((current) => Math.min(questions.length - 1, current + 1))
                }
                className="rounded-xl bg-[#31c978] px-5 py-3 font-black text-white transition hover:bg-[#2dbc70]"
              >
                下一題 →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitDialog(true)}
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
            <div className="text-2xl font-black">是否要交卷？</div>

            {unansweredCount > 0 ? (
              <div className="mt-3 rounded-2xl border border-[#f0dddd] bg-[#fff7f7] p-4 text-sm font-bold leading-6 text-[#9b5050]">
                尚有 {unansweredCount} 題未作答。
                <div className="mt-3 rounded-xl bg-white/70 px-3 py-2">
                  未作答題號：{unansweredNumbers.join("、")}
                </div>
                <div className="mt-3">確定仍要交卷嗎？</div>
              </div>
            ) : (
              <p className="mt-3 text-sm font-bold text-[#70877a]">已完成所有題目。</p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitDialog(false)}
                className="rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-black text-[#315b45]"
              >
                繼續作答
              </button>
              <button
                type="button"
                onClick={finishQuiz}
                className="rounded-xl bg-[#31c978] px-4 py-3 font-black text-white"
              >
                確認交卷
              </button>
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
  questions: Question[];
  currentIndex: number;
  getStatus: (id: string) => "green" | "yellow" | "red" | "gray";
  onJump: (index: number) => void;
}) {
  return (
    <section className="mt-6 rounded-[24px] border border-[#dce9e1] bg-white p-4">
      <div className="flex flex-wrap justify-center gap-3">
        {questions.map((item, questionIndex) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onJump(questionIndex)}
            className="flex flex-col items-center gap-1"
          >
            <SimpleSlime
              status={getStatus(item.id)}
              active={questionIndex === currentIndex}
            />
            <span className="text-[10px] font-black text-[#789083]">
              {questionIndex + 1}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SimpleSlime({
  status,
  active,
}: {
  status: "green" | "yellow" | "red" | "gray";
  active: boolean;
}) {
  const colors = {
    green: { body: "#b9efd1", border: "#55b97b", face: "#315b45" },
    yellow: { body: "#ffe8a3", border: "#e2b94f", face: "#6f5a1d" },
    red: { body: "#ffc9cf", border: "#de7777", face: "#7c3d46" },
    gray: { body: "#eef6f1", border: "#d6e5dc", face: "#759184" },
  }[status];

  return (
    <div
      className={[
        "relative flex h-[29px] w-[38px] items-center justify-center transition",
        active ? "scale-110" : "",
      ].join(" ")}
      style={{
        borderRadius: "48% 48% 42% 42% / 56% 56% 42% 42%",
        background: colors.body,
        border: `2px solid ${colors.border}`,
        boxShadow: active
          ? "0 0 0 4px rgba(49,201,120,0.13)"
          : "0 2px 6px rgba(31,83,53,0.06)",
      }}
    >
      <span
        className="absolute h-[5px] w-[3.5px] rounded-full"
        style={{ background: colors.face, left: 11, top: 10 }}
      />
      <span
        className="absolute h-[5px] w-[3.5px] rounded-full"
        style={{ background: colors.face, right: 11, top: 10 }}
      />
      <span
        className="absolute bottom-[6px] h-[4px] w-[8px] rounded-b-full border-b-2"
        style={{ borderColor: colors.face }}
      />
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#dfece4] bg-[#f8fcf9] p-5">
      <div className="text-sm font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

function LoadingQuiz() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#b9efd1]" />
          <div className="mt-4 font-black">正在準備教材測驗...</div>
        </div>
      </div>
    </main>
  );
}
