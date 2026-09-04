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
import {
  SLIMES,
  SLIME_BY_ID,
  type SlimeRarity,
} from "@/lib/slime-data";

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

  // 新手導覽只顯示一次，跟著帳號保存。
  hasSeenOnboarding: boolean;
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
    reward: {
      type: "coins" | "tickets";
      amount: number;
    },
  ) => boolean;

  recordQuestionsAnswered: (count: number) => void;
  recordMistakesReviewed: (count: number) => void;

  claimTaskReward: (
    taskClaimId: string,
    reward: {
      type: "coins" | "tickets";
      amount: number;
    },
  ) => boolean;

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

const FOCUS_COIN_CAP = 30;

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
  hasSeenOnboarding: false,
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
  activityByDate: {},
  claimedAchievementIds: [],
  claimedTaskIds: [],
  focusHistory: [],
  hasSeenOnboarding: true,
};

const GameStateContext =
  createContext<GameStateContextValue | null>(null);

function cloneStarterState(): GameState {
  return {
    ...starterState,

    slimes: Object.fromEntries(
      Object.entries(starterState.slimes).map(
        ([id, value]) => [
          id,
          {
            ...value,
          },
        ],
      ),
    ),

    activityByDate: Object.fromEntries(
      Object.entries(
        starterState.activityByDate,
      ).map(([key, value]) => [
        key,
        {
          ...value,
        },
      ]),
    ),

    claimedAchievementIds: [
      ...starterState.claimedAchievementIds,
    ],

    claimedTaskIds: [
      ...starterState.claimedTaskIds,
    ],

    focusHistory: [],
    hasSeenOnboarding: starterState.hasSeenOnboarding,
  };
}

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const d = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function dateFromLocalKey(key: string) {
  const [year, month, day] = key
    .split("-")
    .map(Number);

  return new Date(
    year,
    Math.max(0, month - 1),
    day,
  );
}

function hasActivity(
  activity?: DailyActivity,
) {
  if (!activity) return false;

  return (
    activity.questionsAnswered > 0 ||
    activity.mistakesReviewed > 0 ||
    activity.focusSeconds > 0
  );
}

/*
 * 連續學習天數：
 * - 今天已有活動 → 從今天往前數
 * - 今天還沒活動、昨天有活動 → 保留昨天以前的 streak
 * - 今天與昨天都沒有 → 0
 */
function calculateStudyStreak(
  activityByDate: Record<
    string,
    DailyActivity
  >,
  now = new Date(),
) {
  const todayKey = getLocalDateKey(now);

  let cursor = dateFromLocalKey(todayKey);

  if (
    !hasActivity(
      activityByDate[
        getLocalDateKey(cursor)
      ],
    )
  ) {
    cursor.setDate(
      cursor.getDate() - 1,
    );

    if (
      !hasActivity(
        activityByDate[
          getLocalDateKey(cursor)
        ],
      )
    ) {
      return 0;
    }
  }

  let streak = 0;

  while (
    hasActivity(
      activityByDate[
        getLocalDateKey(cursor)
      ],
    )
  ) {
    streak += 1;

    cursor.setDate(
      cursor.getDate() - 1,
    );
  }

  return streak;
}

