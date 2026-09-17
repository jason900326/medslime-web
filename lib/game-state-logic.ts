export type PlayerSlimeState = {
  owned: boolean;
  nickname?: string;
};

export type FocusSession = {
  id: string;
  dateKey: string;
  startedAt: string;
  endedAt: string;
  plannedMinutes: number;
  actualSeconds: number;
  completed: boolean;
  coinsEarned: number;
  companionId: string;
};

export type DailyActivity = {
  questionsAnswered: number;
  mistakesReviewed: number;
  focusSeconds: number;
};

export type NationalExamRewardRecord = {
  examKey: string;
  weekKey: string;
  rewardedAt: string;
};

export type GameState = {
  coins: number;
  tickets: number;
  streak: number;
  companionId: string;
  slimes: Record<string, PlayerSlimeState>;
  freePullDate: string | null;
  pity: number;
  totalPulls: number;
  totalQuestionsAnswered: number;
  totalMistakesReviewed: number;
  activityByDate: Record<string, DailyActivity>;
  claimedAchievementIds: string[];
  claimedTaskIds: string[];
  focusHistory: FocusSession[];
  nationalExamRewardHistory: NationalExamRewardRecord[];
  hasSeenOnboarding: boolean;
};

export type GameSlimeRarity = "N" | "R" | "SR" | "SSR";

export const FOCUS_COIN_CAP = 30;
export const SSR_PITY_PULLS = 75;
export const NATIONAL_EXAM_COMPLETION_REWARD = 100;
export const NATIONAL_EXAM_WEEKLY_REWARD_CAP = 2;

export const starterState: GameState = {
  coins: 0,
  tickets: 0,
  streak: 0,
  companionId: "n-green",
  freePullDate: null,
  pity: 0,
  totalPulls: 0,
  totalQuestionsAnswered: 0,
  totalMistakesReviewed: 0,
  activityByDate: {},
  claimedAchievementIds: [],
  claimedTaskIds: [],
  focusHistory: [],
  nationalExamRewardHistory: [],
  hasSeenOnboarding: false,
  slimes: {
    "n-green": {
      owned: true,
    },
  },
};

export const anonymousState: GameState = {
  ...starterState,
  slimes: { ...starterState.slimes },
  activityByDate: {},
  claimedAchievementIds: [],
  claimedTaskIds: [],
  focusHistory: [],
  nationalExamRewardHistory: [],
  hasSeenOnboarding: true,
};

export function cloneStarterState(): GameState {
  return {
    ...starterState,
    slimes: Object.fromEntries(
      Object.entries(starterState.slimes).map(([id, value]) => [id, { ...value }]),
    ),
    activityByDate: {},
    claimedAchievementIds: [],
    claimedTaskIds: [],
    focusHistory: [],
    nationalExamRewardHistory: [],
  };
}

export function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getLocalWeekKey(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return getLocalDateKey(monday);
}

function dateFromLocalKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, Math.max(0, month - 1), day);
}

function hasActivity(activity?: DailyActivity) {
  if (!activity) return false;
  return (
    activity.questionsAnswered > 0 ||
    activity.mistakesReviewed > 0 ||
    activity.focusSeconds > 0
  );
}

