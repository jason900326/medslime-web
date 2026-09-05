"use client";

import { useMemo, useState } from "react";
import TopBar from "@/components/top-bar";
import { useGameState } from "@/components/game-state-provider";
import { SLIMES } from "@/lib/slime-data";

type AchievementCategory = "學習" | "收藏" | "抽卡" | "特殊";

type AchievementDefinition = {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  target: number;
  unit: string;
  reward: {
    type: "coins" | "tickets";
    amount: number;
  };
  getProgress: (game: ReturnType<typeof useGameState>) => number;
};

const achievementDefinitions: AchievementDefinition[] = [
  {
    id: "focus-1",
    category: "學習",
    name: "坐得住了",
    description: "累積專注 1 小時",
    target: 60,
    unit: "分鐘",
    reward: { type: "coins", amount: 100 },
    getProgress: (game) =>
      Math.floor(
        game.focusHistory.reduce(
          (sum, session) => sum + session.actualSeconds,
          0,
        ) / 60,
      ),
  },
  {
    id: "focus-10",
    category: "學習",
    name: "開始認真",
    description: "累積專注 10 小時",
    target: 600,
    unit: "分鐘",
    reward: { type: "coins", amount: 300 },
    getProgress: (game) =>
      Math.floor(
        game.focusHistory.reduce(
          (sum, session) => sum + session.actualSeconds,
          0,
        ) / 60,
      ),
  },
  {
    id: "focus-30",
    category: "學習",
    name: "屁股黏住了",
    description: "累積專注 30 小時",
    target: 1800,
    unit: "分鐘",
    reward: { type: "tickets", amount: 3 },
    getProgress: (game) =>
      Math.floor(
        game.focusHistory.reduce(
          (sum, session) => sum + session.actualSeconds,
          0,
        ) / 60,
      ),
  },
  {
    id: "questions-1000",
    category: "學習",
    name: "題海居民",
    description: "累積作答 1,000 題",
    target: 1000,
    unit: "題",
    reward: { type: "coins", amount: 500 },
    getProgress: (game) => game.totalQuestionsAnswered,
  },
  {
    id: "collection-5",
    category: "收藏",
    name: "開始有點擠了",
    description: "收集 5 隻不同史萊姆",
    target: 5,
    unit: "隻",
    reward: { type: "coins", amount: 150 },
    getProgress: (game) =>
      Object.values(game.slimes).filter((slime) => slime.owned).length,
  },
  {
    id: "collection-all-n",
    category: "收藏",
    name: "普通但完整",
    description: "收集全部 N 稀有度史萊姆",
    target: SLIMES.filter((slime) => slime.rarity === "N").length,
    unit: "隻",
    reward: { type: "tickets", amount: 2 },
    getProgress: (game) =>
      SLIMES.filter(
        (slime) =>
          slime.rarity === "N" &&
          game.slimes[slime.id]?.owned,
      ).length,
  },
  {
    id: "pull-10",
    category: "抽卡",
    name: "手癢了",
    description: "累積抽卡 10 次",
    target: 10,
    unit: "抽",
    reward: { type: "coins", amount: 100 },
    getProgress: (game) => game.totalPulls,
  },
  {
    id: "pull-100",
    category: "抽卡",
    name: "這不是賭博",
    description: "累積抽卡 100 次",
    target: 100,
    unit: "抽",
    reward: { type: "tickets", amount: 5 },
    getProgress: (game) => game.totalPulls,
  },
  {
    id: "special-ssr",
    category: "特殊",
    name: "SSR！",
    description: "第一次抽到 SSR 史萊姆",
    target: 1,
    unit: "次",
    reward: { type: "tickets", amount: 3 },
    getProgress: (game) =>
      SLIMES.some(
        (slime) =>
          slime.rarity === "SSR" &&
          game.slimes[slime.id]?.owned,
      )
        ? 1
        : 0,
  },
];

const categories = ["全部", "學習", "收藏", "抽卡", "特殊"] as const;

