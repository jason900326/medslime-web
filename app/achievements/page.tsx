"use client";

import { useMemo, useState } from "react";
import TopBar from "@/components/top-bar";
import { useGameState } from "@/components/game-state-provider";
import { SLIMES } from "@/lib/slime-data";

type AchievementCategory = "學習" | "收藏" | "抽卡" | "特殊";
type Game = ReturnType<typeof useGameState>;

type AchievementDefinition = {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  target: number;
  unit: string;
  reward: { type: "coins" | "tickets"; amount: number };
  getProgress: (game: Game) => number;
};

const focusMinutes = (game: Game) =>
  Math.floor(
    game.focusHistory.reduce((sum, session) => sum + session.actualSeconds, 0) / 60,
  );
const ownedCount = (game: Game) =>
  SLIMES.filter((slime) => game.slimes[slime.id]?.owned).length;
const accessoryCount = (game: Game) =>
  SLIMES.filter((slime) => game.slimes[slime.id]?.accessoryUnlocked).length;
const ownedByRarity = (game: Game, rarity: "N" | "R" | "SR" | "SSR") =>
  SLIMES.filter(
    (slime) => slime.rarity === rarity && game.slimes[slime.id]?.owned,
  ).length;

const achievementDefinitions: AchievementDefinition[] = [
  // 學習 10
  { id: "focus-1", category: "學習", name: "坐得住了", description: "累積專注 1 小時", target: 60, unit: "分鐘", reward: { type: "coins", amount: 100 }, getProgress: focusMinutes },
  { id: "focus-10", category: "學習", name: "開始認真", description: "累積專注 10 小時", target: 600, unit: "分鐘", reward: { type: "coins", amount: 300 }, getProgress: focusMinutes },
  { id: "focus-30", category: "學習", name: "屁股黏住了", description: "累積專注 30 小時", target: 1800, unit: "分鐘", reward: { type: "tickets", amount: 3 }, getProgress: focusMinutes },
  { id: "focus-60", category: "學習", name: "真正的備考生活", description: "累積專注 60 小時", target: 3600, unit: "分鐘", reward: { type: "tickets", amount: 5 }, getProgress: focusMinutes },
  { id: "focus-100", category: "學習", name: "閉關修煉", description: "累積專注 100 小時", target: 6000, unit: "分鐘", reward: { type: "tickets", amount: 8 }, getProgress: focusMinutes },
  { id: "focus-150", category: "學習", name: "時間黑洞", description: "累積專注 150 小時", target: 9000, unit: "分鐘", reward: { type: "tickets", amount: 10 }, getProgress: focusMinutes },
  { id: "questions-100", category: "學習", name: "暖身完成", description: "累積作答 100 題", target: 100, unit: "題", reward: { type: "coins", amount: 100 }, getProgress: (game) => game.totalQuestionsAnswered },
  { id: "questions-500", category: "學習", name: "題目開始有臉了", description: "累積作答 500 題", target: 500, unit: "題", reward: { type: "coins", amount: 300 }, getProgress: (game) => game.totalQuestionsAnswered },
  { id: "questions-1000", category: "學習", name: "題海居民", description: "累積作答 1,000 題", target: 1000, unit: "題", reward: { type: "tickets", amount: 5 }, getProgress: (game) => game.totalQuestionsAnswered },
  { id: "mistakes-50", category: "學習", name: "錯過就不要再錯", description: "累積複習 50 題錯題", target: 50, unit: "題", reward: { type: "coins", amount: 250 }, getProgress: (game) => game.totalMistakesReviewed },

  // 收藏 6
  { id: "collection-5", category: "收藏", name: "開始有點擠了", description: "收集 5 隻不同史萊姆", target: 5, unit: "隻", reward: { type: "coins", amount: 150 }, getProgress: ownedCount },
  { id: "collection-all-n", category: "收藏", name: "普通但完整", description: "收集全部 N 史萊姆", target: SLIMES.filter((s) => s.rarity === "N").length, unit: "隻", reward: { type: "tickets", amount: 2 }, getProgress: (game) => ownedByRarity(game, "N") },
  { id: "collection-all-r", category: "收藏", name: "稀有居民區", description: "收集全部 R 史萊姆", target: SLIMES.filter((s) => s.rarity === "R").length, unit: "隻", reward: { type: "tickets", amount: 3 }, getProgress: (game) => ownedByRarity(game, "R") },
  { id: "collection-all-sr", category: "收藏", name: "金光閃閃", description: "收集全部 SR 史萊姆", target: SLIMES.filter((s) => s.rarity === "SR").length, unit: "隻", reward: { type: "tickets", amount: 5 }, getProgress: (game) => ownedByRarity(game, "SR") },
  { id: "accessory-first", category: "收藏", name: "今天有打扮", description: "解鎖第一件史萊姆專屬飾品", target: 1, unit: "件", reward: { type: "coins", amount: 150 }, getProgress: accessoryCount },
  { id: "collection-complete", category: "收藏", name: "圖鑑完成", description: "收集全部史萊姆並解鎖全部專屬飾品", target: SLIMES.length, unit: "隻", reward: { type: "tickets", amount: 10 }, getProgress: (game) => SLIMES.filter((slime) => game.slimes[slime.id]?.owned && game.slimes[slime.id]?.accessoryUnlocked).length },

  // 抽卡 4
  { id: "pull-10", category: "抽卡", name: "手癢了", description: "累積抽卡 10 次", target: 10, unit: "抽", reward: { type: "coins", amount: 100 }, getProgress: (game) => game.totalPulls },
  { id: "pull-50", category: "抽卡", name: "再一抽就好", description: "累積抽卡 50 次", target: 50, unit: "抽", reward: { type: "coins", amount: 300 }, getProgress: (game) => game.totalPulls },
  { id: "pull-100", category: "抽卡", name: "這不是賭博", description: "累積抽卡 100 次", target: 100, unit: "抽", reward: { type: "tickets", amount: 5 }, getProgress: (game) => game.totalPulls },
  { id: "pull-250", category: "抽卡", name: "史萊姆批發商", description: "累積抽卡 250 次", target: 250, unit: "抽", reward: { type: "tickets", amount: 8 }, getProgress: (game) => game.totalPulls },

  // 特殊 4
  { id: "special-ssr", category: "特殊", name: "SSR！", description: "第一次抽到 SSR 史萊姆", target: 1, unit: "次", reward: { type: "tickets", amount: 3 }, getProgress: (game) => ownedByRarity(game, "SSR") > 0 ? 1 : 0 },
  { id: "special-ssr-accessory", category: "特殊", name: "錯誤也要有造型", description: "解鎖 SSR 史萊姆的專屬飾品", target: 1, unit: "件", reward: { type: "tickets", amount: 5 }, getProgress: (game) => SLIMES.some((slime) => slime.rarity === "SSR" && game.slimes[slime.id]?.accessoryUnlocked) ? 1 : 0 },
  { id: "special-nickname", category: "特殊", name: "你有名字了", description: "第一次替史萊姆取名字", target: 1, unit: "隻", reward: { type: "coins", amount: 100 }, getProgress: (game) => Object.values(game.slimes).some((slime) => Boolean(slime.nickname?.trim())) ? 1 : 0 },
  { id: "special-streak-7", category: "特殊", name: "一週沒逃跑", description: "連續學習 7 天", target: 7, unit: "天", reward: { type: "tickets", amount: 3 }, getProgress: (game) => game.streak },
];

