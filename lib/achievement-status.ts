import { SLIMES } from "@/lib/slime-data";

type AchievementSnapshot = {
  focusHistory: Array<{ actualSeconds: number }>;
  slimes: Record<
    string,
    {
      owned?: boolean;
      accessoryUnlocked?: boolean;
      nickname?: string;
    }
  >;
  totalPulls: number;
  totalQuestionsAnswered: number;
  totalMistakesReviewed: number;
  streak: number;
  claimedAchievementIds: string[];
};

export const ACHIEVEMENT_COUNT = 24;

export function getCompletedAchievementIds(game: AchievementSnapshot) {
  const completed: string[] = [];
  const focusMinutes = Math.floor(
    game.focusHistory.reduce((sum, session) => sum + session.actualSeconds, 0) / 60,
  );
  const ownedCount = SLIMES.filter((slime) => game.slimes[slime.id]?.owned).length;
  const accessoryCount = SLIMES.filter(
    (slime) => game.slimes[slime.id]?.accessoryUnlocked,
  ).length;
  const ownedByRarity = (rarity: "N" | "R" | "SR" | "SSR") =>
    SLIMES.filter(
      (slime) => slime.rarity === rarity && game.slimes[slime.id]?.owned,
    ).length;

  const checks: Array<[string, boolean]> = [
    ["focus-1", focusMinutes >= 60],
    ["focus-10", focusMinutes >= 600],
    ["focus-30", focusMinutes >= 1800],
    ["focus-60", focusMinutes >= 3600],
    ["focus-100", focusMinutes >= 6000],
    ["focus-150", focusMinutes >= 9000],
    ["questions-100", game.totalQuestionsAnswered >= 100],
    ["questions-500", game.totalQuestionsAnswered >= 500],
    ["questions-1000", game.totalQuestionsAnswered >= 1000],
    ["mistakes-50", game.totalMistakesReviewed >= 50],
    ["collection-5", ownedCount >= 5],
    ["collection-all-n", ownedByRarity("N") >= SLIMES.filter((s) => s.rarity === "N").length],
    ["collection-all-r", ownedByRarity("R") >= SLIMES.filter((s) => s.rarity === "R").length],
    ["collection-all-sr", ownedByRarity("SR") >= SLIMES.filter((s) => s.rarity === "SR").length],
    ["accessory-first", accessoryCount >= 1],
    ["collection-complete", accessoryCount >= SLIMES.length && ownedCount >= SLIMES.length],
    ["pull-10", game.totalPulls >= 10],
    ["pull-25", game.totalPulls >= 25],
    ["pull-50", game.totalPulls >= 50],
    ["pull-100", game.totalPulls >= 100],
    ["special-ssr", ownedByRarity("SSR") > 0],
    [
      "special-ssr-accessory",
      SLIMES.some(
        (slime) =>
          slime.rarity === "SSR" && game.slimes[slime.id]?.accessoryUnlocked,
      ),
    ],
    [
      "special-nickname",
      Object.values(game.slimes).some((slime) => Boolean(slime.nickname?.trim())),
    ],
    ["special-streak-7", game.streak >= 7],
  ];

  for (const [id, isComplete] of checks) {
    if (isComplete) completed.push(id);
  }

  return completed;
}

export function getClaimableAchievementIds(game: AchievementSnapshot) {
  const claimed = new Set(game.claimedAchievementIds);
  return getCompletedAchievementIds(game).filter((id) => !claimed.has(id));
}
