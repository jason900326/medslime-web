"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/top-bar";
import InfoDialogButton from "@/components/info-dialog-button";
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

  const companion = SLIME_BY_ID[game.companionId] ?? SLIME_BY_ID["n-green"];
  const playerSlime = game.slimes[companion.id];
  const companionImage =
    playerSlime?.accessoryUnlocked && playerSlime?.accessoryEquipped
      ? companion.accessoryImage
      : companion.image;

  const totalSeconds = plannedMinutes * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);
  const progress = totalSeconds > 0
    ? Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100))
    : 0;
  const plannedReward =
    plannedMinutes >= 10
      ? Math.max(
          0,
          Math.min(
            Math.floor(plannedMinutes / 5) * 5,
            game.focusCoinCap - game.todayFocusCoins,
          ),
        )
      : 0;

  const displayTime = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
    if (secondsLeft <= 0) setSecondsLeft(plannedMinutes * 60);
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

  const recentHistory = game.focusHistory.slice(0, 5);
  const statusText =
    mode === "running"
      ? "專注中"
      : mode === "paused"
        ? "已暫停"
        : mode === "finished"
          ? "完成"
          : "準備開始";

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">FOCUS</div>
            <h1 className="ms-page-title mt-2">專心讀書</h1>
            <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
              選一段時間，讓陪伴史萊姆跟你一起走完這輪。
            </p>
          </div>
          <InfoDialogButton title="專注獎勵說明">
            <p>完成至少 10 分鐘即可獲得獎勵。</p>
            <p>每完整 5 分鐘可獲得 🪙5，每日最多可從讀書計時器取得 🪙{game.focusCoinCap}。</p>
            <p>提前結束的專注不會獲得本輪金幣。</p>
          </InfoDialogButton>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <SummaryCard label="今日專注" value={`${game.todayFocusMinutes} 分鐘`} />
          <SummaryCard label="今日專注獎勵" value={`${game.todayFocusCoins} / ${game.focusCoinCap} 金幣`} />
        </section>

        <section className="mt-5 overflow-hidden rounded-[30px] border border-[#d8e9df] bg-white shadow-[0_14px_34px_rgba(40,106,69,0.055)]">
          <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">{statusText}</div>
                <div className="mt-1 text-xs font-bold text-[#8a9c92]">本輪 {plannedMinutes} 分鐘</div>
              </div>
              <div className="text-xs font-black text-[#789083]">
                {Math.round(progress)}%
              </div>
            </div>

            <div className="mt-5 text-center text-6xl font-black tracking-[-0.065em] sm:text-7xl md:text-8xl">
              {displayTime}
            </div>

            {mode === "idle" && (
              <div className="mt-6">
                <div className="flex flex-wrap justify-center gap-2">
                  {presets.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => applyMinutes(minutes)}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-black transition",
                        plannedMinutes === minutes
                          ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                          : "border-[#dbe9e1] bg-white text-[#557768]",
                      ].join(" ")}
                    >
                      {minutes} 分
                    </button>
                  ))}
                </div>

                <div className="mx-auto mt-3 flex max-w-xs gap-2">
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={customMinutes}
                    onChange={(event) => setCustomMinutes(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyCustom();
                      }
                    }}
                    placeholder="自訂分鐘"
                    className="min-w-0 flex-1 rounded-xl border border-[#d7e7de] bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#65d795]"
                  />
                  <button
                    type="button"
                    onClick={applyCustom}
                    className="rounded-xl border border-[#d7e7de] bg-[#f7faf8] px-4 text-sm font-black text-[#315b45]"
                  >
                    套用
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative h-[210px] overflow-hidden border-y border-[#d8e9df] bg-[#dcefdc] sm:h-[250px]">
            <img
              src="/backgrounds/slime-forest.png"
              alt="史萊姆森林"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />

            <div
              className="absolute bottom-[18%] z-10 -translate-x-1/2 transition-[left] duration-500 ease-out"
              style={{ left: `clamp(9%, ${9 + progress * 0.82}%, 91%)` }}
            >
              <img
                src={companionImage}
                alt={getPlayerDisplayName(companion.id, playerSlime)}
                className="h-24 w-24 max-w-none object-contain drop-shadow-[0_5px_6px_rgba(0,0,0,0.2)] sm:h-28 sm:w-28"
              />
            </div>

            <div className="absolute inset-x-5 bottom-4 z-20 h-2 overflow-hidden rounded-full bg-white/65 shadow-sm sm:inset-x-7">
              <div
                className="h-full rounded-full bg-[#55b97b] transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="px-5 py-5 sm:px-7">
            <div className="text-center text-sm font-bold text-[#789083]">
              {game.todayFocusCoins >= game.focusCoinCap
                ? "今日專注金幣已達上限"
                : plannedMinutes < 10
                  ? "至少設定 10 分鐘才有金幣獎勵"
                  : `完成本輪可獲得 🪙 ${plannedReward}`}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {mode === "idle" && (
                <button
                  type="button"
                  onClick={startTimer}
                  className="w-full rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white sm:w-auto sm:min-w-[240px]"
                >
                  開始專注
                </button>
              )}

              {mode === "running" && (
                <>
                  <button
                    type="button"
                    onClick={() => setMode("paused")}
                    className="min-w-[150px] rounded-2xl bg-[#17372a] px-5 py-3 font-black text-white"
                  >
                    暫停
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStopConfirm(true)}
                    className="min-w-[150px] rounded-2xl border border-[#ead8d8] bg-white px-5 py-3 font-black text-[#9b5050]"
                  >
                    提前結束
                  </button>
                </>
              )}

              {mode === "paused" && (
                <>
                  <button
                    type="button"
                    onClick={() => setMode("running")}
                    className="min-w-[150px] rounded-2xl bg-[#31c978] px-5 py-3 font-black text-white"
                  >
                    繼續
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStopConfirm(true)}
                    className="min-w-[150px] rounded-2xl border border-[#ead8d8] bg-white px-5 py-3 font-black text-[#9b5050]"
                  >
                    提前結束
                  </button>
                </>
              )}

              {mode === "finished" && (
                <button
                  type="button"
                  onClick={resetTimer}
                  className="w-full rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white sm:w-auto sm:min-w-[240px]"
                >
                  再來一輪
                </button>
              )}
            </div>

            {mode === "finished" && (
              <div className="mt-4 rounded-2xl bg-[#eefaf2] px-4 py-3 text-center text-sm font-bold text-[#557768]">
                {earnedCoins > 0
                  ? `完成！這輪獲得 🪙 ${earnedCoins}`
                  : game.todayFocusCoins >= game.focusCoinCap
                    ? "完成！今天的專注金幣已經領滿。"
                    : "完成！本輪未達 10 分鐘，因此沒有金幣獎勵。"}
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#d8e9df] bg-white p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">HISTORY</div>
              <h2 className="mt-1 text-lg font-black">最近專注</h2>
            </div>
            <div className="text-xs font-bold text-[#8a9c92]">最近 {recentHistory.length} 筆</div>
          </div>

          <div className="mt-4 divide-y divide-[#edf2ef]">
            {recentHistory.length === 0 ? (
              <div className="py-5 text-sm font-bold text-[#789083]">還沒有專注紀錄，完成第一輪後會出現在這裡。</div>
            ) : (
              recentHistory.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="text-sm font-black">{Math.floor(session.actualSeconds / 60)} 分鐘</div>
                    <div className="mt-0.5 text-xs font-bold text-[#8a9c92]">+{session.coinsEarned} 金幣</div>
                  </div>
                  <div className={session.completed ? "text-xs font-black text-[#2a9d5e]" : "text-xs font-black text-[#9b5050]"}>
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
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">FOCUS</div>
            <div className="mt-2 text-2xl font-black">確定要提前結束嗎？</div>
            <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
              提前結束會把這次專注記錄為未完成，本輪也不會獲得金幣。
            </p>
            <div className="mt-4 rounded-2xl bg-[#f8fcf9] px-4 py-3 text-sm font-black text-[#557768]">
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#dfece4] bg-white px-4 py-4">
      <div className="text-xs font-bold text-[#8a9c92]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#17372a]">{value}</div>
    </div>
  );
}
