"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/top-bar";

type Question = {
  id: string;
  stem: string;
  options: string[];
  answer: number;
};

const mockQuestions: Question[] = [
  {
    id: "m1",
    stem: "依照教材內容，下列哪一項敘述最適合本章節的核心概念？",
    options: [
      "此選項為教材概念 A",
      "此選項為教材概念 B",
      "此選項為教材概念 C",
      "此選項為教材概念 D",
    ],
    answer: 1,
  },
  {
    id: "m2",
    stem: "根據教材整理的重點，下列何者最符合正確的機制描述？",
    options: [
      "機制敘述 A",
      "機制敘述 B",
      "機制敘述 C",
      "機制敘述 D",
    ],
    answer: 2,
  },
  {
    id: "m3",
    stem: "下列何者最可能是教材中特別需要注意的考點？",
    options: ["考點 A", "考點 B", "考點 C", "考點 D"],
    answer: 0,
  },
];

export default function MaterialQuizPage() {
  const router = useRouter();

  const [sourceName, setSourceName] = useState("你的教材");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [uncertain, setUncertain] = useState<Record<string, boolean>>({});
  const [struckOptions, setStruckOptions] = useState<Record<string, number[]>>(
    {},
  );
  const [finished, setFinished] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("medslime_material_quiz_source");

      if (raw) {
        const parsed = JSON.parse(raw) as { fileName?: string };
        if (parsed.fileName) {
          setSourceName(parsed.fileName);
        }
      }
    } catch {
      // 保留預設名稱即可。
    }
  }, []);

  const question = mockQuestions[index];

  const correctCount = useMemo(() => {
    return mockQuestions.reduce((sum, item) => {
      return sum + (answers[item.id] === item.answer ? 1 : 0);
    }, 0);
  }, [answers]);

  const unansweredCount = useMemo(
    () =>
      mockQuestions.filter((item) => answers[item.id] === undefined).length,
    [answers],
  );

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
            backHref="/study/material"
            backLabel="返回教材"
          />

          <section className="mt-10 rounded-[30px] border border-[#dce9e1] bg-white p-8 text-center shadow-[0_14px_34px_rgba(30,78,50,0.06)]">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              RESULT
            </div>

            <h1 className="mt-2 text-4xl font-black">
              作答完成
            </h1>

            <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
              <ResultCard
                label="答對"
                value={`${correctCount} / ${mockQuestions.length}`}
              />

              <ResultCard
                label="不確定"
                value={`${
                  Object.values(uncertain).filter(Boolean).length
                } 題`}
              />
            </div>

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
        <TopBar
          showBack
          backHref="/study/material"
          backLabel="返回教材"
        />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            MATERIAL QUIZ
          </div>

          <h1 className="mt-2 truncate text-2xl font-black">
            {sourceName}
          </h1>
        </section>

        <QuestionProgress
          questions={mockQuestions}
          currentIndex={index}
          getStatus={getStatus}
          onJump={setIndex}
        />

        <section className="mt-6 rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-[0_12px_28px_rgba(30,78,50,0.055)] md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-black text-[#789083]">
              Q{index + 1} / {mockQuestions.length}
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitDialog(true)}
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
                        "flex h-6 w-6 items-center justify-center rounded-full border-2",
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
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3 font-black text-[#315b45] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← 上一題
            </button>

            {index < mockQuestions.length - 1 ? (
              <button
                type="button"
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
            <div className="text-2xl font-black">
              是否要交卷？
            </div>

            {unansweredCount > 0 ? (
              <div className="mt-3 rounded-2xl border border-[#f0dddd] bg-[#fff7f7] p-4 text-sm font-bold leading-6 text-[#9b5050]">
                尚有 {unansweredCount} 題未作答。
                <br />
                確定仍要交卷嗎？
              </div>
            ) : (
              <p className="mt-3 text-sm font-bold text-[#70877a]">
                已完成所有題目。
              </p>
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
                onClick={() => {
                  setShowSubmitDialog(false);
                  setFinished(true);
                }}
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
      <div className="flex flex-wrap items-end gap-3">
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
              large={(questionIndex + 1) % 10 === 0}
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
  large,
}: {
  status: "green" | "yellow" | "red" | "gray";
  active: boolean;
  large: boolean;
}) {
  const colors = {
    green: ["#b9efd1", "#55b97b", "#315b45"],
    yellow: ["#ffe8a3", "#e2b94f", "#6f5a1d"],
    red: ["#ffc9cf", "#de7777", "#7c3d46"],
    gray: ["#eef6f1", "#d6e5dc", "#759184"],
  }[status];

  return (
    <div
      className={active ? "scale-110 transition" : "transition"}
      style={{
        width: large ? 58 : 38,
        height: large ? 42 : 29,
        borderRadius: "48% 48% 42% 42% / 56% 56% 42% 42%",
        background: colors[0],
        border: `2px solid ${colors[1]}`,
        boxShadow: active
          ? "0 0 0 4px rgba(49,201,120,0.13)"
          : "none",
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute",
          width: large ? 5 : 3.5,
          height: large ? 7 : 5,
          borderRadius: 999,
          background: colors[2],
          left: large ? 17 : 11,
          top: large ? 15 : 10,
        }}
      />
      <span
        style={{
          position: "absolute",
          width: large ? 5 : 3.5,
          height: large ? 7 : 5,
          borderRadius: 999,
          background: colors[2],
          right: large ? 17 : 11,
          top: large ? 15 : 10,
        }}
      />
      <span
        style={{
          position: "absolute",
          width: large ? 11 : 8,
          height: large ? 6 : 4,
          borderBottom: `2px solid ${colors[2]}`,
          borderRadius: "0 0 999px 999px",
          bottom: large ? 8 : 6,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
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
