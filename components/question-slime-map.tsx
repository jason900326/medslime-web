"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExamAttemptQuestionItem } from "@/lib/exam-attempt-store";
import type { QuestionLearningState } from "@/lib/question-learning-state";

type Props = {
  questions: ExamAttemptQuestionItem[];
  learningStates: Map<string, QuestionLearningState>;
  onJump: (questionKey: string) => void;
};

export default function QuestionSlimeMap({
  questions,
  learningStates,
  onJump,
}: Props) {
  const groups = useMemo(
    () =>
      Array.from(
        { length: Math.ceil(questions.length / 10) },
        (_, groupIndex) => questions.slice(groupIndex * 10, groupIndex * 10 + 10),
      ),
    [questions],
  );
  const [selectedGroup, setSelectedGroup] = useState(0);

  useEffect(() => {
    if (selectedGroup >= groups.length) setSelectedGroup(Math.max(groups.length - 1, 0));
  }, [groups.length, selectedGroup]);

  if (groups.length === 0) return null;

  const group = groups[selectedGroup] ?? groups[0];

  return (
    <div className="mt-4">
      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2 pr-1">
          {groups.map((items, groupIndex) => {
            const first = items[0];
            const last = items[items.length - 1];
            const fallbackStart = groupIndex * 10 + 1;
            const fallbackEnd = fallbackStart + items.length - 1;
            const startNumber = first?.questionNumber ?? fallbackStart;
            const endNumber = last?.questionNumber ?? fallbackEnd;
            const active = selectedGroup === groupIndex;

            return (
              <button
                key={`${startNumber}-${endNumber}-${groupIndex}`}
                type="button"
                onClick={() => setSelectedGroup(groupIndex)}
                aria-pressed={active}
                className={[
                  "flex h-12 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-black transition",
                  active
                    ? "border-[#8fd8ad] bg-[#effaf3] text-[#237849] shadow-[0_4px_14px_rgba(49,201,120,0.10)]"
                    : "border-[#dce5df] bg-white text-[#70877a] hover:bg-[#f7faf8]",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-8 w-10 place-items-center rounded-full",
                    active ? "bg-[#dff5e8]" : "bg-[#f0f5f2]",
                  ].join(" ")}
                >
                  <DefaultSlimeIcon active={active} />
                </span>
                <span>{startNumber}–{endNumber}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-10 gap-1 sm:gap-2">
        {group.map((item, itemIndex) => {
          const absoluteIndex = selectedGroup * 10 + itemIndex;
          const learning = learningStates.get(item.questionKey);
          const status = questionStatus(item, learning);
          const number = item.questionNumber ?? absoluteIndex + 1;

          return (
            <button
              key={`${item.questionKey}-${absoluteIndex}`}
              type="button"
              onClick={() => onJump(item.questionKey)}
              title={`第 ${number} 題 · ${status.label}`}
              aria-label={`跳到第 ${number} 題，${status.label}`}
              className="group flex min-w-0 flex-col items-center rounded-xl py-1 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#31c978] focus-visible:ring-offset-2"
            >
              <span
                className={[
                  "grid aspect-[1.25/1] w-full max-w-[48px] place-items-center rounded-full border transition group-hover:shadow-sm",
                  status.shellClassName,
                ].join(" ")}
              >
                <DefaultSlimeIcon />
              </span>
              <span className={`mt-1 text-[10px] font-black leading-none sm:text-xs ${status.numberClassName}`}>
                {number}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DefaultSlimeIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 48"
      aria-hidden="true"
      className="h-7 w-9 transition-transform duration-200 group-hover:scale-105"
    >
      <path
        d="M9 36c-3-2-4-6-3-10 2-8 9-14 18-16 2-5 5-8 8-8 3 1 4 4 4 8 10 1 18 7 21 15 2 5 0 9-4 12-8 5-35 5-44-1Z"
        fill={active ? "#d9f2e3" : "#edf5f0"}
        stroke={active ? "#7bcf9d" : "#b8d2c3"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="25" cy="27" rx="2.3" ry="3" fill="#70877a" />
      <ellipse cx="39" cy="27" rx="2.3" ry="3" fill="#70877a" />
      <path
        d="M27 34c3 2 7 2 10 0"
        fill="none"
        stroke="#70877a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function questionStatus(
  item: ExamAttemptQuestionItem,
  learning?: QuestionLearningState,
) {
  if (learning?.conceptUnfamiliar) {
    return {
      label: "觀念不熟",
      shellClassName: "border-[#cbbdf5] bg-[#f3efff] shadow-[0_0_0_4px_rgba(203,189,245,0.16)]",
      numberClassName: "text-[#6952a5]",
    };
  }
  if (item.uncertain) {
    return {
      label: "不確定",
      shellClassName: "border-[#e7d083] bg-[#fff8df] shadow-[0_0_0_4px_rgba(231,208,131,0.14)]",
      numberClassName: "text-[#80651e]",
    };
  }
  if (!item.answered) {
    return {
      label: "未作答",
      shellClassName: "border-[#d8dfdb] bg-[#f3f4f3] opacity-75",
      numberClassName: "text-[#789083]",
    };
  }
  if (item.correct === false) {
    return {
      label: "答錯",
      shellClassName: "border-[#e6a2a2] bg-[#fff1f1] shadow-[0_0_0_4px_rgba(230,162,162,0.12)]",
      numberClassName: "text-[#9b5050]",
    };
  }
  return {
    label: "答對",
    shellClassName: "border-[#9ed9b5] bg-[#eaf9f0] shadow-[0_0_0_4px_rgba(158,217,181,0.14)]",
    numberClassName: "text-[#237849]",
  };
}
