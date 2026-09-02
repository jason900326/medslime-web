"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";

type Question = {
  id: string;
  stem: string;
  options: string[];
  answer: number;
};

const mockQuestions: Question[] = [
  {
    id: "q1",
    stem: "下列何者最符合 Staphylococcus aureus 的典型特徵？",
    options: [
      "Catalase negative、coagulase negative",
      "Catalase positive、coagulase positive",
      "Oxidase positive、indole positive",
      "Urease negative、PYR positive",
    ],
    answer: 1,
  },
  {
    id: "q2",
    stem: "下列哪一項酵素最常用來評估膽汁鬱積相關變化？",
    options: ["ALT", "AST", "ALP", "CK-MB"],
    answer: 2,
  },
  {
    id: "q3",
    stem: "缺鐵性貧血最典型的紅血球型態為何？",
    options: [
      "Macrocytic hyperchromic",
      "Normocytic normochromic",
      "Microcytic hypochromic",
      "Spherocytic hyperchromic",
    ],
    answer: 2,
  },
];

const TUTORIAL_STORAGE_KEY = "medslime_exam_tutorial_seen_v1";

export default function ExamQuizPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
          <div className="mx-auto max-w-4xl px-5 py-10 text-center font-black">
            載入考卷中...
          </div>
        </main>
      }
    >
      <ExamQuizContent />
    </Suspense>
  );
}

function ExamQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const year = searchParams.get("year") ?? "115";
  const session = searchParams.get("session") ?? "1";
  const subject = searchParams.get("subject") ?? "國考";

  const examKey = `${year}-${session}-${subject}`;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [uncertain, setUncertain] = useState<Record<string, boolean>>({});
  const [struckOptions, setStruckOptions] = useState<Record<string, number[]>>(
    {},
  );
  const [finished, setFinished] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setIndex(0);
    setAnswers({});
    setUncertain({});
    setStruckOptions({});
    setFinished(false);
    setShowSubmitDialog(false);
  }, [examKey]);

  useEffect(() => {
    const seen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!seen) {
      setShowTutorial(true);
    }
  }, []);

  const question = mockQuestions[index];

  const correctCount = useMemo(() => {
    return mockQuestions.reduce((sum, item) => {
      return sum + (answers[item.id] === item.answer ? 1 : 0);
    }, 0);
  }, [answers]);

  const unansweredCount = useMemo(() => {
    return mockQuestions.filter((item) => answers[item.id] === undefined).length;
  }, [answers]);

  const score = correctCount * 1.25;

  const requestSubmit = () => {
    setShowSubmitDialog(true);
  };

  const confirmSubmit = () => {
    setShowSubmitDialog(false);
    setFinished(true);
  };

  const closeTutorial = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
    setShowTutorial(false);
  };

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

  const getQuestionStatus = (questionId: string) => {
    const hasAnswer = answers[questionId] !== undefined;
    const isUncertain = uncertain[questionId] ?? false;

    if (hasAnswer && isUncertain) return "yellow";
    if (hasAnswer) return "green";
    if (isUncertain) return "red";
    return "gray";
  };

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

            <h1 className="mt-2 text-4xl font-black">作答完成</h1>

            <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
              <ResultCard
                label="答對"
                value={`${correctCount} / ${mockQuestions.length}`}
              />
              <ResultCard
                label="換算分數"
                value={`${score.toFixed(2)} 分`}
              />
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => {
                  setAnswers({});
                  setUncertain({});
                  setStruckOptions({});
                  setIndex(0);
                  setFinished(false);
                  setShowSubmitDialog(false);
                }}
                className="rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white transition hover:bg-[#2dbc70]"
              >
                再做一次
              </button>

              <button
                onClick={() => router.push("/study/exam")}
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
            民國 {year} 年 · 第 {session} 次
          </div>
          <h1 className="mt-2 text-2xl font-black">{subject}</h1>
        </section>

        <QuestionProgress
          questions={mockQuestions}
          currentIndex={index}
          getStatus={getQuestionStatus}
          onJump={setIndex}
        />

        <section className="mt-6 rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-[0_12px_28px_rgba(30,78,50,0.055)] md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-black text-[#789083]">
              Q{index + 1} / {mockQuestions.length}
            </div>

            <button
              onClick={requestSubmit}
              className="rounded-xl border border-[#ead8d8] bg-white px-4 py-2 text-sm font-black text-[#9b5050]"
            >
              結束測驗
            </button>
          </div>

          <div className="mt-6 text-xl font-black leading-9">
            {question.stem}
          </div>

          <div className="mt-6 space-y-3">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.id] === optionIndex;
              const struck =
                struckOptions[question.id]?.includes(optionIndex) ?? false;

              return (
                <div
                  key={option}
                  className={[
                    "flex items-stretch rounded-2xl border transition",
                    selected
                      ? "border-[#65d795] bg-[#eaf9f0]"
                      : "border-[#dfe8e2] bg-white hover:bg-[#f7faf8]",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    aria-label={`選擇 ${String.fromCharCode(
                      65 + optionIndex,
                    )}`}
                    onClick={() =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: optionIndex,
                      }))
                    }
                    className="flex w-14 shrink-0 items-center justify-center"
                  >
                    <span
                      className={[
                        "flex h-6 w-6 items-center justify-center rounded-full border-2 transition",
                        selected
                          ? "border-[#31c978] bg-[#31c978]"
                          : "border-[#b8c9bf] bg-white",
                      ].join(" ")}
                    >
                      {selected && (
                        <span className="h-2.5 w-2.5 rounded-full bg-white" />
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStrike(question.id, optionIndex)}
                    className={[
                      "flex-1 px-3 py-4 text-left font-bold text-[#466a58]",
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
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3 font-black text-[#315b45] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← 上一題
            </button>

            {index < mockQuestions.length - 1 ? (
              <button
                onClick={() =>
                  setIndex((current) =>
                    Math.min(mockQuestions.length - 1, current + 1),
                  )
                }
                className="rounded-xl bg-[#31c978] px-5 py-3 font-black text-white transition hover:bg-[#2dbc70]"
              >
                下一題 →
              </button>
            ) : (
              <button
                onClick={requestSubmit}
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
            <div className="text-2xl font-black text-[#17372a]">
              是否要交卷？
            </div>

            {unansweredCount > 0 ? (
              <div className="mt-3 rounded-2xl border border-[#f0dddd] bg-[#fff7f7] p-4 text-sm font-bold leading-6 text-[#9b5050]">
                尚有 {unansweredCount} 題未作答。
                <br />
                確定仍要交卷嗎？
              </div>
            ) : (
              <p className="mt-3 text-sm font-bold leading-6 text-[#70877a]">
                已完成所有題目，確認後將送出本次測驗。
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowSubmitDialog(false)}
                className="rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-black text-[#315b45] transition hover:bg-[#f5faf7]"
              >
                繼續作答
              </button>

              <button
                onClick={confirmSubmit}
                className="rounded-xl bg-[#31c978] px-4 py-3 font-black text-white transition hover:bg-[#2dbc70]"
              >
                確認交卷
              </button>
            </div>
          </div>
        </div>
      )}

      {showTutorial && <ExamTutorial onClose={closeTutorial} />}
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
  getStatus: (questionId: string) => "green" | "yellow" | "red" | "gray";
  onJump: (index: number) => void;
}) {
  return (
    <section className="mt-6 rounded-[24px] border border-[#dce9e1] bg-white p-4 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-black text-[#70877a]">
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

      <div className="flex flex-wrap items-end gap-3">
        {questions.map((item, questionIndex) => {
          const status = getStatus(item.id);
          const isTenth = (questionIndex + 1) % 10 === 0;
          const current = questionIndex === currentIndex;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onJump(questionIndex)}
              className="flex flex-col items-center gap-1"
              title={`第 ${questionIndex + 1} 題`}
            >
              <SimpleSlime
                status={status}
                large={isTenth}
                active={current}
              />

              <span
                className={[
                  "font-black",
                  current ? "text-[#17372a]" : "text-[#8a9c92]",
                  isTenth ? "text-xs" : "text-[10px]",
                ].join(" ")}
              >
                {questionIndex + 1}
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
  status: "green" | "yellow" | "red" | "gray";
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

  const width = large ? 58 : 38;
  const height = large ? 42 : 29;

  return (
    <div
      className={[
        "relative flex items-center justify-center transition",
        active ? "scale-110" : "",
      ].join(" ")}
      style={{
        width,
        height,
        borderRadius: "48% 48% 42% 42% / 56% 56% 42% 42%",
        background: colors.body,
        border: `2px solid ${colors.border}`,
        boxShadow: active
          ? "0 0 0 4px rgba(49,201,120,0.13)"
          : "0 2px 6px rgba(31,83,53,0.06)",
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          width: large ? 5 : 3.5,
          height: large ? 7 : 5,
          background: colors.face,
          left: large ? 17 : 11,
          top: large ? 15 : 10,
        }}
      />
      <span
        className="absolute rounded-full"
        style={{
          width: large ? 5 : 3.5,
          height: large ? 7 : 5,
          background: colors.face,
          right: large ? 17 : 11,
          top: large ? 15 : 10,
        }}
      />
      <span
        className="absolute rounded-b-full border-b-2"
        style={{
          width: large ? 11 : 8,
          height: large ? 6 : 4,
          borderColor: colors.face,
          bottom: large ? 8 : 6,
        }}
      />
    </div>
  );
}

function LegendDot({
  color,
}: {
  color: "green" | "yellow" | "red";
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
        background: colorMap[color],
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
          <h2 className="mt-2 text-3xl font-black">三個操作就夠了</h2>
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-[26px] border border-[#dce9e1] bg-white p-6 shadow-[0_14px_36px_rgba(31,83,53,0.06)]">
          <div className="grid gap-5 md:grid-cols-3">
            <TutorialItem
              icon={
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#b8c9bf] bg-white">
                  <span className="h-5 w-5 rounded-full border-2 border-[#17372a]" />
                </span>
              }
              title="點圓圈"
              copy="選擇正式答案"
            />

            <TutorialItem
              icon={
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d7e7de] bg-white text-base font-black">
                  Aa
                </span>
              }
              title="點選項文字"
              copy="劃掉／取消劃掉選項"
            />

            <TutorialItem
              icon={
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d7e7de] bg-white text-2xl font-black text-[#de4760]">
                  ?
                </span>
              }
              title="我不確定"
              copy="答案照樣保留，同時標記這題不熟"
            />
          </div>

          <div className="mt-6 border-t border-[#e4ece7] pt-5 text-sm font-bold leading-7 text-[#789083]">
            進度列中的簡化史萊姆會同步顯示你的作答狀態：
            綠色＝已作答、黃色＝已作答＋不確定、紅色＝只有不確定。
          </div>
        </div>

        <button
          onClick={onClose}
          className="mx-auto mt-6 block w-full max-w-4xl rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white transition hover:bg-[#2dbc70]"
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
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0">{icon}</div>

      <div>
        <div className="text-lg font-black">{title}</div>
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
      <div className="text-sm font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
