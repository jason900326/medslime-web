"use client";

import { useState } from "react";
import StudyShell from "@/components/study-shell";
import InfoDialogButton from "@/components/info-dialog-button";
import {
  getPlayerDisplayName,
  useGameState,
} from "@/components/game-state-provider";
import { useFocusTimer } from "@/components/focus-timer-provider";
import { SLIME_BY_ID } from "@/lib/slime-data";

const presets = [25, 30, 45, 60] as const;

export default function FocusPage() {
  const game = useGameState();
  const timer = useFocusTimer();
  const [customMinutes, setCustomMinutes] = useState("");
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const companion = SLIME_BY_ID[game.companionId] ?? SLIME_BY_ID["n-green"];
  const playerSlime = game.slimes[companion.id];
  const companionImage = companion.image;
  const companionName = getPlayerDisplayName(companion.id, playerSlime);

  const plannedReward =
    timer.plannedMinutes >= 10
      ? Math.max(
          0,
          Math.min(
            Math.floor(timer.plannedMinutes / 10) * 5,
            game.focusCoinCap - game.todayFocusCoins,
          ),
        )
      : 0;

  const applyCustom = () => {
    const parsed = Number(customMinutes);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const safeMinutes = Math.min(240, Math.max(1, Math.floor(parsed)));
    timer.applyMinutes(safeMinutes);
    setCustomMinutes(String(safeMinutes));
  };

  const confirmStopEarly = () => {
    setShowStopConfirm(false);
    timer.stopEarly();
  };

  const recentHistory = game.focusHistory.slice(0, 5);
  const statusText =
    timer.mode === "running"
      ? "專注中"
      : timer.mode === "paused"
        ? "已暫停"
        : timer.mode === "finished"
          ? "完成"
          : "準備開始";

  return (
    <StudyShell>

        <section className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="ms-page-title">專心讀書</h1>


          </div>
          <InfoDialogButton title="專注獎勵說明">
            <p>完成至少 10 分鐘即可獲得獎勵。</p>
            <p>
              每完整 10 分鐘可獲得 🪙5，每日最多可從讀書計時器取得 🪙
              {game.focusCoinCap}。
            </p>
            <p>提前結束的專注不會獲得本輪金幣。</p>
          </InfoDialogButton>
        </section>

        <section className="focus-stage mx-auto mt-6 max-w-2xl study-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">
                {statusText}
              </div>
              <div className="mt-1 text-xs font-bold text-[#8a9c92]">
                本輪 {timer.plannedMinutes} 分鐘
              </div>
            </div>
            <div className="text-xs font-black text-[#789083]">
              {Math.round(timer.progress)}%
            </div>
          </div>

          <div className="mt-4 flex justify-center"><img src={companionImage} alt={companionName} className="h-28 w-28 object-contain" /></div>
          <div role="timer" aria-label="剩餘專注時間" className="mt-2 text-center text-6xl font-black tracking-[-0.065em] tabular-nums sm:text-7xl md:text-8xl">
            {timer.isReady ? timer.displayTime : "--:--"}
          </div>

          {timer.mode === "idle" && (
            <div className="mt-6">
              <div className="flex flex-wrap justify-center gap-2">
                {presets.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => timer.applyMinutes(minutes)}
                    aria-pressed={timer.plannedMinutes === minutes}
                    className="study-choice"
                  >
                    {minutes} 分
                  </button>
                ))}
              </div>

              <div className="mx-auto mt-3 flex max-w-sm gap-2">
                <input
                  type="number"
                  inputMode="numeric"
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
                  aria-label="自訂專注分鐘（1 至 240）"
                  placeholder="自訂分鐘"
                  className="min-w-0 flex-1 rounded-xl border border-[#d7e7de] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#65d795]"
                />
                <button
                  type="button"
                  onClick={applyCustom}
                  className="rounded-xl border border-[#d7e7de] bg-[#f7faf8] px-4 text-base font-black text-[#315b45]"
                >
                  套用
                </button>
              </div>
            </div>
          )}

          <div className="mx-auto mt-5 flex max-w-sm flex-wrap justify-center gap-3">
            {timer.mode === "idle" && (
              <button
                type="button"
                onClick={timer.start}
                disabled={!timer.isReady}
                className="ms-primary-action w-full disabled:opacity-50 sm:w-auto sm:min-w-[240px]"
              >
                開始專注
              </button>
            )}

            {timer.mode === "running" && (
              <>
                <button
                  type="button"
                  onClick={timer.pause}
                  className="min-w-0 flex-1 rounded-xl bg-[#17372a] px-5 py-3 font-black text-white"
                >
                  暫停
                </button>
                <button
                  type="button"
                  onClick={() => setShowStopConfirm(true)}
                  className="min-w-0 flex-1 rounded-xl border border-[#ead8d8] bg-white px-5 py-3 font-black text-[#9b5050]"
                >
                  提前結束
                </button>
              </>
            )}

            {timer.mode === "paused" && (
              <>
                <button
                  type="button"
                  onClick={timer.resume}
                  className="min-w-0 flex-1 rounded-xl bg-[#247451] px-5 py-3 font-black text-white"
                >
                  繼續
                </button>
                <button
                  type="button"
                  onClick={() => setShowStopConfirm(true)}
                  className="min-w-0 flex-1 rounded-xl border border-[#ead8d8] bg-white px-5 py-3 font-black text-[#9b5050]"
                >
                  提前結束
                </button>
              </>
            )}

            {timer.mode === "finished" && (
              <button
                type="button"
                onClick={timer.reset}
                className="w-full rounded-2xl bg-[#247451] px-6 py-4 font-black text-white sm:w-auto sm:min-w-[240px]"
              >
                再來一輪
              </button>
            )}
          </div>


          <div className="mt-5 text-center text-xs font-bold text-[#789083]">
            {game.todayFocusCoins >= game.focusCoinCap
              ? "今日專注金幣已達上限"
              : timer.plannedMinutes < 10
                ? "至少設定 10 分鐘才有金幣獎勵"
                : `完成本輪可獲得 🪙 ${plannedReward}`}
          </div>


          {timer.mode === "finished" && (
            <div className="mt-4 rounded-2xl bg-[#eefaf2] px-4 py-3 text-center text-sm font-bold text-[#557768]">
              {timer.earnedCoins > 0
                ? `完成！這輪獲得 🪙 ${timer.earnedCoins}`
                : game.todayFocusCoins >= game.focusCoinCap
                  ? "完成！今天的專注金幣已經領滿。"
                  : "完成！本輪未達 10 分鐘，因此沒有金幣獎勵。"}
            </div>
          )}
        </section>

        <section className="mt-5 flex flex-wrap gap-x-12 gap-y-4 border-b border-[#dfe7e0] py-4">
          <SummaryCard label="今日專注" value={`${game.todayFocusMinutes} 分鐘`} />
          <SummaryCard
            label="今日獎勵"
            value={`${game.todayFocusCoins} / ${game.focusCoinCap} 金幣`}
          />
        </section>

        <section className="mt-8 border-t border-[#dfe7e0] py-6">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-black">最近專注</h2>
            <div className="text-xs font-bold text-[#8a9c92]">
              最近 {recentHistory.length} 筆
            </div>
          </div>

          <div className="mt-4 divide-y divide-[#edf2ef]">
            {recentHistory.length === 0 ? (
              <div className="py-5 text-sm font-bold text-[#789083]">
                還沒有專注紀錄，完成第一輪後會出現在這裡。
              </div>
            ) : (
              recentHistory.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <div className="text-sm font-black">
                      {Math.floor(session.actualSeconds / 60)} 分鐘
                    </div>
                    <div className="mt-0.5 text-xs font-bold text-[#8a9c92]">
                      +{session.coinsEarned} 金幣
                    </div>
                  </div>
                  <div
                    className={
                      session.completed
                        ? "text-xs font-black text-[#2a9d5e]"
                        : "text-xs font-black text-[#9b5050]"
                    }
                  >
                    {session.completed ? "完成" : "提前結束"}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-xl">
            <div className="text-lg font-black">要提前結束嗎？</div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 rounded-xl border border-[#d7e7de] bg-white py-3 font-black text-[#315b45]"
              >
                繼續專注
              </button>
              <button
                type="button"
                onClick={confirmStopEarly}
                className="flex-1 rounded-xl bg-[#17372a] py-3 font-black text-white"
              >
                結束
              </button>
            </div>
          </div>
        </div>
      )}
    </StudyShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 truncate text-lg font-black">{value}</div>
    </div>
  );
}
