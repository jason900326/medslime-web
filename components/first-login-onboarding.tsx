"use client";

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

export default function FirstLoginOnboarding() {
  const pathname = usePathname();
  const auth = useAuthUser();
  const game = useGameState();

  const shouldShow =
    pathname === "/" &&
    !auth.loading &&
    auth.isLoggedIn &&
    game.isReady &&
    !game.hasSeenOnboarding;

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/35 p-3 sm:p-5">
      <div className="relative max-h-[calc(100dvh-24px)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-[24px] border border-[#d8e9df] bg-white shadow-2xl sm:max-h-[calc(100dvh-40px)] sm:rounded-[28px]">
        <button
          type="button"
          onClick={game.completeOnboarding}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe9e1] bg-white/95 text-lg font-black text-[#60786c] shadow-sm"
          aria-label="關閉新手導覽"
          title="關閉"
        >
          ×
        </button>

        <div className="bg-gradient-to-br from-[#e7f9ee] via-white to-[#ebf8fc] px-5 pb-5 pt-6 sm:px-7 sm:py-6">
          <div className="pr-10 text-xs font-black tracking-[0.08em] text-[#2ba962]">
            WELCOME TO MEDSLIME
          </div>

          <h2 className="mt-2 pr-8 text-2xl font-black tracking-[-0.04em] text-[#17372a] sm:text-3xl">
            讀書，順便養一群史萊姆。
          </h2>

          <p className="mt-2 text-sm font-bold leading-6 text-[#6f887b]">
            先記住三件事就好，其他功能之後慢慢逛。
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
      </div>
    </div>
  );
}