export default function AchievementsPage() {
  const game = useGameState();
  const [category, setCategory] =
    useState<(typeof categories)[number]>("全部");

  const items = useMemo(
    () =>
      achievementDefinitions.map((definition) => ({
        ...definition,
        progress: definition.getProgress(game),
        claimed: game.claimedAchievementIds.includes(
          definition.id,
        ),
      })),
    [
      game.focusHistory,
      game.slimes,
      game.totalPulls,
      game.totalQuestionsAnswered,
      game.claimedAchievementIds,
    ],
  );

  const filtered = useMemo(() => {
    return items
      .filter((item) =>
        category === "全部" ? true : item.category === category,
      )
      .sort((a, b) => {
        const aComplete = a.progress >= a.target;
        const bComplete = b.progress >= b.target;

        if (a.claimed !== b.claimed) {
          return Number(a.claimed) - Number(b.claimed);
        }

        if (aComplete !== bComplete) {
          return Number(bComplete) - Number(aComplete);
        }

        return 0;
      });
  }, [items, category]);

  const completedCount = items.filter(
    (item) => item.progress >= item.target,
  ).length;

  const claimedCount = items.filter((item) => item.claimed).length;

  const claimAchievement = (achievement: (typeof items)[number]) => {
    if (
      achievement.progress < achievement.target ||
      achievement.claimed
    ) {
      return;
    }

    game.claimAchievementReward(
      achievement.id,
      achievement.reward,
    );
  };

  if (!game.isReady) {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]" />
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            ACHIEVEMENTS
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            成就
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-[#70877a]">
            成就進度會依照目前登入帳號的真實學習與收藏資料計算。
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="已完成"
            value={`${completedCount} / ${items.length}`}
          />
          <SummaryCard
            label="完成率"
            value={`${Math.round(
              (completedCount / items.length) * 100,
            )}%`}
          />
          <SummaryCard
            label="已領取"
            value={`${claimedCount} 個`}
          />
        </section>

        <section className="mt-6 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-black transition",
                category === item
                  ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                  : "border-[#dbe9e1] bg-white text-[#466a58] hover:bg-[#f5faf7]",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((achievement) => {
            const complete =
              achievement.progress >= achievement.target;

            const percent = Math.min(
              100,
              Math.max(
                0,
                (achievement.progress / achievement.target) * 100,
              ),
            );

            return (
              <article
                key={achievement.id}
                className={[
                  "rounded-[26px] border bg-white p-5 shadow-[0_10px_26px_rgba(31,83,53,0.05)]",
                  achievement.claimed
                    ? "border-[#e4ebe7] opacity-75"
                    : complete
                      ? "border-[#bfe5cf]"
                      : "border-[#dfece4]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={[
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl",
                      complete
                        ? "bg-[#eaf9f0]"
                        : "bg-[#f2f5f3] grayscale",
                    ].join(" ")}
                  >
                    🏆
                  </div>

                  <span className="rounded-full bg-[#f4f7f5] px-3 py-1 text-xs font-black text-[#70877a]">
                    {achievement.category}
                  </span>
                </div>

                <div className="mt-4 text-xl font-black">
                  {achievement.name}
                </div>

                <div className="mt-1 text-sm font-bold leading-6 text-[#789083]">
                  {achievement.description}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 text-sm font-black">
                  <span className="text-[#557768]">目前進度</span>
                  <span>
                    {Math.min(
                      achievement.progress,
                      achievement.target,
                    )}{" "}
                    / {achievement.target} {achievement.unit}
                  </span>
                </div>

                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e7efe9]">
                  <div
                    className={[
                      "h-full rounded-full transition-all duration-300",
                      complete ? "bg-[#55b97b]" : "bg-[#91b9a1]",
                    ].join(" ")}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-[#2a9d5e]">
                    {achievement.reward.type === "coins"
                      ? `🪙 ${achievement.reward.amount}`
                      : `🎫 ${achievement.reward.amount}`}
                  </div>

                  {achievement.claimed ? (
                    <button
                      disabled
                      className="rounded-xl border border-[#d7e7de] bg-[#f7faf8] px-4 py-2 text-sm font-black text-[#789083]"
                    >
                      已領取
                    </button>
                  ) : complete ? (
                    <button
                      onClick={() =>
                        claimAchievement(achievement)
                      }
                      className="rounded-xl bg-[#31c978] px-4 py-2 text-sm font-black text-white transition hover:bg-[#2dbc70]"
                    >
                      領取
                    </button>
                  ) : (
                    <button
                      disabled
                      className="cursor-not-allowed rounded-xl bg-[#edf2ef] px-4 py-2 text-sm font-black text-[#9aac9f]"
                    >
                      尚未完成
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#dfece4] bg-white p-5">
      <div className="text-sm font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