export function calculateStudyStreak(
  activityByDate: Record<string, DailyActivity>,
  now = new Date(),
) {
  const cursor = dateFromLocalKey(getLocalDateKey(now));
  if (!hasActivity(activityByDate[getLocalDateKey(cursor)])) {
    cursor.setDate(cursor.getDate() - 1);
    if (!hasActivity(activityByDate[getLocalDateKey(cursor)])) return 0;
  }

  let streak = 0;
  while (hasActivity(activityByDate[getLocalDateKey(cursor)])) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function normalizeState(raw: unknown): GameState {
  if (!raw || typeof raw !== "object") return cloneStarterState();
  const parsed = raw as Partial<GameState>;
  const activityByDate =
    parsed.activityByDate && typeof parsed.activityByDate === "object"
      ? (parsed.activityByDate as Record<string, DailyActivity>)
      : {};
  const slimes = Object.fromEntries(
    Object.entries({ ...starterState.slimes, ...(parsed.slimes ?? {}) }).map(
      ([slimeId, value]) => {
        const item = value as Partial<PlayerSlimeState>;
        return [
          slimeId,
          {
            owned: item.owned === true,
            ...(typeof item.nickname === "string" ? { nickname: item.nickname } : {}),
          },
        ];
      },
    ),
  ) as Record<string, PlayerSlimeState>;
  const nationalExamRewardHistory = Array.isArray(parsed.nationalExamRewardHistory)
    ? parsed.nationalExamRewardHistory.filter(
        (item): item is NationalExamRewardRecord =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as NationalExamRewardRecord).examKey === "string" &&
              typeof (item as NationalExamRewardRecord).weekKey === "string" &&
              typeof (item as NationalExamRewardRecord).rewardedAt === "string",
          ),
      )
    : [];

  const normalized: GameState = {
    ...cloneStarterState(),
    ...parsed,
    coins:
      typeof parsed.coins === "number" && Number.isFinite(parsed.coins)
        ? Math.max(0, parsed.coins)
        : 0,
    tickets:
      typeof parsed.tickets === "number" && Number.isFinite(parsed.tickets)
        ? Math.max(0, parsed.tickets)
        : 0,
    streak: 0,
    pity:
      typeof parsed.pity === "number" && Number.isFinite(parsed.pity)
        ? Math.max(0, parsed.pity)
        : 0,
    totalPulls:
      typeof parsed.totalPulls === "number" && Number.isFinite(parsed.totalPulls)
        ? Math.max(0, parsed.totalPulls)
        : 0,
    totalQuestionsAnswered:
      typeof parsed.totalQuestionsAnswered === "number" &&
      Number.isFinite(parsed.totalQuestionsAnswered)
        ? Math.max(0, parsed.totalQuestionsAnswered)
        : 0,
    totalMistakesReviewed:
      typeof parsed.totalMistakesReviewed === "number" &&
      Number.isFinite(parsed.totalMistakesReviewed)
        ? Math.max(0, parsed.totalMistakesReviewed)
        : 0,
    activityByDate,
    claimedAchievementIds: Array.isArray(parsed.claimedAchievementIds)
      ? parsed.claimedAchievementIds.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    claimedTaskIds: Array.isArray(parsed.claimedTaskIds)
      ? parsed.claimedTaskIds.filter((item): item is string => typeof item === "string")
      : [],
    freePullDate:
      typeof parsed.freePullDate === "string" || parsed.freePullDate === null
        ? parsed.freePullDate
        : null,
    companionId:
      typeof parsed.companionId === "string"
        ? parsed.companionId
        : starterState.companionId,
    focusHistory: Array.isArray(parsed.focusHistory) ? parsed.focusHistory : [],
    nationalExamRewardHistory,
    hasSeenOnboarding:
      typeof parsed.hasSeenOnboarding === "boolean"
        ? parsed.hasSeenOnboarding
        : false,
    slimes,
  };
  normalized.streak = calculateStudyStreak(normalized.activityByDate);
  return normalized;
}

export function duplicateCoinRefund(rarity: GameSlimeRarity) {
  if (rarity === "N") return 20;
  if (rarity === "R") return 35;
  if (rarity === "SR") return 60;
  return 150;
}

export function rollRarity(
  forceSSR: boolean,
  forceSR: boolean,
  random: () => number = Math.random,
): GameSlimeRarity {
  if (forceSSR) return "SSR";
  if (forceSR) return "SR";
  const roll = random() * 100;
  if (roll < 45) return "N";
  if (roll < 82) return "R";
  if (roll < 99.7) return "SR";
  return "SSR";
}