function normalizeState(
  raw: unknown,
): GameState {
  if (
    !raw ||
    typeof raw !== "object"
  ) {
    return cloneStarterState();
  }

  const parsed =
    raw as Partial<GameState>;

  const activityByDate =
    parsed.activityByDate &&
    typeof parsed.activityByDate ===
      "object"
      ? (parsed.activityByDate as Record<
          string,
          DailyActivity
        >)
      : {};

  const normalized: GameState = {
    ...cloneStarterState(),
    ...parsed,

    coins:
      typeof parsed.coins ===
        "number" &&
      Number.isFinite(parsed.coins)
        ? Math.max(
            0,
            parsed.coins,
          )
        : starterState.coins,

    tickets:
      typeof parsed.tickets ===
        "number" &&
      Number.isFinite(parsed.tickets)
        ? Math.max(
            0,
            parsed.tickets,
          )
        : starterState.tickets,

    streak: 0,

    pity:
      typeof parsed.pity ===
        "number" &&
      Number.isFinite(parsed.pity)
        ? Math.max(
            0,
            parsed.pity,
          )
        : starterState.pity,

    totalPulls:
      typeof parsed.totalPulls ===
        "number" &&
      Number.isFinite(
        parsed.totalPulls,
      )
        ? Math.max(
            0,
            parsed.totalPulls,
          )
        : 0,

    totalQuestionsAnswered:
      typeof parsed.totalQuestionsAnswered ===
        "number" &&
      Number.isFinite(
        parsed.totalQuestionsAnswered,
      )
        ? Math.max(
            0,
            parsed.totalQuestionsAnswered,
          )
        : 0,

    totalMistakesReviewed:
      typeof parsed.totalMistakesReviewed ===
        "number" &&
      Number.isFinite(
        parsed.totalMistakesReviewed,
      )
        ? Math.max(
            0,
            parsed.totalMistakesReviewed,
          )
        : 0,

    activityByDate,

    claimedAchievementIds:
      Array.isArray(
        parsed.claimedAchievementIds,
      )
        ? parsed.claimedAchievementIds.filter(
            (
              item,
            ): item is string =>
              typeof item === "string",
          )
        : [],

    claimedTaskIds:
      Array.isArray(
        parsed.claimedTaskIds,
      )
        ? parsed.claimedTaskIds.filter(
            (
              item,
            ): item is string =>
              typeof item === "string",
          )
        : [],

    hasSeenOnboarding:
      typeof parsed.hasSeenOnboarding === "boolean"
        ? parsed.hasSeenOnboarding
        : false,

    freePullDate:
      typeof parsed.freePullDate ===
        "string" ||
      parsed.freePullDate === null
        ? parsed.freePullDate
        : null,

    companionId:
      typeof parsed.companionId ===
      "string"
        ? parsed.companionId
        : starterState.companionId,

    focusHistory:
      Array.isArray(
        parsed.focusHistory,
      )
        ? parsed.focusHistory
        : [],

    slimes: {
      ...starterState.slimes,
      ...(parsed.slimes ?? {}),
    },
  };

  normalized.streak =
    calculateStudyStreak(
      normalized.activityByDate,
    );

  return normalized;
}

function duplicateCoinRefund(
  rarity: SlimeRarity,
) {
  if (rarity === "N") return 5;
  if (rarity === "R") return 10;
  if (rarity === "SR") return 20;

  return 50;
}

function pickWeightedSlime(
  forceSSR: boolean,
) {
  let rarity: SlimeRarity;

  if (forceSSR) {
    rarity = "SSR";
  } else {
    const roll =
      Math.random() * 100;

    if (roll < 32) {
      rarity = "N";
    } else if (roll < 70) {
      rarity = "R";
    } else if (roll < 97) {
      rarity = "SR";
    } else {
      rarity = "SSR";
    }
  }

  const pool = SLIMES.filter(
    (slime) =>
      slime.rarity === rarity,
  );

  return pool[
    Math.floor(
      Math.random() * pool.length,
    )
  ];
}

