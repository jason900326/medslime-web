"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExamAttemptQuestionItem } from "@/lib/exam-attempt-store";
import type { QuestionLearningState } from "@/lib/question-learning-state";

type Props = {
  questions: ExamAttemptQuestionItem[];
  learningStates: Map<string, QuestionLearningState>;
  onJump: (questionKey: string) => void;
};

type SlimeStatus = "green" | "yellow" | "red" | "gray" | "purple";

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
            const status = groupStatus(items, learningStates);

            return (
              <button
                key={`${startNumber}-${endNumber}-${groupIndex}`}
                type="button"
                onClick={() => setSelectedGroup(groupIndex)}
                aria-pressed={active}
                className={[
                  "flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 transition",
                  active
                    ? "border-[#8fd9aa] bg-[#eefaf2]"
                    : "border-[#e0e9e3] bg-white",
                ].join(" ")}
                title={`第 ${startNumber}–${endNumber} 題`}
              >
                <SimpleSlime status={status} size="segment" active={active} />
                <span
                  className={[
                    "text-[11px] font-black",
                    active ? "text-[#237849]" : "text-[#789083]",
                  ].join(" ")}
                >
                  {startNumber}–{endNumber}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-10 gap-1">
        {group.map((item, itemIndex) => {
          const absoluteIndex = selectedGroup * 10 + itemIndex;
          const learning = learningStates.get(item.questionKey);
          const visual = questionVisual(item, learning);
          const number = item.questionNumber ?? absoluteIndex + 1;

          return (
            <button
              key={`${item.questionKey}-${absoluteIndex}`}
              type="button"
              onClick={() => onJump(item.questionKey)}
              title={`第 ${number} 題 · ${visual.label}`}
              aria-label={`跳到第 ${number} 題，${visual.label}`}
              className="flex min-w-0 flex-col items-center gap-0.5 rounded-lg py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#31c978] focus-visible:ring-offset-2"
            >
              <SimpleSlime status={visual.status} size="question" active={false} />
              <span className={`text-[10px] font-black leading-none ${visual.numberClassName}`}>
                {number}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function groupStatus(
  items: ExamAttemptQuestionItem[],
  learningStates: Map<string, QuestionLearningState>,
): SlimeStatus {
  const statuses = items.map(
    (item) => questionVisual(item, learningStates.get(item.questionKey)).status,
  );

  if (statuses.some((status) => status === "purple")) return "purple";
  if (statuses.some((status) => status === "red")) return "red";
  if (statuses.some((status) => status === "yellow")) return "yellow";
  if (statuses.length > 0 && statuses.every((status) => status === "green")) return "green";
  return "gray";
}

function SimpleSlime({
  status,
  size,
  active,
}: {
  status: SlimeStatus;
  size: "segment" | "question";
  active: boolean;
}) {
  const colors = {
    green: { body: "#b9efd1", border: "#55b97b", face: "#315b45" },
    yellow: { body: "#ffe8a3", border: "#e2b94f", face: "#6f5a1d" },
    red: { body: "#ffc9cf", border: "#de7777", face: "#7c3d46" },
    gray: { body: "#eef6f1", border: "#d6e5dc", face: "#759184" },
    purple: { body: "#e7ddff", border: "#a992e8", face: "#6952a5" },
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

function questionVisual(
  item: ExamAttemptQuestionItem,
  learning?: QuestionLearningState,
): { status: SlimeStatus; label: string; numberClassName: string } {
  if (learning?.conceptUnfamiliar) {
    return {
      status: "purple",
      label: "觀念不熟",
      numberClassName: "text-[#6952a5]",
    };
  }
  if (item.uncertain) {
    return {
      status: "yellow",
      label: "不確定",
      numberClassName: "text-[#80651e]",
    };
  }
  if (!item.answered) {
    return {
      status: "gray",
      label: "未作答",
      numberClassName: "text-[#789083]",
    };
  }
  if (item.correct === false) {
    return {
      status: "red",
      label: "答錯",
      numberClassName: "text-[#9b5050]",
    };
  }
  return {
    status: "green",
    label: "答對",
    numberClassName: "text-[#237849]",
  };
}
