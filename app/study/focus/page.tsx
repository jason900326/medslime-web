"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/top-bar";
import {
  getPlayerDisplayName,
  useGameState,
} from "@/components/game-state-provider";
import { SLIME_BY_ID } from "@/lib/slime-data";

type TimerMode = "idle" | "running" | "paused" | "finished";

const presets = [25, 30, 45, 60, 90] as const;

export default function FocusPage() {
  const game = useGameState();

  const [plannedMinutes, setPlannedMinutes] = useState(30);
  const [customMinutes, setCustomMinutes] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [mode, setMode] = useState<TimerMode>("idle");
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const companion =
    SLIME_BY_ID[game.companionId] ?? SLIME_BY_ID["n-green"];
  const playerSlime = game.slimes[companion.id];
  const companionImage =
    playerSlime?.accessoryUnlocked &&
    playerSlime?.accessoryEquipped
      ? companion.accessoryImage
      : companion.image;

  const totalSeconds = plannedMinutes * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);

  const displayTime = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  }, [secondsLeft]);

  useEffect(() => {
    if (mode !== "running") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "running" || secondsLeft !== 0) return;

    const endedAt = new Date().toISOString();
    const reward = game.recordFocusSession({
      plannedMinutes,
      actualSeconds: plannedMinutes * 60,
      completed: true,
      startedAt: startedAt ?? endedAt,
      endedAt,
    });

    setEarnedCoins(reward);
    setMode("finished");
  }, [mode, secondsLeft, plannedMinutes, startedAt, game]);

  const applyMinutes = (minutes: number) => {
    if (mode === "running" || mode === "paused") return;

    setPlannedMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setEarnedCoins(0);
    setStartedAt(null);
    setMode("idle");
  };

  const applyCustom = () => {
    const parsed = Number(customMinutes);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    const safeMinutes = Math.min(240, Math.max(1, Math.floor(parsed)));
    applyMinutes(safeMinutes);
    setCustomMinutes(String(safeMinutes));
  };

  const startTimer = () => {
    if (secondsLeft <= 0) {
      setSecondsLeft(plannedMinutes * 60);
    }

    setEarnedCoins(0);
    setStartedAt(new Date().toISOString());
    setMode("running");
  };

  const confirmStopEarly = () => {
    setShowStopConfirm(false);

    const endedAt = new Date().toISOString();

    game.recordFocusSession({
      plannedMinutes,
      actualSeconds: elapsedSeconds,
      completed: false,
      startedAt: startedAt ?? endedAt,
      endedAt,
    });

    setMode("idle");
    setSecondsLeft(plannedMinutes * 60);
    setEarnedCoins(0);
    setStartedAt(null);
  };

  const resetTimer = () => {
    setMode("idle");
    setSecondsLeft(plannedMinutes * 60);
    setEarnedCoins(0);
    setStartedAt(null);
  };

  const progress =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100))
      : 0;

  const recentHistory = game.focusHistory.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            FOCUS
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">
            專心讀書
          </h1>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-2">
          <SummaryCard label="今日專注" value={`${game.todayFocusMinutes}`} suffix="分" />
          <SummaryCard label="今日獎勵" value={`${game.todayFocusCoins}`} suffix={`/ ${game.focusCoinCap}`} />
          <SummaryCard label="最近紀錄" value={`${game.focusHistory.length}`} suffix="次" />
        </section>

        <section className="mt-5 rounded-[26px] border border-[#d8e9df] bg-white p-5 shadow-[0_12px_30px_rgba(40,106,69,0.05)] md:p-7">
          <div className="flex flex-wrap gap-2">
            {presets.map((minutes) => (
              <button
                key={minutes}
                disabled={mode === "running" || mode === "paused"}
                onClick={() => applyMinutes(minutes)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-black transition",
                  plannedMinutes === minutes
                    ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                    : "border-[#dbe9e1] bg-white text-[#466a58]",
                  mode === "running" || mode === "paused"
                    ? "cursor-not-allowed opacity-50"
                    : "",
                ].join(" ")}
              >
                {minutes} 分鐘
              </button>
            ))}

            <input
              type="number"
              min={1}
              max={240}
              value={customMinutes}
              disabled={mode === "running" || mode === "paused"}
              onChange={(event) => setCustomMinutes(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCustom();
                }
              }}
              placeholder="自訂分鐘"
              className="min-w-[112px] flex-1 rounded-xl border border-[#d7e7de] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#65d795] sm:flex-none"
            />
          </div>

          <div className="mt-8 text-center">
            <div className="text-sm font-black tracking-[0.08em] text-[#789083]">
              {mode === "running"
                ? "專注中"
                : mode === "paused"
                  ? "已暫停"
                  : mode === "finished"
                    ? "完成"
                    : "準備開始"}
            </div>

            <div className="mt-2 text-6xl font-black tracking-[-0.06em] sm:text-7xl md:text-8xl">
              {displayTime}
            </div>

            <div className="mt-8">
              <div className="relative mx-10 pt-[74px] sm:mx-12">
                <div
                  className="absolute bottom-[8px] z-10 -translate-x-1/2 transition-[left] duration-500 ease-out"
                  style={{ left: `${progress}%` }}
                >
                  <img
                    src={companionImage}
                    alt={getPlayerDisplayName(companion.id, playerSlime)}
                    className="h-14 w-14 max-w-none object-contain drop-shadow-sm sm:h-16 sm:w-16"
                  />
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-[#e7efe9]">
                  <div
                    className="h-full rounded-full bg-[#55b97b] transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 text-sm font-bold text-[#789083]">
                本輪設定：{plannedMinutes} 分鐘
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {mode === "idle" && (
              <button
                onClick={startTimer}
                className="w-full rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white sm:w-auto sm:min-w-[220px]"
              >
                ▶ 開始專注
              </button>
            )}

            {mode === "running" && (
              <>
                <button
                  onClick={() => setMode("paused")}
                  className="min-w-[140px] rounded-2xl border border-[#d7e7de] bg-white px-5 py-3 font-black text-[#315b45]"
                >
                  暫停
                </button>
                <button
                  onClick={() => setShowStopConfirm(true)}
                  className="min-w-[140px] rounded-2xl border border-[#ead8d8] bg-white px-5 py-3 font-black text-[#9b5050]"
                >
                  提前結束
                </button>
              </>
            )}

            {mode === "paused" && (
              <>
                <button
                  onClick={() => setMode("running")}
                  className="min-w-[140px] rounded-2xl bg-[#31c978] px-5 py-3 font-black text-white"
                >
                  繼續
                </button>
                <button
                  onClick={() => setShowStopConfirm(true)}
                  className="min-w-[140px] rounded-2xl border border-[#ead8d8] bg-white px-5 py-3 font-black text-[#9b5050]"
                >
                  提前結束
                </button>
              </>
            )}

            {mode === "finished" && (
              <button
                onClick={resetTimer}
                className="w-full rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white sm:w-auto sm:min-w-[220px]"
              >
                再來一輪
              </button>
            )}
          </div>

          {mode === "finished" && (
            <div className="mt-5 rounded-[20px] border border-[#cfe9da] bg-[#eaf9f0] p-4 text-center">
              <div className="font-black text-[#28754b]">本輪專注完成 🎉</div>
              <div className="mt-1 text-sm font-bold text-[#557768]">
                {earnedCoins > 0
                  ? `獲得 🪙 ${earnedCoins}`
                  : game.todayFocusCoins >= game.focusCoinCap
                    ? "今天的計時金幣已經領滿了。"
                    : "本輪未達 10 分鐘，因此沒有金幣獎勵。"}
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-[24px] border border-[#d8e9df] bg-white p-5">
          <div className="text-lg font-black">最近專注紀錄</div>

          <div className="mt-3 space-y-2">
            {recentHistory.length === 0 ? (
              <div className="rounded-xl bg-[#f5faf7] p-4 text-sm font-bold text-[#789083]">
                還沒有專注紀錄。
              </div>
            ) : (
              recentHistory.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#e3ece6] px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-black">
                      {Math.floor(session.actualSeconds / 60)} 分鐘
                    </div>
                    <div className="mt-0.5 text-xs font-bold text-[#789083]">
                      +{session.coinsEarned} 金幣
                    </div>
                  </div>

                  <div
                    className={[
                      "text-xs font-black",
                      session.completed ? "text-[#2a9d5e]" : "text-[#9b5050]",
                    ].join(" ")}
                  >
                    {session.completed ? "完成" : "提前結束"}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {showStopConfirm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-md rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-2xl">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              FOCUS
            </div>
            <div className="mt-2 text-2xl font-black">
              確定要提前結束嗎？
            </div>
            <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
              提前結束會把這次專注記錄為未完成，本輪也不會獲得金幣。
            </p>
            <div className="mt-4 rounded-2xl border border-[#dfece4] bg-[#f8fcf9] px-4 py-3 text-sm font-black text-[#557768]">
              目前已專注 {Math.floor(elapsedSeconds / 60)} 分鐘
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowStopConfirm(false)}
                className="rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-black text-[#315b45]"
              >
                繼續專注
              </button>
              <button
                type="button"
                onClick={confirmStopEarly}
                className="rounded-xl border border-[#ead8d8] bg-[#fff7f7] px-4 py-3 font-black text-[#9b5050]"
              >
                提前結束
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-2 py-3 text-center">
      <div className="text-[11px] font-bold text-[#8a9c92]">{label}</div>
      <div className="mt-1 text-lg font-black">
        {value}
        <span className="ml-1 text-[10px] font-bold text-[#789083]">{suffix}</span>
      </div>
    </div>
  );
}
