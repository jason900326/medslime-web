"use client";

import { useState } from "react";
import TopBar from "@/components/top-bar";
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
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="ms-page-title">專心讀書</h1>
            <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
              選一段時間，和陪伴史萊姆一起完成這輪專注。
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-[#8a9c92]">
              開始後可以去刷題或使用其他功能，計時器會繼續倒數。
            </p>
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

        <section className="mt-5 grid grid-cols-2 gap-3">
          <SummaryCard label="今日專注" value={`${game.todayFocusMinutes} 分鐘`} />
          <SummaryCard
            label="今日獎勵"
            value={`${game.todayFocusCoins} / ${game.focusCoinCap} 金幣`}
          />
        </section>

        <section className="mt-5 rounded-[30px] border border-[#d8e9df] bg-white p-5 shadow-[0_14px_34px_rgba(40,106,69,0.055)] sm:p-7">
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

          <div className="mt-5 text-center text-6xl font-black tracking-[-0.065em] tabular-nums sm:text-7xl md:text-8xl">
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
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-black transition",
                      timer.plannedMinutes === minutes
                        ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                        : "border-[#dbe9e1] bg-white text-[#557768]",
                    ].join(" ")}
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

          <div className="mt-6 rounded-[22px] border border-[#deebe3] bg-[#f6fbf8] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-end justify-center overflow-hidden sm:h-24 sm:w-24">
                <img
                  src={companionImage}
                  alt={companionName}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-black tracking-[0.08em] text-[#2ba962]">
                  陪伴史萊姆
                </div>
                <div className="mt-1 truncate text-base font-black text-[#315b45]">
                  {companionName}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dce9e1]">
                  <div
                    className="h-full rounded-full bg-[#55b97b] transition-[width] duration-500"
                    style={{ width: `${timer.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center text-sm font-bold text-[#789083]">
            {game.todayFocusCoins >= game.focusCoinCap
              ? "今日專注金幣已達上限"
              : timer.plannedMinutes < 10
                ? "至少設定 10 分鐘才有金幣獎勵"
                : `完成本輪可獲得 🪙 ${plannedReward}`}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {timer.mode === "idle" && (
              <button
                type="button"
                onClick={timer.start}
                disabled={!timer.isReady}
                className="w-full rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white disabled:opacity-50 sm:w-auto sm:min-w-[240px]"
              >
                開始專注
              </button>
            )}

            {timer.mode === "running" && (
              <>
                <button
                  type="button"
                  onClick={timer.pause}
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

            {timer.mode === "paused" && (
              <>
                <button
                  type="button"
                  onClick={timer.resume}
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

            {timer.mode === "finished" && (
              <button
                type="button"
                onClick={timer.reset}
                className="w-full rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white sm:w-auto sm:min-w-[240px]"
              >
                再來一輪
              </button>
            )}
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

        <section className="mt-5 rounded-[24px] border border-[#d8e9df] bg-white p-5 sm:p-6">
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
      </div>

      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-xl">
            <div className="text-lg font-black">要提前結束嗎？</div>
            <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
              這輪不會獲得金幣，但專注時間仍會被記錄。
            </p>
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
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-4 py-3">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 truncate text-lg font-black">{value}</div>
    </div>
  );
}
