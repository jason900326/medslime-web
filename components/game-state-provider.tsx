"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { SLIMES, SLIME_BY_ID, type SlimeRarity } from "@/lib/slime-data";

type PlayerSlimeState = {
  owned: boolean;
  fragments: number;
  accessoryUnlocked: boolean;
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

type GameState = {
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
};

type PullOutcome = {
  slimeId: string;
  isNew: boolean;
  duplicateReward:
    | { type: "fragments"; amount: number }
    | { type: "coins"; amount: number }
    | { type: "fragments_full"; amount: 0 }
    | null;
};

type GameStateContextValue = GameState & {
  isReady: boolean;
  addCoins: (amount: number) => void;
  addTickets: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  spendTickets: (amount: number) => boolean;
  canUseFreePull: boolean;
  useFreePull: () => boolean;
  pullOne: () => PullOutcome;
  unlockAccessory: (slimeId: string) => boolean;
  setCompanion: (slimeId: string) => void;
  setNickname: (slimeId: string, nickname: string) => void;
  claimAchievementReward: (
    achievementId: string,
    reward: { type: "coins" | "tickets"; amount: number },
  ) => boolean;
  recordQuestionsAnswered: (count: number) => void;
  recordMistakesReviewed: (count: number) => void;
  claimTaskReward: (
    taskClaimId: string,
    reward: { type: "coins" | "tickets"; amount: number },
  ) => boolean;

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

const FOCUS_COIN_CAP = 30;

/*
 * 正式帳號的初始資料。
 * 測試用 5000 金幣 / 50 抽卡券仍由目前 gacha 頁的一次性 dev grant 發放。
 *
 * 上線前務必：
 * 1. 移除 gacha dev grant
 * 2. 確認 coins / tickets 初始值符合正式規則
 */
const starterState: GameState = {
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
  slimes: {
    "n-green": {
      owned: true,
      fragments: 0,
      accessoryUnlocked: false,
    },
  },
};

const anonymousState: GameState = {
  ...starterState,
  slimes: {
    ...starterState.slimes,
  },
  focusHistory: [],
};

const GameStateContext = createContext<GameStateContextValue | null>(null);

function cloneStarterState(): GameState {
  return {
    ...starterState,
    slimes: Object.fromEntries(
      Object.entries(starterState.slimes).map(([id, value]) => [
        id,
        { ...value },
      ]),
    ),
    activityByDate: Object.fromEntries(
      Object.entries(starterState.activityByDate).map(([key, value]) => [
        key,
        { ...value },
      ]),
    ),
    claimedAchievementIds: [...starterState.claimedAchievementIds],
    claimedTaskIds: [...starterState.claimedTaskIds],
    focusHistory: [],
  };
}

function normalizeState(raw: unknown): GameState {
  if (!raw || typeof raw !== "object") {
    return cloneStarterState();
  }

  const parsed = raw as Partial<GameState>;

  return {
    ...cloneStarterState(),
    ...parsed,
    coins:
      typeof parsed.coins === "number" && Number.isFinite(parsed.coins)
        ? Math.max(0, parsed.coins)
        : starterState.coins,
    tickets:
      typeof parsed.tickets === "number" && Number.isFinite(parsed.tickets)
        ? Math.max(0, parsed.tickets)
        : starterState.tickets,
    streak:
      typeof parsed.streak === "number" && Number.isFinite(parsed.streak)
        ? Math.max(0, parsed.streak)
        : starterState.streak,
    pity:
      typeof parsed.pity === "number" && Number.isFinite(parsed.pity)
        ? Math.max(0, parsed.pity)
        : starterState.pity,
    totalPulls:
      typeof parsed.totalPulls === "number" &&
      Number.isFinite(parsed.totalPulls)
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
    activityByDate:
      parsed.activityByDate && typeof parsed.activityByDate === "object"
        ? (parsed.activityByDate as Record<string, DailyActivity>)
        : {},
    claimedAchievementIds: Array.isArray(parsed.claimedAchievementIds)
      ? parsed.claimedAchievementIds.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    claimedTaskIds: Array.isArray(parsed.claimedTaskIds)
      ? parsed.claimedTaskIds.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    freePullDate:
      typeof parsed.freePullDate === "string" || parsed.freePullDate === null
        ? parsed.freePullDate
        : null,
    companionId:
      typeof parsed.companionId === "string"
        ? parsed.companionId
        : starterState.companionId,
    focusHistory: Array.isArray(parsed.focusHistory)
      ? parsed.focusHistory
      : [],
    slimes: {
      ...starterState.slimes,
      ...(parsed.slimes ?? {}),
    },
  };
}

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function duplicateCoinRefund(rarity: SlimeRarity) {
  if (rarity === "N") return 5;
  if (rarity === "R") return 10;
  if (rarity === "SR") return 20;
  return 50;
}

function pickWeightedSlime(forceSSR: boolean) {
  let rarity: SlimeRarity;

  if (forceSSR) {
    rarity = "SSR";
  } else {
    const roll = Math.random() * 100;
    if (roll < 32) rarity = "N";
    else if (roll < 70) rarity = "R";
    else if (roll < 97) rarity = "SR";
    else rarity = "SSR";
  }

  const pool = SLIMES.filter((slime) => slime.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function GameStateProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [state, setState] = useState<GameState>(anonymousState);
  const [isReady, setIsReady] = useState(false);
  const [todayKey, setTodayKey] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  useEffect(() => {
    setTodayKey(getLocalDateKey());

    let cancelled = false;

    const loadForUser = async (nextUserId: string | null) => {
      setIsReady(false);
      setUserId(nextUserId);
      setLoadedUserId(null);

      if (!nextUserId) {
        if (!cancelled) {
          setState({
            ...anonymousState,
            slimes: { ...anonymousState.slimes },
            focusHistory: [],
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
        setState(cloneStarterState());
        setLoadedUserId(nextUserId);
        setIsReady(true);
        return;
      }

      if (!data) {
        const initialState = cloneStarterState();

        const { error: insertError } = await supabase
          .from("player_account_state")
          .insert({
            user_id: nextUserId,
            state: initialState,
          });

        if (cancelled) return;

        if (insertError) {
          console.error("建立 MedSlime 遊戲資料失敗：", insertError);
        }

        setState(initialState);
        setLoadedUserId(nextUserId);
        setIsReady(true);
        return;
      }

      setState(normalizeState(data.state));
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

  /*
   * 登入後，所有遊戲狀態變化都寫進該 user_id 的 Supabase row。
   * 使用短 debounce，避免一次抽十連時每個 state update 都各送一個 request。
   */
  useEffect(() => {
    if (
      !isReady ||
      !userId ||
      loadedUserId !== userId
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void supabase
        .from("player_account_state")
        .upsert(
          {
            user_id: userId,
            state,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        )
        .then(({ error }) => {
          if (error) {
            console.error("儲存 MedSlime 遊戲資料失敗：", error);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [state, isReady, userId, loadedUserId, supabase]);

  const todayFocusSessions = useMemo(() => {
    if (!todayKey) return [];
    return state.focusHistory.filter((item) => item.dateKey === todayKey);
  }, [state.focusHistory, todayKey]);

  const todayFocusSeconds = useMemo(
    () =>
      todayFocusSessions.reduce(
        (sum, session) => sum + session.actualSeconds,
        0,
      ),
    [todayFocusSessions],
  );

  const todayFocusMinutes = Math.floor(todayFocusSeconds / 60);

  const todayFocusCoins = useMemo(
    () =>
      todayFocusSessions.reduce(
        (sum, session) => sum + session.coinsEarned,
        0,
      ),
    [todayFocusSessions],
  );

  const canUseFreePull =
    Boolean(userId) &&
    todayKey !== null &&
    state.freePullDate !== todayKey;

  const addCoins = (amount: number) => {
    if (!userId) return;

    setState((current) => ({
      ...current,
      coins: Math.max(0, current.coins + amount),
    }));
  };

  const addTickets = (amount: number) => {
    if (!userId) return;

    setState((current) => ({
      ...current,
      tickets: Math.max(0, current.tickets + amount),
    }));
  };

  const spendCoins = (amount: number) => {
    if (!userId || state.coins < amount) return false;

    setState((current) => {
      if (current.coins < amount) return current;
      return { ...current, coins: current.coins - amount };
    });

    return true;
  };

  const spendTickets = (amount: number) => {
    if (!userId || state.tickets < amount) return false;

    setState((current) => {
      if (current.tickets < amount) return current;
      return { ...current, tickets: current.tickets - amount };
    });

    return true;
  };

  const useFreePull = () => {
    if (!userId || !canUseFreePull) return false;

    const dateKey = getLocalDateKey();
    setTodayKey(dateKey);

    setState((current) => ({
      ...current,
      freePullDate: dateKey,
    }));

    return true;
  };

  const pullOne = (): PullOutcome => {
    const forceSSR = state.pity >= 99;
    const slime = pickWeightedSlime(forceSSR);
    const playerSlime = state.slimes[slime.id];
    const owned = playerSlime?.owned ?? false;

    if (!owned) {
      setState((current) => ({
        ...current,
        pity: slime.rarity === "SSR" ? 0 : current.pity + 1,
        totalPulls: current.totalPulls + 1,
        slimes: {
          ...current.slimes,
          [slime.id]: {
            owned: true,
            fragments: 0,
            accessoryUnlocked: false,
          },
        },
      }));

      return {
        slimeId: slime.id,
        isNew: true,
        duplicateReward: null,
      };
    }

    if (playerSlime.accessoryUnlocked) {
      const refund = duplicateCoinRefund(slime.rarity);

      setState((current) => ({
        ...current,
        pity: slime.rarity === "SSR" ? 0 : current.pity + 1,
        totalPulls: current.totalPulls + 1,
        coins: current.coins + refund,
      }));

      return {
        slimeId: slime.id,
        isNew: false,
        duplicateReward: { type: "coins", amount: refund },
      };
    }

    if (playerSlime.fragments >= 30) {
      setState((current) => ({
        ...current,
        pity: slime.rarity === "SSR" ? 0 : current.pity + 1,
        totalPulls: current.totalPulls + 1,
      }));

      return {
        slimeId: slime.id,
        isNew: false,
        duplicateReward: { type: "fragments_full", amount: 0 },
      };
    }

    const nextFragments = Math.min(30, playerSlime.fragments + 10);
    const added = nextFragments - playerSlime.fragments;

    setState((current) => {
      const latest = current.slimes[slime.id];
      if (!latest) return current;

      return {
        ...current,
        pity: slime.rarity === "SSR" ? 0 : current.pity + 1,
        totalPulls: current.totalPulls + 1,
        slimes: {
          ...current.slimes,
          [slime.id]: {
            ...latest,
            fragments: Math.min(30, latest.fragments + 10),
          },
        },
      };
    });

    return {
      slimeId: slime.id,
      isNew: false,
      duplicateReward: { type: "fragments", amount: added },
    };
  };

  const unlockAccessory = (slimeId: string) => {
    const playerSlime = state.slimes[slimeId];

    if (
      !userId ||
      !playerSlime?.owned ||
      playerSlime.accessoryUnlocked ||
      playerSlime.fragments < 30
    ) {
      return false;
    }

    setState((current) => {
      const latest = current.slimes[slimeId];

      if (
        !latest?.owned ||
        latest.accessoryUnlocked ||
        latest.fragments < 30
      ) {
        return current;
      }

      return {
        ...current,
        slimes: {
          ...current.slimes,
          [slimeId]: {
            ...latest,
            fragments: latest.fragments - 30,
            accessoryUnlocked: true,
          },
        },
      };
    });

    return true;
  };

  const setCompanion = (slimeId: string) => {
    if (!userId || !state.slimes[slimeId]?.owned) return;

    setState((current) => ({
      ...current,
      companionId: slimeId,
    }));
  };

  const setNickname = (slimeId: string, nickname: string) => {
    if (!userId || !state.slimes[slimeId]?.owned) return;

    setState((current) => ({
      ...current,
      slimes: {
        ...current.slimes,
        [slimeId]: {
          ...current.slimes[slimeId],
          nickname: nickname.trim(),
        },
      },
    }));
  };

  const claimAchievementReward = (
    achievementId: string,
    reward: { type: "coins" | "tickets"; amount: number },
  ) => {
    if (
      !userId ||
      state.claimedAchievementIds.includes(achievementId) ||
      reward.amount <= 0
    ) {
      return false;
    }

    setState((current) => {
      if (current.claimedAchievementIds.includes(achievementId)) {
        return current;
      }

      return {
        ...current,
        coins:
          reward.type === "coins"
            ? current.coins + reward.amount
            : current.coins,
        tickets:
          reward.type === "tickets"
            ? current.tickets + reward.amount
            : current.tickets,
        claimedAchievementIds: [
          ...current.claimedAchievementIds,
          achievementId,
        ],
      };
    });

    return true;
  };

  const recordQuestionsAnswered = (count: number) => {
    if (!userId || count <= 0) return;

    const safeCount = Math.max(0, Math.floor(count));
    const dateKey = getLocalDateKey();

    setState((current) => {
      const today = current.activityByDate[dateKey] ?? {
        questionsAnswered: 0,
        mistakesReviewed: 0,
        focusSeconds: 0,
      };

      return {
        ...current,
        totalQuestionsAnswered:
          current.totalQuestionsAnswered + safeCount,
        activityByDate: {
          ...current.activityByDate,
          [dateKey]: {
            ...today,
            questionsAnswered:
              today.questionsAnswered + safeCount,
          },
        },
      };
    });
  };

  const recordMistakesReviewed = (count: number) => {
    if (!userId || count <= 0) return;

    const safeCount = Math.max(0, Math.floor(count));
    const dateKey = getLocalDateKey();

    setState((current) => {
      const today = current.activityByDate[dateKey] ?? {
        questionsAnswered: 0,
        mistakesReviewed: 0,
        focusSeconds: 0,
      };

      return {
        ...current,
        totalMistakesReviewed:
          current.totalMistakesReviewed + safeCount,
        activityByDate: {
          ...current.activityByDate,
          [dateKey]: {
            ...today,
            mistakesReviewed:
              today.mistakesReviewed + safeCount,
          },
        },
      };
    });
  };

  const claimTaskReward = (
    taskClaimId: string,
    reward: { type: "coins" | "tickets"; amount: number },
  ) => {
    if (
      !userId ||
      state.claimedTaskIds.includes(taskClaimId) ||
      reward.amount <= 0
    ) {
      return false;
    }

    setState((current) => {
      if (current.claimedTaskIds.includes(taskClaimId)) {
        return current;
      }

      return {
        ...current,
        coins:
          reward.type === "coins"
            ? current.coins + reward.amount
            : current.coins,
        tickets:
          reward.type === "tickets"
            ? current.tickets + reward.amount
            : current.tickets,
        claimedTaskIds: [
          ...current.claimedTaskIds,
          taskClaimId,
        ],
      };
    });

    return true;
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

    const earnedBefore = state.focusHistory
      .filter((session) => session.dateKey === dateKey)
      .reduce((sum, session) => sum + session.coinsEarned, 0);

    const eligible =
      input.completed && input.actualSeconds >= 10 * 60;

    const remainingCap = Math.max(0, FOCUS_COIN_CAP - earnedBefore);
    const coinsEarned = eligible ? Math.min(5, remainingCap) : 0;

    const session: FocusSession = {
      id: `${input.endedAt}-${Math.random().toString(36).slice(2, 8)}`,
      dateKey,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      plannedMinutes: input.plannedMinutes,
      actualSeconds: Math.max(0, input.actualSeconds),
      completed: input.completed,
      coinsEarned,
      companionId: state.companionId,
    };

    setState((current) => {
      const today = current.activityByDate[dateKey] ?? {
        questionsAnswered: 0,
        mistakesReviewed: 0,
        focusSeconds: 0,
      };

      return {
        ...current,
        coins: current.coins + coinsEarned,
        focusHistory: [session, ...current.focusHistory].slice(0, 100),
        activityByDate: {
          ...current.activityByDate,
          [dateKey]: {
            ...today,
            focusSeconds:
              today.focusSeconds + Math.max(0, input.actualSeconds),
          },
        },
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
      unlockAccessory,
      setCompanion,
      setNickname,
      claimAchievementReward,
      recordQuestionsAnswered,
      recordMistakesReviewed,
      claimTaskReward,
      todayFocusSeconds,
      todayFocusMinutes,
      todayFocusCoins,
      focusCoinCap: FOCUS_COIN_CAP,
      recordFocusSession,
    }),
    [
      state,
      isReady,
      canUseFreePull,
      todayFocusSeconds,
      todayFocusMinutes,
      todayFocusCoins,
    ],
  );

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);

  if (!context) {
    throw new Error("useGameState 必須在 GameStateProvider 裡使用");
  }

  return context;
}

export function getPlayerDisplayName(
  slimeId: string,
  playerState?: PlayerSlimeState,
) {
  return (
    playerState?.nickname ||
    SLIME_BY_ID[slimeId]?.defaultName ||
    "史萊姆"
  );
}
