"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { SLIMES, SLIME_BY_ID } from "@/lib/slime-data";
import {
  FOCUS_COIN_CAP,
  NATIONAL_EXAM_COMPLETION_REWARD,
  NATIONAL_EXAM_WEEKLY_REWARD_CAP,
  SSR_PITY_PULLS,
  anonymousState,
  calculateStudyStreak,
  cloneStarterState,
  duplicateCoinRefund,
  getLocalDateKey,
  getLocalWeekKey,
  normalizeState,
  rollRarity,
  type FocusSession,
  type GameState,
  type PlayerSlimeState,
} from "@/lib/game-state-logic";

export type { DailyActivity, FocusSession } from "@/lib/game-state-logic";

export type NationalExamRewardResult = {
  amount: number;
  status: "rewarded" | "duplicate" | "weekly-cap" | "unavailable";
};

type PullOutcome = {
  slimeId: string;
  isNew: boolean;
  duplicateReward: { type: "coins"; amount: number } | null;
};

type Reward = {
  type: "coins" | "tickets";
  amount: number;
};

type PullOptions = {
  forceSR?: boolean;
};

type GameStateContextValue = GameState & {
  isReady: boolean;
  addCoins: (amount: number) => void;
  addTickets: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  spendTickets: (amount: number) => boolean;
  canUseFreePull: boolean;
  useFreePull: () => boolean;
  pullOne: (options?: PullOptions) => PullOutcome;
  setCompanion: (slimeId: string) => void;
  setNickname: (slimeId: string, nickname: string) => void;
  claimAchievementReward: (achievementId: string, reward: Reward) => boolean;
  recordQuestionsAnswered: (count: number) => void;
  recordMistakesReviewed: (count: number) => void;
  claimTaskReward: (taskClaimId: string, reward: Reward) => boolean;
  claimNationalExamCompletionReward: (examKey: string) => NationalExamRewardResult;
  completeOnboarding: () => void;
  todayFocusSeconds: number;
  todayFocusMinutes: number;
  todayFocusCoins: number;
  focusCoinCap: number;
  recordFocusSession: (input: {
    plannedMinutes: number;
    actualSeconds: number;
    completed: boolean;
    startedAt: string;
    endedAt: string;
  }) => number;
};

const GameStateContext = createContext<GameStateContextValue | null>(null);

