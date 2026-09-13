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
import { useGameState } from "@/components/game-state-provider";

export type FocusTimerMode = "idle" | "running" | "paused" | "finished";

type StoredFocusTimer = {
  plannedMinutes: number;
  mode: FocusTimerMode;
  startedAt: string | null;
  endsAt: number | null;
  pausedSecondsLeft: number;
  earnedCoins: number;
  sessionId: string | null;
};

type FocusTimerContextValue = StoredFocusTimer & {
  isReady: boolean;
  secondsLeft: number;
  elapsedSeconds: number;
  progress: number;
  displayTime: string;
  applyMinutes: (minutes: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stopEarly: () => void;
  reset: () => void;
};

const STORAGE_KEY = "medslime_focus_timer_v2";
const DEFAULT_MINUTES = 30;

function initialTimerState(): StoredFocusTimer {
  return {
    plannedMinutes: DEFAULT_MINUTES,
    mode: "idle",
    startedAt: null,
    endsAt: null,
    pausedSecondsLeft: DEFAULT_MINUTES * 60,
    earnedCoins: 0,
    sessionId: null,
  };
}

function normalizeStoredTimer(value: unknown): StoredFocusTimer {
  if (!value || typeof value !== "object") return initialTimerState();

  const raw = value as Partial<StoredFocusTimer>;
  const plannedMinutes = Number.isFinite(raw.plannedMinutes)
    ? Math.min(240, Math.max(1, Math.floor(Number(raw.plannedMinutes))))
    : DEFAULT_MINUTES;
  const allowedModes: FocusTimerMode[] = ["idle", "running", "paused", "finished"];
  const mode = allowedModes.includes(raw.mode as FocusTimerMode)
    ? (raw.mode as FocusTimerMode)
    : "idle";
  const pausedSecondsLeft = Number.isFinite(raw.pausedSecondsLeft)
    ? Math.min(
        plannedMinutes * 60,
        Math.max(0, Math.floor(Number(raw.pausedSecondsLeft))),
      )
    : plannedMinutes * 60;

  return {
    plannedMinutes,
    mode,
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : null,
    endsAt:
      typeof raw.endsAt === "number" && Number.isFinite(raw.endsAt)
        ? raw.endsAt
        : null,
    pausedSecondsLeft,
    earnedCoins:
      typeof raw.earnedCoins === "number" && Number.isFinite(raw.earnedCoins)
        ? Math.max(0, Math.floor(raw.earnedCoins))
        : 0,
    sessionId: typeof raw.sessionId === "string" ? raw.sessionId : null,
  };
}

function getSecondsLeft(timer: StoredFocusTimer, now: number) {
  if (timer.mode === "running") {
    if (!timer.endsAt) return timer.pausedSecondsLeft;
    return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
  }

  if (timer.mode === "finished") return 0;
  return timer.pausedSecondsLeft;
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const game = useGameState();
  const [timer, setTimer] = useState<StoredFocusTimer>(initialTimerState);
  const [now, setNow] = useState(() => Date.now());
  const [isReady, setIsReady] = useState(false);
  const finishingSessionRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTimer(normalizeStoredTimer(JSON.parse(stored)));
      }
    } catch (error) {
      console.warn("讀取專注計時器狀態失敗：", error);
    } finally {
      setNow(Date.now());
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    } catch (error) {
      console.warn("儲存專注計時器狀態失敗：", error);
    }
  }, [timer, isReady]);

  useEffect(() => {
    if (!isReady || timer.mode !== "running") return;

    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 500);
    const handleVisibilityChange = () => tick();
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isReady, timer.mode, timer.endsAt]);

  const secondsLeft = useMemo(
    () => getSecondsLeft(timer, now),
    [timer, now],
  );
  const totalSeconds = timer.plannedMinutes * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);
  const progress =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100))
      : 0;
  const displayTime = useMemo(() => formatTime(secondsLeft), [secondsLeft]);

  useEffect(() => {
    if (
      !isReady ||
      !game.isReady ||
      timer.mode !== "running" ||
      secondsLeft > 0 ||
      !timer.sessionId
    ) {
      return;
    }

    if (finishingSessionRef.current === timer.sessionId) return;
    finishingSessionRef.current = timer.sessionId;

    const sessionId = timer.sessionId;
    const scheduledEnd = timer.endsAt ?? Date.now();
    const endedAt = new Date(scheduledEnd).toISOString();
    const reward = game.recordFocusSession({
      plannedMinutes: timer.plannedMinutes,
      actualSeconds: timer.plannedMinutes * 60,
      completed: true,
      startedAt: timer.startedAt ?? endedAt,
      endedAt,
    });

    setTimer((current) => {
      if (current.sessionId !== sessionId) return current;
      return {
        ...current,
        mode: "finished",
        endsAt: null,
        pausedSecondsLeft: 0,
        earnedCoins: reward,
      };
    });
    finishingSessionRef.current = null;
  }, [game, isReady, secondsLeft, timer]);

  const applyMinutes = (minutes: number) => {
    if (timer.mode === "running" || timer.mode === "paused") return;
    const safeMinutes = Math.min(240, Math.max(1, Math.floor(minutes)));
    setTimer({
      plannedMinutes: safeMinutes,
      mode: "idle",
      startedAt: null,
      endsAt: null,
      pausedSecondsLeft: safeMinutes * 60,
      earnedCoins: 0,
      sessionId: null,
    });
    setNow(Date.now());
  };

  const start = () => {
    const startedAt = new Date().toISOString();
    const durationSeconds = timer.plannedMinutes * 60;
    setTimer({
      plannedMinutes: timer.plannedMinutes,
      mode: "running",
      startedAt,
      endsAt: Date.now() + durationSeconds * 1000,
      pausedSecondsLeft: durationSeconds,
      earnedCoins: 0,
      sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });
    setNow(Date.now());
  };

  const pause = () => {
    if (timer.mode !== "running") return;
    const remaining = getSecondsLeft(timer, Date.now());
    if (remaining <= 0) {
      setNow(Date.now());
      return;
    }
    setTimer((current) => ({
      ...current,
      mode: "paused",
      endsAt: null,
      pausedSecondsLeft: remaining,
    }));
    setNow(Date.now());
  };

  const resume = () => {
    if (timer.mode !== "paused" || timer.pausedSecondsLeft <= 0) return;
    setTimer((current) => ({
      ...current,
      mode: "running",
      endsAt: Date.now() + current.pausedSecondsLeft * 1000,
    }));
    setNow(Date.now());
  };

  const stopEarly = () => {
    if (timer.mode !== "running" && timer.mode !== "paused") return;
    const remaining = getSecondsLeft(timer, Date.now());
    const actualSeconds = Math.max(0, timer.plannedMinutes * 60 - remaining);
    const endedAt = new Date().toISOString();

    game.recordFocusSession({
      plannedMinutes: timer.plannedMinutes,
      actualSeconds,
      completed: false,
      startedAt: timer.startedAt ?? endedAt,
      endedAt,
    });

    setTimer({
      plannedMinutes: timer.plannedMinutes,
      mode: "idle",
      startedAt: null,
      endsAt: null,
      pausedSecondsLeft: timer.plannedMinutes * 60,
      earnedCoins: 0,
      sessionId: null,
    });
    setNow(Date.now());
  };

  const reset = () => {
    setTimer({
      plannedMinutes: timer.plannedMinutes,
      mode: "idle",
      startedAt: null,
      endsAt: null,
      pausedSecondsLeft: timer.plannedMinutes * 60,
      earnedCoins: 0,
      sessionId: null,
    });
    setNow(Date.now());
  };

  const value = useMemo<FocusTimerContextValue>(
    () => ({
      ...timer,
      isReady,
      secondsLeft,
      elapsedSeconds,
      progress,
      displayTime,
      applyMinutes,
      start,
      pause,
      resume,
      stopEarly,
      reset,
    }),
    // Functions intentionally close over the current timer snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timer, isReady, secondsLeft, elapsedSeconds, progress, displayTime],
  );

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimer() {
  const value = useContext(FocusTimerContext);
  if (!value) {
    throw new Error("useFocusTimer 必須在 FocusTimerProvider 內使用。");
  }
  return value;
}
