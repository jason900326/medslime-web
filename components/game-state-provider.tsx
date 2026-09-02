"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

type GameState = {
  coins: number;
  tickets: number;
  streak: number;
  companionId: string;
  slimes: Record<string, PlayerSlimeState>;
  freePullDate: string | null;
  pity: number;
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

const STORAGE_KEY = "medslime_game_state_v2";
const FOCUS_COIN_CAP = 30;

const defaultState: GameState = {
  coins: 520,
  tickets: 12,
  streak: 3,
  companionId: "n-pink",
  freePullDate: null,
  pity: 0,
  focusHistory: [],
  slimes: {
    "n-green": {
      owned: true,
      fragments: 30,
      accessoryUnlocked: false,
      nickname: "小綠",
    },
    "n-pink": {
      owned: true,
      fragments: 20,
      accessoryUnlocked: false,
      nickname: "Pink",
    },
    "n-blue": {
      owned: true,
      fragments: 0,
      accessoryUnlocked: false,
    },
    "ssr-chill": {
      owned: true,
      fragments: 0,
      accessoryUnlocked: false,
      nickname: "Chill",
    },
  },
};

const GameStateContext = createContext<GameStateContextValue | null>(null);

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
  const [state, setState] = useState<GameState>(defaultState);
  const [isReady, setIsReady] = useState(false);
  const [todayKey, setTodayKey] = useState<string | null>(null);

  useEffect(() => {
    setTodayKey(getLocalDateKey());

    try {
      const saved =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem("medslime_game_state_v1");

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<GameState>;

        setState({
          ...defaultState,
          ...parsed,
          focusHistory: parsed.focusHistory ?? [],
          slimes: {
            ...defaultState.slimes,
            ...(parsed.slimes ?? {}),
          },
        });
      }
    } catch {
      // localStorage 無法讀取時回到預設狀態。
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, isReady]);

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
    todayKey !== null && state.freePullDate !== todayKey;

  const addCoins = (amount: number) => {
    setState((current) => ({
      ...current,
      coins: Math.max(0, current.coins + amount),
    }));
  };

  const addTickets = (amount: number) => {
    setState((current) => ({
      ...current,
      tickets: Math.max(0, current.tickets + amount),
    }));
  };

  const spendCoins = (amount: number) => {
    if (state.coins < amount) return false;

    setState((current) => {
      if (current.coins < amount) return current;
      return { ...current, coins: current.coins - amount };
    });

    return true;
  };

  const spendTickets = (amount: number) => {
    if (state.tickets < amount) return false;

    setState((current) => {
      if (current.tickets < amount) return current;
      return { ...current, tickets: current.tickets - amount };
    });

    return true;
  };

  const useFreePull = () => {
    if (!canUseFreePull) return false;

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
    if (!state.slimes[slimeId]?.owned) return;

    setState((current) => ({
      ...current,
      companionId: slimeId,
    }));
  };

  const setNickname = (slimeId: string, nickname: string) => {
    if (!state.slimes[slimeId]?.owned) return;

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

  const recordFocusSession = (input: {
    plannedMinutes: number;
    actualSeconds: number;
    completed: boolean;
    startedAt: string;
    endedAt: string;
  }) => {
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

    setState((current) => ({
      ...current,
      coins: current.coins + coinsEarned,
      focusHistory: [session, ...current.focusHistory].slice(0, 100),
    }));

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