function pickWeightedSlime(
  forceSSR: boolean,
  state: GameState,
  forceSR = false,
) {
  const rarity = rollRarity(forceSSR, forceSR);
  const pool = SLIMES.filter((slime) => slime.rarity === rarity);

  // 收集保護：同稀有度先補尚未擁有的角色；若已收齊則在該稀有度隨機抽取。
  const unowned = pool.filter((slime) => !state.slimes[slime.id]?.owned);
  if (unowned.length > 0) {
    return unowned[Math.floor(Math.random() * unowned.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export function GameStateProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<GameState>(anonymousState);
  const stateRef = useRef<GameState>(anonymousState);
  const [isReady, setIsReady] = useState(false);
  const [todayKey, setTodayKey] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const replaceState = (next: GameState) => {
    stateRef.current = next;
    setState(next);
  };
  const updateState = (updater: (current: GameState) => GameState) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);
    return next;
  };

  useEffect(() => {
    setTodayKey(getLocalDateKey());
    let cancelled = false;
    const loadForUser = async (nextUserId: string | null) => {
      setIsReady(false);
      setUserId(nextUserId);
      setLoadedUserId(null);
      if (!nextUserId) {
        if (!cancelled) {
          replaceState({
            ...anonymousState,
            slimes: { ...anonymousState.slimes },
            activityByDate: {},
            claimedAchievementIds: [],
            claimedTaskIds: [],
            focusHistory: [],
            nationalExamRewardHistory: [],
          });
          setIsReady(true);
        }
        return;
      }
      const { data, error } = await supabase
        .from("player_account_state")
        .select("state")
        .eq("user_id", nextUserId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("讀取 MedSlime 遊戲資料失敗：", error);
        replaceState(cloneStarterState());
        setLoadedUserId(nextUserId);
        setIsReady(true);
        return;
      }
      if (!data) {
        const initialState = cloneStarterState();
        const { error: insertError } = await supabase
          .from("player_account_state")
          .insert({ user_id: nextUserId, state: initialState });
        if (cancelled) return;
        if (insertError) console.error("建立 MedSlime 遊戲資料失敗：", insertError);
        replaceState(initialState);
        setLoadedUserId(nextUserId);
        setIsReady(true);
        return;
      }
      replaceState(normalizeState(data.state));
      setLoadedUserId(nextUserId);
      setIsReady(true);
    };
    const initialize = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await loadForUser(user?.id ?? null);
    };
    void initialize();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadForUser(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!isReady || !userId || loadedUserId !== userId) return;
    const timeout = window.setTimeout(() => {
      void supabase
        .from("player_account_state")
        .upsert(
          { user_id: userId, state, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        )
        .then(({ error }) => {
          if (error) console.error("儲存 MedSlime 遊戲資料失敗：", error);
        });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [state, isReady, userId, loadedUserId, supabase]);

  const todayFocusSessions = useMemo(() => {
    if (!todayKey) return [];
    return state.focusHistory.filter((item) => item.dateKey === todayKey);
  }, [state.focusHistory, todayKey]);
  const todayFocusSeconds = useMemo(
    () => todayFocusSessions.reduce((sum, session) => sum + session.actualSeconds, 0),
    [todayFocusSessions],
  );
  const todayFocusMinutes = Math.floor(todayFocusSeconds / 60);
  const todayFocusCoins = useMemo(
    () => todayFocusSessions.reduce((sum, session) => sum + session.coinsEarned, 0),
    [todayFocusSessions],
  );
  const canUseFreePull =
    Boolean(userId) && todayKey !== null && state.freePullDate !== todayKey;

  const addCoins = (amount: number) => {
    if (!userId) return;
    updateState((current) => ({ ...current, coins: Math.max(0, current.coins + amount) }));
  };
  const addTickets = (amount: number) => {
    if (!userId) return;
    updateState((current) => ({
      ...current,
      tickets: Math.max(0, current.tickets + amount),
    }));
  };
  const spendCoins = (amount: number) => {
    if (!userId || amount <= 0 || stateRef.current.coins < amount) return false;
    updateState((current) => ({ ...current, coins: current.coins - amount }));
    return true;
  };
  const spendTickets = (amount: number) => {
    if (!userId || amount <= 0 || stateRef.current.tickets < amount) return false;
    updateState((current) => ({ ...current, tickets: current.tickets - amount }));
    return true;
  };
  const useFreePull = () => {
    if (!userId || !todayKey || stateRef.current.freePullDate === todayKey) return false;
    const dateKey = getLocalDateKey();
    setTodayKey(dateKey);
    updateState((current) => ({ ...current, freePullDate: dateKey }));
    return true;
  };

  const pullOne = (options?: PullOptions): PullOutcome => {
    const current = stateRef.current;
    const slime = pickWeightedSlime(
      current.pity >= SSR_PITY_PULLS - 1,
      current,
      options?.forceSR === true,
    );
    const owned = current.slimes[slime.id]?.owned ?? false;
    const nextPity = slime.rarity === "SSR" ? 0 : current.pity + 1;

    if (!owned) {
      replaceState({
        ...current,
        pity: nextPity,
        totalPulls: current.totalPulls + 1,
        slimes: {
          ...current.slimes,
          [slime.id]: {
            owned: true,
          },
        },
      });
      return { slimeId: slime.id, isNew: true, duplicateReward: null };
    }

    const refund = duplicateCoinRefund(slime.rarity);
    replaceState({
      ...current,
      pity: nextPity,
      totalPulls: current.totalPulls + 1,
      coins: current.coins + refund,
    });
    return {
      slimeId: slime.id,
      isNew: false,
      duplicateReward: { type: "coins", amount: refund },
    };
  };

  const setCompanion = (slimeId: string) => {
    if (!userId || !stateRef.current.slimes[slimeId]?.owned) return;
    updateState((current) => ({ ...current, companionId: slimeId }));
  };
  const setNickname = (slimeId: string, nickname: string) => {
    if (!userId || !stateRef.current.slimes[slimeId]?.owned) return;
    updateState((current) => ({
      ...current,
      slimes: {
        ...current.slimes,
        [slimeId]: { ...current.slimes[slimeId], nickname: nickname.trim() },
      },
    }));
  };

  const applyClaimReward = (
    id: string,
    reward: Reward,
    kind: "achievement" | "task",
  ) => {
    if (!userId || reward.amount <= 0) return false;
    const claimed =
      kind === "achievement"
        ? stateRef.current.claimedAchievementIds
        : stateRef.current.claimedTaskIds;
    if (claimed.includes(id)) return false;
    updateState((current) => {
      const ids =
        kind === "achievement"
          ? current.claimedAchievementIds
          : current.claimedTaskIds;
      if (ids.includes(id)) return current;
      return {
        ...current,
        coins:
          reward.type === "coins" ? current.coins + reward.amount : current.coins,
        tickets:
          reward.type === "tickets" ? current.tickets + reward.amount : current.tickets,
        ...(kind === "achievement"
          ? { claimedAchievementIds: [...current.claimedAchievementIds, id] }
          : { claimedTaskIds: [...current.claimedTaskIds, id] }),
      };
    });
    return true;
  };

  const claimAchievementReward = (achievementId: string, reward: Reward) =>
    applyClaimReward(achievementId, reward, "achievement");
  const claimTaskReward = (taskClaimId: string, reward: Reward) =>
    applyClaimReward(taskClaimId, reward, "task");

  const recordQuestionsAnswered = (count: number) => {
    if (!userId || count <= 0) return;
    const safeCount = Math.max(0, Math.floor(count));
    const dateKey = getLocalDateKey();
    updateState((current) => {
      const today = current.activityByDate[dateKey] ?? {
        questionsAnswered: 0,
        mistakesReviewed: 0,
        focusSeconds: 0,
      };
      const nextActivity = {
        ...current.activityByDate,
        [dateKey]: {
          ...today,
          questionsAnswered: today.questionsAnswered + safeCount,
        },
      };
      return {
        ...current,
        totalQuestionsAnswered: current.totalQuestionsAnswered + safeCount,
        activityByDate: nextActivity,
        streak: calculateStudyStreak(nextActivity),
      };
    });
  };

  const recordMistakesReviewed = (count: number) => {
    if (!userId || count <= 0) return;
    const safeCount = Math.max(0, Math.floor(count));
    const dateKey = getLocalDateKey();
    updateState((current) => {
      const today = current.activityByDate[dateKey] ?? {
        questionsAnswered: 0,
        mistakesReviewed: 0,
        focusSeconds: 0,
      };
      const nextActivity = {
        ...current.activityByDate,
        [dateKey]: {
          ...today,
          mistakesReviewed: today.mistakesReviewed + safeCount,
        },
      };
      return {
        ...current,
        totalMistakesReviewed: current.totalMistakesReviewed + safeCount,
        activityByDate: nextActivity,
        streak: calculateStudyStreak(nextActivity),
      };
    });
  };

  const claimNationalExamCompletionReward = (
    examKey: string,
  ): NationalExamRewardResult => {
    if (!userId || !examKey.trim()) {
      return { amount: 0, status: "unavailable" };
    }

    const current = stateRef.current;
    if (current.nationalExamRewardHistory.some((item) => item.examKey === examKey)) {
      return { amount: 0, status: "duplicate" };
    }

    const weekKey = getLocalWeekKey();
    const rewardsThisWeek = current.nationalExamRewardHistory.filter(
      (item) => item.weekKey === weekKey,
    ).length;
    if (rewardsThisWeek >= NATIONAL_EXAM_WEEKLY_REWARD_CAP) {
      return { amount: 0, status: "weekly-cap" };
    }

    const rewardedAt = new Date().toISOString();
    updateState((latest) => ({
      ...latest,
      coins: latest.coins + NATIONAL_EXAM_COMPLETION_REWARD,
      nationalExamRewardHistory: [
        ...latest.nationalExamRewardHistory,
        { examKey, weekKey, rewardedAt },
      ],
    }));

    return { amount: NATIONAL_EXAM_COMPLETION_REWARD, status: "rewarded" };
  };

  const completeOnboarding = () => {
    if (!userId) return;
    updateState((current) => ({ ...current, hasSeenOnboarding: true }));
  };

  const recordFocusSession = (input: {
    plannedMinutes: number;
    actualSeconds: number;
    completed: boolean;
    startedAt: string;
    endedAt: string;
  }) => {
    if (!userId) return 0;
    const dateKey = getLocalDateKey(new Date(input.endedAt));
    const current = stateRef.current;
    const earnedBefore = current.focusHistory
      .filter((session) => session.dateKey === dateKey)
      .reduce((sum, session) => sum + session.coinsEarned, 0);
    const eligible = input.completed && input.actualSeconds >= 10 * 60;
    const remainingCap = Math.max(0, FOCUS_COIN_CAP - earnedBefore);
    const sessionReward = Math.floor(input.actualSeconds / (10 * 60)) * 5;
    const coinsEarned = eligible ? Math.min(sessionReward, remainingCap) : 0;
    const session: FocusSession = {
      id: `${input.endedAt}-${Math.random().toString(36).slice(2, 8)}`,
      dateKey,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      plannedMinutes: input.plannedMinutes,
      actualSeconds: Math.max(0, input.actualSeconds),
      completed: input.completed,
      coinsEarned,
      companionId: current.companionId,
    };
    updateState((latest) => {
      const today = latest.activityByDate[dateKey] ?? {
        questionsAnswered: 0,
        mistakesReviewed: 0,
        focusSeconds: 0,
      };
      const nextActivity = {
        ...latest.activityByDate,
        [dateKey]: {
          ...today,
          focusSeconds: today.focusSeconds + Math.max(0, input.actualSeconds),
        },
      };
      return {
        ...latest,
        coins: latest.coins + coinsEarned,
        focusHistory: [session, ...latest.focusHistory].slice(0, 100),
        activityByDate: nextActivity,
        streak: calculateStudyStreak(nextActivity),
      };
    });
    setTodayKey(getLocalDateKey());
    return coinsEarned;
  };

  const value = useMemo<GameStateContextValue>(
    () => ({
      ...state,
      isReady,
      addCoins,
      addTickets,
      spendCoins,
      spendTickets,
      canUseFreePull,
      useFreePull,
      pullOne,
      setCompanion,
      setNickname,
      claimAchievementReward,
      recordQuestionsAnswered,
      recordMistakesReviewed,
      claimTaskReward,
      claimNationalExamCompletionReward,
      completeOnboarding,
      todayFocusSeconds,
      todayFocusMinutes,
      todayFocusCoins,
      focusCoinCap: FOCUS_COIN_CAP,
      recordFocusSession,
    }),
    [state, isReady, canUseFreePull, todayFocusSeconds, todayFocusMinutes, todayFocusCoins],
  );

  return (
    <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) throw new Error("useGameState 必須在 GameStateProvider 裡使用");
  return context;
}

export function getPlayerDisplayName(
  slimeId: string,
  playerState?: PlayerSlimeState,
) {
  return playerState?.nickname || SLIME_BY_ID[slimeId]?.defaultName || "史萊姆";
}