const categories = ["全部", "學習", "收藏", "抽卡", "特殊"] as const;

export default function AchievementsPage() {
  const game = useGameState();
  const [category, setCategory] = useState<(typeof categories)[number]>("全部");

  const items = useMemo(
    () => achievementDefinitions.map((definition) => ({
      ...definition,
      progress: definition.getProgress(game),
      claimed: game.claimedAchievementIds.includes(definition.id),
    })),
    [
      game.focusHistory,
      game.slimes,
      game.totalPulls,
      game.totalQuestionsAnswered,
      game.totalMistakesReviewed,
      game.streak,
      game.claimedAchievementIds,
    ],
  );

  const filtered = useMemo(() => items
    .filter((item) => category === "全部" || item.category === category)
    .sort((a, b) => {
      const aComplete = a.progress >= a.target;
      const bComplete = b.progress >= b.target;
      if (a.claimed !== b.claimed) return Number(a.claimed) - Number(b.claimed);
      if (aComplete !== bComplete) return Number(bComplete) - Number(aComplete);
      return 0;
    }), [items, category]);

  const completedCount = items.filter((item) => item.progress >= item.target).length;
  const claimedCount = items.filter((item) => item.claimed).length;

  if (!game.isReady) {
    return <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]" />;
  }

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">ACHIEVEMENTS</div>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">成就</h1>
          <p className="mt-3 max-w-2xl leading-7 text-[#70877a]">
            第一版共 24 個成就，依登入帳號的真實學習、收藏與抽卡進度計算。
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard label="已完成" value={`${completedCount} / ${items.length}`} />
          <SummaryCard label="完成率" value={`${Math.round((completedCount / items.length) * 100)}%`} />
          <SummaryCard label="已領取" value={`${claimedCount} 個`} />
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
            const complete = achievement.progress >= achievement.target;
            const percent = Math.min(100, Math.max(0, (achievement.progress / achievement.target) * 100));
            return (
              <article
                key={achievement.id}
                className={[
                  "rounded-[26px] border bg-white p-5 shadow-[0_10px_26px_rgba(31,83,53,0.05)]",
                  achievement.claimed
                    ? "border-[#e4ebe7] opacity-75"
                    : complete ? "border-[#bfe5cf]" : "border-[#dfece4]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={["flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl", complete ? "bg-[#eaf9f0]" : "bg-[#f2f5f3] grayscale"].join(" ")}>🏆</div>
                  <span className="rounded-full bg-[#f4f7f5] px-3 py-1 text-xs font-black text-[#70877a]">{achievement.category}</span>
                </div>

                <div className="mt-4 text-xl font-black">{achievement.name}</div>
                <div className="mt-1 text-sm font-bold leading-6 text-[#789083]">{achievement.description}</div>

                <div className="mt-5 flex items-center justify-between gap-3 text-sm font-black">
                  <span className="text-[#557768]">目前進度</span>
                  <span>{Math.min(achievement.progress, achievement.target)} / {achievement.target} {achievement.unit}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e7efe9]">
                  <div className={["h-full rounded-full transition-all duration-300", complete ? "bg-[#55b97b]" : "bg-[#91b9a1]"].join(" ")} style={{ width: `${percent}%` }} />
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-[#2a9d5e]">
                    {achievement.reward.type === "coins" ? `🪙 ${achievement.reward.amount}` : `🎫 ${achievement.reward.amount}`}
                  </div>
                  <button
                    disabled={!complete || achievement.claimed}
                    onClick={() => game.claimAchievementReward(achievement.id, achievement.reward)}
                    className={[
                      "rounded-xl px-4 py-2 text-sm font-black",
                      achievement.claimed
                        ? "border border-[#d7e7de] bg-[#f7faf8] text-[#789083]"
                        : complete
                          ? "bg-[#31c978] text-white transition hover:bg-[#2dbc70]"
                          : "cursor-not-allowed bg-[#edf2ef] text-[#9aac9f]",
                    ].join(" ")}
                  >
                    {achievement.claimed ? "已領取" : complete ? "領取" : "尚未完成"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#dfece4] bg-white p-5">
      <div className="text-sm font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