export function GameStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [state, setState] =
    useState<GameState>(
      anonymousState,
    );

  /*
   * React 在十連抽時會 batch setState。
   * 只讀 state closure 會讓十次 pullOne() 都看到同一份舊資料：
   * - 同一隻史萊姆可能被判定成多次 NEW
   * - 碎片 / duplicate reward 可能錯
   * - pity 可能錯
   *
   * stateRef 讓每一個同步操作都立刻看到上一個操作後的最新 state。
   */
  const stateRef =
    useRef<GameState>(
      anonymousState,
    );

  const [isReady, setIsReady] =
    useState(false);

  const [todayKey, setTodayKey] =
    useState<string | null>(null);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [
    loadedUserId,
    setLoadedUserId,
  ] = useState<string | null>(
    null,
  );

  const replaceState = (
    next: GameState,
  ) => {
    stateRef.current = next;
    setState(next);
  };

  const updateState = (
    updater: (
      current: GameState,
    ) => GameState,
  ) => {
    const next =
      updater(stateRef.current);

    stateRef.current = next;
    setState(next);

    return next;
  };

  useEffect(() => {
    setTodayKey(
      getLocalDateKey(),
    );

    let cancelled = false;

    const loadForUser = async (
      nextUserId: string | null,
    ) => {
      setIsReady(false);
      setUserId(nextUserId);
      setLoadedUserId(null);

      if (!nextUserId) {
        if (!cancelled) {
          replaceState({
            ...anonymousState,

            slimes: {
              ...anonymousState.slimes,
            },

            activityByDate: {},

            claimedAchievementIds:
              [],

            claimedTaskIds: [],

            focusHistory: [],

            hasSeenOnboarding: true,
          });

          setIsReady(true);
        }

        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from(
          "player_account_state",
        )
        .select("state")
        .eq(
          "user_id",
          nextUserId,
        )
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error(
          "讀取 MedSlime 遊戲資料失敗：",
          error,
        );

        replaceState(
          cloneStarterState(),
        );

        setLoadedUserId(
          nextUserId,
        );

        setIsReady(true);

        return;
      }

      if (!data) {
        const initialState =
          cloneStarterState();

        const {
          error: insertError,
        } = await supabase
          .from(
            "player_account_state",
          )
          .insert({
            user_id:
              nextUserId,
            state:
              initialState,
          });

        if (cancelled) return;

        if (insertError) {
          console.error(
            "建立 MedSlime 遊戲資料失敗：",
            insertError,
          );
        }

        replaceState(
          initialState,
        );

        setLoadedUserId(
          nextUserId,
        );

        setIsReady(true);

        return;
      }

      replaceState(
        normalizeState(
          data.state,
        ),
      );

      setLoadedUserId(
        nextUserId,
      );

      setIsReady(true);
    };

    const initialize =
      async () => {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        await loadForUser(
          user?.id ?? null,
        );
      };

    void initialize();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session,
        ) => {
          void loadForUser(
            session?.user?.id ??
              null,
          );
        },
      );

    return () => {
      cancelled = true;

      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (
      !isReady ||
      !userId ||
      loadedUserId !== userId
    ) {
      return;
    }

    const timeout =
      window.setTimeout(() => {
        void supabase
          .from(
            "player_account_state",
          )
          .upsert(
            {
              user_id: userId,
              state,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "user_id",
            },
          )
          .then(
            ({ error }) => {
              if (error) {
                console.error(
                  "儲存 MedSlime 遊戲資料失敗：",
                  error,
                );
              }
            },
          );
      }, 300);

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [
    state,
    isReady,
    userId,
    loadedUserId,
    supabase,
  ]);

  const todayFocusSessions =
    useMemo(() => {
      if (!todayKey) {
        return [];
      }

      return state.focusHistory.filter(
        (item) =>
          item.dateKey ===
          todayKey,
      );
    }, [
      state.focusHistory,
      todayKey,
    ]);

  const todayFocusSeconds =
    useMemo(
      () =>
        todayFocusSessions.reduce(
          (
            sum,
            session,
          ) =>
            sum +
            session.actualSeconds,
          0,
        ),
      [todayFocusSessions],
    );

  const todayFocusMinutes =
    Math.floor(
      todayFocusSeconds / 60,
    );

  const todayFocusCoins =
    useMemo(
      () =>
        todayFocusSessions.reduce(
          (
            sum,
            session,
          ) =>
            sum +
            session.coinsEarned,
          0,
        ),
      [todayFocusSessions],
    );

  const canUseFreePull =
    Boolean(userId) &&
    todayKey !== null &&
    state.freePullDate !==
      todayKey;

  const addCoins = (
    amount: number,
  ) => {
    if (!userId) return;

    updateState(
      (current) => ({
        ...current,

        coins: Math.max(
          0,
          current.coins +
            amount,
        ),
      }),
    );
  };

  const addTickets = (
    amount: number,
  ) => {
    if (!userId) return;

    updateState(
      (current) => ({
        ...current,

        tickets: Math.max(
          0,
          current.tickets +
            amount,
        ),
      }),
    );
  };

  const spendCoins = (
    amount: number,
  ) => {
    if (
      !userId ||
      amount <= 0
    ) {
      return false;
    }

    const current =
      stateRef.current;

    if (
      current.coins <
      amount
    ) {
      return false;
    }

    updateState(
      (latest) => ({
        ...latest,

        coins:
          latest.coins -
          amount,
      }),
    );

    return true;
  };

  const spendTickets = (
    amount: number,
  ) => {
    if (
      !userId ||
      amount <= 0
    ) {
      return false;
    }

    const current =
      stateRef.current;

    if (
      current.tickets <
      amount
    ) {
      return false;
    }

    updateState(
      (latest) => ({
        ...latest,

        tickets:
          latest.tickets -
          amount,
      }),
    );

    return true;
  };

  const useFreePull = () => {
    if (
      !userId ||
      !todayKey
    ) {
      return false;
    }

    const current =
      stateRef.current;

    if (
      current.freePullDate ===
      todayKey
    ) {
      return false;
    }

    const dateKey =
      getLocalDateKey();

    setTodayKey(dateKey);

    updateState(
      (latest) => ({
        ...latest,

        freePullDate:
          dateKey,
      }),
    );

    return true;
  };

  const pullOne =
    (): PullOutcome => {
      const current =
        stateRef.current;

      const forceSSR =
        current.pity >= 99;

      const slime =
        pickWeightedSlime(
          forceSSR,
        );

      const playerSlime =
        current.slimes[
          slime.id
        ];

      const owned =
        playerSlime?.owned ??
        false;

      if (!owned) {
        const next: GameState = {
          ...current,

          pity:
            slime.rarity ===
            "SSR"
              ? 0
              : current.pity + 1,

          totalPulls:
            current.totalPulls +
            1,

          slimes: {
            ...current.slimes,

            [slime.id]: {
              owned: true,
              fragments: 0,
              accessoryUnlocked:
                false,
            },
          },
        };

        replaceState(next);

        return {
          slimeId:
            slime.id,
          isNew: true,
          duplicateReward:
            null,
        };
      }

      if (
        playerSlime.accessoryUnlocked
      ) {
        const refund =
          duplicateCoinRefund(
            slime.rarity,
          );

        const next: GameState = {
          ...current,

          pity:
            slime.rarity ===
            "SSR"
              ? 0
              : current.pity + 1,

          totalPulls:
            current.totalPulls +
            1,

          coins:
            current.coins +
            refund,
        };

        replaceState(next);

        return {
          slimeId:
            slime.id,
          isNew: false,

          duplicateReward: {
            type: "coins",
            amount: refund,
          },
        };
      }

      if (
        playerSlime.fragments >=
        30
      ) {
        const next: GameState = {
          ...current,

          pity:
            slime.rarity ===
            "SSR"
              ? 0
              : current.pity + 1,

          totalPulls:
            current.totalPulls +
            1,
        };

        replaceState(next);

        return {
          slimeId:
            slime.id,

          isNew: false,

          duplicateReward: {
            type:
              "fragments_full",
            amount: 0,
          },
        };
      }

      const nextFragments =
        Math.min(
          30,
          playerSlime.fragments +
            10,
        );

      const added =
        nextFragments -
        playerSlime.fragments;

      const next: GameState = {
        ...current,

        pity:
          slime.rarity ===
          "SSR"
            ? 0
            : current.pity + 1,

        totalPulls:
          current.totalPulls +
          1,

        slimes: {
          ...current.slimes,

          [slime.id]: {
            ...playerSlime,

            fragments:
              nextFragments,
          },
        },
      };

      replaceState(next);

      return {
        slimeId:
          slime.id,

        isNew: false,

        duplicateReward: {
          type: "fragments",
          amount: added,
        },
      };
    };

  const unlockAccessory = (
    slimeId: string,
  ) => {
    if (!userId) {
      return false;
    }

    const current =
      stateRef.current;

    const playerSlime =
      current.slimes[
        slimeId
      ];

    if (
      !playerSlime?.owned ||
      playerSlime.accessoryUnlocked ||
      playerSlime.fragments < 30
    ) {
      return false;
    }

    updateState(
      (latest) => {
        const latestSlime =
          latest.slimes[
            slimeId
          ];

        if (
          !latestSlime?.owned ||
          latestSlime.accessoryUnlocked ||
          latestSlime.fragments <
            30
        ) {
          return latest;
        }

        return {
          ...latest,

          slimes: {
            ...latest.slimes,

            [slimeId]: {
              ...latestSlime,

              fragments:
                latestSlime.fragments -
                30,

              accessoryUnlocked:
                true,
            },
          },
        };
      },
    );

    return true;
  };

  const setCompanion = (
    slimeId: string,
  ) => {
    if (!userId) return;

    if (
      !stateRef.current
        .slimes[slimeId]
        ?.owned
    ) {
      return;
    }

    updateState(
      (current) => ({
        ...current,

        companionId:
          slimeId,
      }),
    );
  };

  const setNickname = (
    slimeId: string,
    nickname: string,
  ) => {
    if (!userId) return;

    if (
      !stateRef.current
        .slimes[slimeId]
        ?.owned
    ) {
      return;
    }

    updateState(
      (current) => ({
        ...current,

        slimes: {
          ...current.slimes,

          [slimeId]: {
            ...current.slimes[
              slimeId
            ],

            nickname:
              nickname.trim(),
          },
        },
      }),
    );
  };

  const claimAchievementReward =
    (
      achievementId: string,

      reward: {
        type:
          | "coins"
          | "tickets";
        amount: number;
      },
    ) => {
      if (
        !userId ||
        reward.amount <= 0
      ) {
        return false;
      }

      if (
        stateRef.current
          .claimedAchievementIds
          .includes(
            achievementId,
          )
      ) {
        return false;
      }

      updateState(
        (current) => {
          if (
            current
              .claimedAchievementIds
              .includes(
                achievementId,
              )
          ) {
            return current;
          }

          return {
            ...current,

            coins:
              reward.type ===
              "coins"
                ? current.coins +
                  reward.amount
                : current.coins,

            tickets:
              reward.type ===
              "tickets"
                ? current.tickets +
                  reward.amount
                : current.tickets,

            claimedAchievementIds:
              [
                ...current.claimedAchievementIds,
                achievementId,
              ],
          };
        },
      );

      return true;
    };

  const recordQuestionsAnswered =
    (count: number) => {
      if (
        !userId ||
        count <= 0
      ) {
        return;
      }

      const safeCount =
        Math.max(
          0,
          Math.floor(count),
        );

      const dateKey =
        getLocalDateKey();

      updateState(
        (current) => {
          const today =
            current
              .activityByDate[
                dateKey
              ] ?? {
              questionsAnswered: 0,
              mistakesReviewed: 0,
              focusSeconds: 0,
            };

          const nextActivity = {
            ...current.activityByDate,

            [dateKey]: {
              ...today,

              questionsAnswered:
                today.questionsAnswered +
                safeCount,
            },
          };

          return {
            ...current,

            totalQuestionsAnswered:
              current.totalQuestionsAnswered +
              safeCount,

            activityByDate:
              nextActivity,

            streak:
              calculateStudyStreak(
                nextActivity,
              ),
          };
        },
      );
    };

  const recordMistakesReviewed =
    (count: number) => {
      if (
        !userId ||
        count <= 0
      ) {
        return;
      }

      const safeCount =
        Math.max(
          0,
          Math.floor(count),
        );

      const dateKey =
        getLocalDateKey();

      updateState(
        (current) => {
          const today =
            current
              .activityByDate[
                dateKey
              ] ?? {
              questionsAnswered: 0,
              mistakesReviewed: 0,
              focusSeconds: 0,
            };

          const nextActivity = {
            ...current.activityByDate,

            [dateKey]: {
              ...today,

              mistakesReviewed:
                today.mistakesReviewed +
                safeCount,
            },
          };

          return {
            ...current,

            totalMistakesReviewed:
              current.totalMistakesReviewed +
              safeCount,

            activityByDate:
              nextActivity,

            streak:
              calculateStudyStreak(
                nextActivity,
              ),
          };
        },
      );
    };

  const claimTaskReward =
    (
      taskClaimId: string,

      reward: {
        type:
          | "coins"
          | "tickets";
        amount: number;
      },
    ) => {
      if (
        !userId ||
        reward.amount <= 0
      ) {
        return false;
      }

      if (
        stateRef.current
          .claimedTaskIds
          .includes(
            taskClaimId,
          )
      ) {
        return false;
      }

      updateState(
        (current) => {
          if (
            current
              .claimedTaskIds
              .includes(
                taskClaimId,
              )
          ) {
            return current;
          }

          return {
            ...current,

            coins:
              reward.type ===
              "coins"
                ? current.coins +
                  reward.amount
                : current.coins,

            tickets:
              reward.type ===
              "tickets"
                ? current.tickets +
                  reward.amount
                : current.tickets,

            claimedTaskIds: [
              ...current.claimedTaskIds,
              taskClaimId,
            ],
          };
        },
      );

      return true;
    };

  const completeOnboarding = () => {
    if (!userId) return;

    updateState(
      (current) => ({
        ...current,
        hasSeenOnboarding: true,
      }),
    );
  };

  const recordFocusSession =
    (input: {
      plannedMinutes: number;
      actualSeconds: number;
      completed: boolean;
      startedAt: string;
      endedAt: string;
    }) => {
      if (!userId) return 0;

      const dateKey =
        getLocalDateKey(
          new Date(
            input.endedAt,
          ),
        );

      const current =
        stateRef.current;

      const earnedBefore =
        current.focusHistory
          .filter(
            (session) =>
              session.dateKey ===
              dateKey,
          )
          .reduce(
            (
              sum,
              session,
            ) =>
              sum +
              session.coinsEarned,
            0,
          );

      const eligible =
        input.completed &&
        input.actualSeconds >=
          10 * 60;

      const remainingCap =
        Math.max(
          0,
          FOCUS_COIN_CAP -
            earnedBefore,
        );

      const coinsEarned =
        eligible
          ? Math.min(
              5,
              remainingCap,
            )
          : 0;

      const session: FocusSession =
        {
          id: `${input.endedAt}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,

          dateKey,

          startedAt:
            input.startedAt,

          endedAt:
            input.endedAt,

          plannedMinutes:
            input.plannedMinutes,

          actualSeconds:
            Math.max(
              0,
              input.actualSeconds,
            ),

          completed:
            input.completed,

          coinsEarned,

          companionId:
            current.companionId,
        };

      updateState(
        (latest) => {
          const today =
            latest
              .activityByDate[
                dateKey
              ] ?? {
              questionsAnswered: 0,
              mistakesReviewed: 0,
              focusSeconds: 0,
            };

          const nextActivity = {
            ...latest.activityByDate,

            [dateKey]: {
              ...today,

              focusSeconds:
                today.focusSeconds +
                Math.max(
                  0,
                  input.actualSeconds,
                ),
            },
          };

          return {
            ...latest,

            coins:
              latest.coins +
              coinsEarned,

            focusHistory: [
              session,
              ...latest.focusHistory,
            ].slice(
              0,
              100,
            ),

            activityByDate:
              nextActivity,

            streak:
              calculateStudyStreak(
                nextActivity,
              ),
          };
        },
      );

      setTodayKey(
        getLocalDateKey(),
      );

      return coinsEarned;
    };

  const value =
    useMemo<GameStateContextValue>(
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

        completeOnboarding,

        todayFocusSeconds,
        todayFocusMinutes,
        todayFocusCoins,
        focusCoinCap:
          FOCUS_COIN_CAP,

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
    <GameStateContext.Provider
      value={value}
    >
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context =
    useContext(
      GameStateContext,
    );

  if (!context) {
    throw new Error(
      "useGameState 必須在 GameStateProvider 裡使用",
    );
  }

  return context;
}

export function getPlayerDisplayName(
  slimeId: string,
  playerState?: PlayerSlimeState,
) {
  return (
    playerState?.nickname ||
    SLIME_BY_ID[slimeId]
      ?.defaultName ||
    "史萊姆"
  );
}
