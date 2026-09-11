"use client";

import { SLIMES } from "@/lib/slime-data";
import type { ExamAttemptQuestionItem } from "@/lib/exam-attempt-store";
import type { QuestionLearningState } from "@/lib/question-learning-state";

type Props = {
  questions: ExamAttemptQuestionItem[];
  learningStates: Map<string, QuestionLearningState>;
  onJump: (questionKey: string) => void;
};

const MAP_SLIMES = SLIMES.filter((slime) => slime.rarity === "N");

export default function QuestionSlimeMap({
  questions,
  learningStates,
  onJump,
}: Props) {
  const groups = Array.from(
    { length: Math.ceil(questions.length / 10) },
    (_, groupIndex) => questions.slice(groupIndex * 10, groupIndex * 10 + 10),
  );

  return (
    <div className="mt-4 space-y-4">
      {groups.map((group, groupIndex) => {
        const first = group[0];
        const last = group[group.length - 1];
        const fallbackStart = groupIndex * 10 + 1;
        const fallbackEnd = fallbackStart + group.length - 1;
        const startNumber = first?.questionNumber ?? fallbackStart;
        const endNumber = last?.questionNumber ?? fallbackEnd;

        return (
          <div
            key={`${startNumber}-${endNumber}-${groupIndex}`}
            className="rounded-[20px] border border-[#e3eee7] bg-[#fbfefc] px-3 py-3.5 sm:px-4"
          >
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="text-[11px] font-black tracking-[0.08em] text-[#628071]">
                第 {startNumber}–{endNumber} 題
              </div>
              <div className="text-[10px] font-bold text-[#9aaca2]">10 題一區</div>
            </div>

            <div className="grid grid-cols-5 gap-x-2 gap-y-2.5 sm:grid-cols-10 sm:gap-2.5">
              {group.map((item, itemIndex) => {
                const absoluteIndex = groupIndex * 10 + itemIndex;
                const slime = MAP_SLIMES[absoluteIndex % MAP_SLIMES.length];
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
                    className={[
                      "group relative aspect-square min-w-0 overflow-hidden rounded-[18px] border-2 p-1 transition",
                      "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#31c978] focus-visible:ring-offset-2",
                      status.className,
                    ].join(" ")}
                  >
                    <img
                      src={slime.image}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="h-full w-full select-none object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                    />
                    <span
                      className={[
                        "absolute bottom-1 right-1 grid min-h-5 min-w-5 place-items-center rounded-full border px-1 text-[9px] font-black leading-none shadow-sm sm:text-[10px]",
                        status.badgeClassName,
                      ].join(" ")}
                    >
                      {number}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function questionStatus(
  item: ExamAttemptQuestionItem,
  learning?: QuestionLearningState,
) {
  if (learning?.conceptUnfamiliar) {
    return {
      label: "觀念不熟",
      className: "border-[#cbbdf5] bg-[#f7f4ff]",
      badgeClassName: "border-[#cbbdf5] bg-[#f0ebff] text-[#6952a5]",
    };
  }
  if (item.uncertain) {
    return {
      label: "不確定",
      className: "border-[#e7d083] bg-[#fffaf0]",
      badgeClassName: "border-[#e7d083] bg-[#fff8df] text-[#80651e]",
    };
  }
  if (!item.answered) {
    return {
      label: "未作答",
      className: "border-[#d8dfdb] bg-[#f7f9f8] opacity-75",
      badgeClassName: "border-[#d8dfdb] bg-[#f3f4f3] text-[#789083]",
    };
  }
  if (item.correct === false) {
    return {
      label: "答錯",
      className: "border-[#e6a2a2] bg-[#fff7f7]",
      badgeClassName: "border-[#e6a2a2] bg-[#fff1f1] text-[#9b5050]",
    };
  }
  return {
    label: "答對",
    className: "border-[#9ed9b5] bg-[#f2fbf5]",
    badgeClassName: "border-[#9ed9b5] bg-[#eaf9f0] text-[#237849]",
  };
}
