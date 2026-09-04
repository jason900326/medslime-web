"use client";

import { usePathname } from "next/navigation";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useGameState } from "@/components/game-state-provider";

const steps = [
  {
    icon: "🧠",
    title: "先去學習",
    description:
      "刷國考、上傳教材、複習錯題或開專注計時器，都會累積你的學習紀錄。",
  },
  {
    icon: "🪙",
    title: "完成任務拿資源",
    description:
      "每日／每週任務會送金幣與抽卡券，平常的學習也會慢慢累積遊戲進度。",
  },
  {
    icon: "🐾",
    title: "把史萊姆帶回家",
    description:
      "每天有 1 次免費抽卡。抽到的史萊姆可以收藏、改暱稱，也能選成首頁與專注計時器的陪伴角色。",
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
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/35 px-5 py-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-[#d8e9df] bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-[#e7f9ee] via-white to-[#ebf8fc] px-6 py-7 md:px-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            WELCOME TO MEDSLIME
          </div>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#17372a]">
            讀書，順便養一群史萊姆。
          </h2>

          <p className="mt-3 max-w-xl text-sm font-bold leading-7 text-[#6f887b]">
            不用一次搞懂全部功能，先記住這三件事就好。
          </p>
        </div>

        <div className="px-6 py-6 md:px-8">
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="rounded-[22px] border border-[#dfece4] bg-[#fbfefc] p-4"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eefaf2] text-2xl">
                  {step.icon}
                </div>

                <div className="mt-3 font-black text-[#17372a]">
                  {step.title}
                </div>

                <div className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
                  {step.description}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[#cfe7d8] bg-[#eefaf2] px-4 py-3 text-sm font-bold leading-6 text-[#237849]">
            你的第一隻綠色史萊姆已經在圖鑑裡等你了。
          </div>

          <button
            type="button"
            onClick={game.completeOnboarding}
            className="mt-5 w-full rounded-2xl bg-[#31c978] px-5 py-4 text-base font-black text-white transition hover:bg-[#2dbc70]"
          >
            好，開始吧
          </button>
        </div>
      </div>
    </div>
  );
}
