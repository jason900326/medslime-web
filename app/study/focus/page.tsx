"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/top-bar";
import {
  getPlayerDisplayName,
  useGameState,
} from "@/components/game-state-provider";
import { SLIME_BY_ID } from "@/lib/slime-data";

type TimerMode = "idle" | "running" | "paused" | "finished";

const presets = [30, 60] as const;

export default function FocusPage() {
  const game = useGameState();

  const [plannedMinutes, setPlannedMinutes] = useState(30);
  const [customMinutes, setCustomMinutes] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [mode, setMode] = useState<TimerMode>("idle");
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const companion =
    SLIME_BY_ID[game.companionId] ?? SLIME_BY_ID["n-green"];
  const playerSlime = game.slimes[companion.id];

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
  }, [mode, secondsLeft, plannedMinutes, startedAt]);

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
const stopEarly = () => {
  const confirmed = window.confirm(
    "確定要提前結束這次專注嗎？\n\n提前結束可能會影響本輪可獲得的金幣。",
  );

  if (!confirmed) {
    return;
  }

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
      ? Math.min(
          100,
          Math.max(0, (elapsedSeconds / totalSeconds) * 100),
        )
      : 0;

  const slimeProgressPosition = progress;

  const recentHistory = game.focusHistory.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            FOCUS
          </div>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            專心讀書
          </h1>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="今日專注"
            value={`${game.todayFocusMinutes} 分鐘`}
          />
          <SummaryCard
            label="今日計時獎勵"
            value={`${game.todayFocusCoins} / ${game.focusCoinCap} 金幣`}
          />
          <SummaryCard
            label="最近紀錄"
            value={`${game.focusHistory.length} 次`}
          />
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-[#d8e9df] bg-white p-6 shadow-[0_16px_38px_rgba(40,106,69,0.06)] md:p-8">
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
                      : "hover:bg-[#f5faf7]",
                  ].join(" ")}
                >
                  {minutes} 分鐘
                </button>
              ))}

              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={customMinutes}
                  disabled={mode === "running" || mode === "paused"}
                  onChange={(event) => setCustomMinutes(event.target.value)}
                  placeholder="自訂"
                  className="w-24 rounded-xl border border-[#d7e7de] bg-white px-3 py-2 text-sm font-bold text-[#17372a] outline-none focus:border-[#65d795]"
                />

                <button
                  disabled={mode === "running" || mode === "paused"}
                  onClick={applyCustom}
                  className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-black text-[#315b45] transition hover:bg-[#f5faf7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  套用
                </button>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="text-sm font-black tracking-[0.1em] text-[#789083]">
                {mode === "running"
                  ? "專注中"
                  : mode === "paused"
                    ? "已暫停"
                    : mode === "finished"
                      ? "完成"
                      : "準備開始"}
              </div>

              <div className="mt-3 text-7xl font-black tracking-[-0.06em] md:text-8xl">
                {displayTime}
              </div>

              <div className="relative mx-auto mt-12 max-w-xl pt-[72px]">
                <div
                  className="absolute bottom-[10px] transition-[left,transform] duration-500 ease-out"
                  style={{
                    left: `${slimeProgressPosition}%`,
                    transform: `translateX(${
                      slimeProgressPosition === 0
                        ? "-100%"
                        : slimeProgressPosition === 100
                          ? "0%"
                          : `-${100 - slimeProgressPosition}%`
                    })`,
                  }}
                >
                  <img
                    src={companion.image}
                    alt={getPlayerDisplayName(companion.id, playerSlime)}
                    className="h-16 w-16 max-w-none object-contain drop-shadow-sm md:h-[72px] md:w-[72px]"
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

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {mode === "idle" && (
                <button
                  onClick={startTimer}
                  className="min-w-[180px] rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white transition hover:bg-[#2dbc70]"
                >
                  ▶ 開始專注
                </button>
              )}

              {mode === "running" && (
                <>
                  <button
                    onClick={() => setMode("paused")}
                    className="min-w-[150px] rounded-2xl border border-[#d7e7de] bg-white px-6 py-4 font-black text-[#315b45]"
                  >
                    暫停
                  </button>

                  <button
                    onClick={stopEarly}
                    className="min-w-[150px] rounded-2xl border border-[#ead8d8] bg-white px-6 py-4 font-black text-[#9b5050]"
                  >
                    提前結束
                  </button>
                </>
              )}

              {mode === "paused" && (
                <>
                  <button
                    onClick={() => setMode("running")}
                    className="min-w-[150px] rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white"
                  >
                    繼續
                  </button>

                  <button
                    onClick={stopEarly}
                    className="min-w-[150px] rounded-2xl border border-[#ead8d8] bg-white px-6 py-4 font-black text-[#9b5050]"
                  >
                    提前結束
                  </button>
                </>
              )}

              {mode === "finished" && (
                <button
                  onClick={resetTimer}
                  className="min-w-[180px] rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white"
                >
                  再來一輪
                </button>
              )}
            </div>

            {mode === "finished" && (
              <div className="mt-6 rounded-[22px] border border-[#cfe9da] bg-[#eaf9f0] p-5 text-center">
                <div className="text-xl font-black text-[#28754b]">
                  🎉 本輪專注完成
                </div>
                <div className="mt-2 text-sm font-bold text-[#557768]">
                  {earnedCoins > 0
                    ? `獲得 🪙 ${earnedCoins}`
                    : game.todayFocusCoins >= game.focusCoinCap
                      ? "今日計時金幣已達 30 上限。"
                      : "本輪未達 10 分鐘，因此沒有金幣獎勵。"}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-[30px] border border-[#d8e9df] bg-gradient-to-br from-[#eefaf2] via-white to-[#eef8fb] p-6 text-center">
              <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
                COMPANION
              </div>

              <img
                src={companion.image}
                alt={getPlayerDisplayName(companion.id, playerSlime)}
                className="mx-auto mt-4 h-auto w-full max-w-[250px] object-contain"
              />

              <div className="mt-3 text-2xl font-black">
                {getPlayerDisplayName(companion.id, playerSlime)}
              </div>
              <div className="mt-1 text-sm font-bold text-[#789083]">
                正在陪你讀書
              </div>
            </div>

            <div className="rounded-[26px] border border-[#d8e9df] bg-white p-5">
              <div className="text-lg font-black">最近專注紀錄</div>

              <div className="mt-4 space-y-3">
                {recentHistory.length === 0 ? (
                  <div className="rounded-xl bg-[#f5faf7] p-4 text-sm font-bold text-[#789083]">
                    還沒有專注紀錄。
                  </div>
                ) : (
                  recentHistory.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-[#e3ece6] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-black">
                          {Math.floor(session.actualSeconds / 60)} 分鐘
                        </div>
                        <div
                          className={[
                            "text-xs font-black",
                            session.completed
                              ? "text-[#2a9d5e]"
                              : "text-[#9b5050]",
                          ].join(" ")}
                        >
                          {session.completed ? "完成" : "提前結束"}
                        </div>
                      </div>

                      <div className="mt-1 text-xs font-bold text-[#789083]">
                        +{session.coinsEarned} 金幣
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
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
