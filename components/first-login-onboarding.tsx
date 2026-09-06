"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useGameState } from "@/components/game-state-provider";

const steps = [
  {
    icon: "🧠",
    title: "先去學習",
    description:
      "刷國考、上傳教材、複習錯題或開專注計時器，都會累積學習紀錄。",
  },
  {
    icon: "🪙",
    title: "完成任務拿資源",
    description:
      "每日／每週任務會送金幣與抽卡券，學習也會慢慢累積遊戲進度。",
  },
  {
    icon: "🐾",
    title: "把史萊姆帶回家",
    description:
      "每天有 1 次免費抽卡。收藏後可以改暱稱、設為陪伴角色。",
  },
];

const surveyFields = [
  {
    key: "educationStage",
    label: "你現在在哪個階段？",
    options: [
      ["year1", "大一"],
      ["year2", "大二"],
      ["year3", "大三"],
      ["year4", "大四"],
      ["intern", "實習中"],
      ["exam_prep", "準備國考"],
      ["graduated", "已畢業"],
    ],
  },
  {
    key: "primaryGoal",
    label: "你最近最主要的學習目標？",
    options: [
      ["school_exam", "校內考試"],
      ["internship_exam", "實習考試"],
      ["national_exam", "醫檢師國考"],
      ["daily_review", "平常複習／維持手感"],
    ],
  },
  {
    key: "studyMethod",
    label: "你平常最常怎麼讀？",
    options: [
      ["slides", "看講義／教材"],
      ["questions", "刷題"],
      ["notes", "整理筆記"],
      ["videos", "看影片"],
      ["mixed", "混合使用"],
    ],
  },
  {
    key: "biggestPain",
    label: "讀書時最困擾你的事情？",
    options: [
      ["find_focus", "不知道哪些是重點"],
      ["forget_fast", "看過很快就忘"],
      ["mistakes", "錯題沒有好好整理"],
      ["motivation", "沒動力開始"],
      ["not_enough_time", "時間不夠"],
    ],
  },
  {
    key: "sessionLength",
    label: "你一次通常會讀多久？",
    options: [
      ["under20", "20 分鐘內"],
      ["20to40", "20–40 分鐘"],
      ["40to60", "40–60 分鐘"],
      ["over60", "60 分鐘以上"],
    ],
  },
] as const;

type SurveyState = {
  educationStage: string;
  primaryGoal: string;
  studyMethod: string;
  biggestPain: string;
  sessionLength: string;
};

const emptySurvey: SurveyState = {
  educationStage: "",
  primaryGoal: "",
  studyMethod: "",
  biggestPain: "",
  sessionLength: "",
};

export default function FirstLoginOnboarding() {
  const pathname = usePathname();
  const auth = useAuthUser();
  const game = useGameState();
  const [survey, setSurvey] = useState<SurveyState>(emptySurvey);
  const [surveyDone, setSurveyDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldShow =
    pathname === "/" &&
    !auth.loading &&
    auth.isLoggedIn &&
    game.isReady &&
    !game.hasSeenOnboarding;

  if (!shouldShow) return null;

  const allAnswered = Object.values(survey).every(Boolean);

  const saveSurvey = async () => {
    if (!allAnswered || saving) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/learning-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(survey),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "學習習慣儲存失敗。");
      }
      setSurveyDone(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "學習習慣儲存失敗，請稍後再試。",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/35 p-3 sm:p-5">
      <div className="relative max-h-[calc(100dvh-24px)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-[24px] border border-[#d8e9df] bg-white shadow-2xl sm:max-h-[calc(100dvh-40px)] sm:rounded-[28px]">
        {!surveyDone ? (
          <>
            <div className="bg-gradient-to-br from-[#e7f9ee] via-white to-[#ebf8fc] px-5 pb-5 pt-6 sm:px-7 sm:py-6">
              <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">
                30 秒認識你
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#17372a] sm:text-3xl">
                你平常都怎麼讀書？
              </h2>
              <p className="mt-2 text-sm font-bold leading-6 text-[#6f887b]">
                五個小問題，幫我們了解醫技學生真正的學習習慣，也會用來改善之後的 MedSlime。
              </p>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-7">
              {surveyFields.map((field, index) => (
                <label key={field.key} className="block">
                  <span className="mb-2 block text-sm font-black text-[#315b45]">
                    {index + 1}. {field.label}
                  </span>
                  <select
                    value={survey[field.key]}
                    onChange={(event) =>
                      setSurvey((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 text-sm font-bold text-[#315b45] outline-none transition focus:border-[#65d795]"
                  >
                    <option value="">請選擇</option>
                    {field.options.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              {error && (
                <div className="rounded-xl border border-[#f0dddd] bg-[#fff7f7] px-4 py-3 text-sm font-bold text-[#9b5050]">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={!allAnswered || saving}
                onClick={saveSurvey}
                className="w-full rounded-2xl bg-[#31c978] px-5 py-3.5 text-base font-black text-white transition hover:bg-[#2dbc70] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? "儲存中..." : "下一步"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gradient-to-br from-[#e7f9ee] via-white to-[#ebf8fc] px-5 pb-5 pt-6 sm:px-7 sm:py-6">
              <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">
                WELCOME TO MEDSLIME
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#17372a] sm:text-3xl">
                讀書，順便養一群史萊姆。
              </h2>
              <p className="mt-2 text-sm font-bold leading-6 text-[#6f887b]">
                調查完成。再記住三件事就可以開始了。
              </p>
            </div>

            <div className="px-4 py-4 sm:px-7 sm:py-5">
              <div className="space-y-2.5 sm:grid sm:grid-cols-3 sm:gap-3 sm:space-y-0">
                {steps.map((step) => (
                  <div
                    key={step.title}
                    className="flex items-start gap-3 rounded-[18px] border border-[#dfece4] bg-[#fbfefc] p-3 sm:block sm:p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eefaf2] text-xl sm:h-11 sm:w-11 sm:text-2xl">
                      {step.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-[#17372a] sm:mt-3">
                        {step.title}
                      </div>
                      <div className="mt-1 text-xs font-bold leading-5 text-[#70877a] sm:mt-2 sm:text-sm sm:leading-6">
                        {step.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-[#cfe7d8] bg-[#eefaf2] px-4 py-2.5 text-sm font-bold leading-6 text-[#237849]">
                你的第一隻綠色史萊姆已經在圖鑑裡等你了。
              </div>

              <button
                type="button"
                onClick={game.completeOnboarding}
                className="mt-3 w-full rounded-2xl bg-[#31c978] px-5 py-3.5 text-base font-black text-white transition hover:bg-[#2dbc70]"
              >
                好，開始吧
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
