"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopBar from "@/components/top-bar";
import LoginRequired from "@/components/login-required";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useGameState } from "@/components/game-state-provider";
import { SLIME_BY_ID } from "@/lib/slime-data";
import GachaRevealOverlay from "./gacha-reveal-overlay";

type Result = ReturnType<ReturnType<typeof useGameState>["pullOne"]>;

const OWNER_EMAIL = "s0916540326@gmail.com";

export default function GachaPage() {
  const auth = useAuthUser();
  const game = useGameState();
  const [results, setResults] = useState<Result[]>([]);
  const [pulling, setPulling] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [pullCount, setPullCount] = useState<1 | 10>(1);
  const [ownerResetChecking, setOwnerResetChecking] = useState(false);
  const [ownerResetError, setOwnerResetError] = useState("");

  useEffect(() => {
    if (auth.loading || !auth.isLoggedIn) return;
    if (auth.email?.toLowerCase() !== OWNER_EMAIL) return;

    let cancelled = false;
    setOwnerResetChecking(true);
    setOwnerResetError("");

    const resetOwnerAccount = async () => {
      try {
        const response = await fetch("/api/owner-test-reset", {
          method: "POST",
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "測試帳號重置失敗。");
        }

        if (cancelled) return;

        if (payload?.applied) {
          if (auth.userId) {
            window.localStorage.removeItem(
              `medslime_mistakes_v1:${auth.userId}`,
            );
          }
          window.location.reload();
          return;
        }
      } catch (error) {
        if (!cancelled) {
          setOwnerResetError(
            error instanceof Error ? error.message : "測試帳號重置失敗。",
          );
        }
      } finally {
        if (!cancelled) setOwnerResetChecking(false);
      }
    };

    void resetOwnerAccount();

    return () => {
      cancelled = true;
    };
  }, [auth.loading, auth.isLoggedIn, auth.email, auth.userId]);

  if (auth.loading || ownerResetChecking) {
    return <main className="min-h-screen bg-[#f8fcf9]" />;
  }

  if (!auth.isLoggedIn) {
    return (
      <LoginRequired
        title="登入後才能抽卡"
        description="登入後就能使用金幣、抽卡券和每日免費抽卡。"
        backHref="/"
        backLabel="返回首頁"
      />
    );
  }

  const performPull = async (
    count: 1 | 10,
    payment: "free" | "coins" | "tickets",
  ) => {
    if (pulling) return;

    if (payment === "free" && !game.useFreePull()) return;

    if (payment === "coins") {
      const price = count === 1 ? 100 : 1000;
      if (!game.spendCoins(price)) return;
    }

    if (payment === "tickets" && !game.spendTickets(count)) return;

    setPullCount(count);
    setResults([]);
    setPulling(true);
    setOverlayOpen(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 350));

      const pulled: Result[] = [];
      let hasSRPlus = false;

      for (let i = 0; i < count; i += 1) {
        const guaranteeSR = count === 10 && i === count - 1 && !hasSRPlus;
        const result = game.pullOne(guaranteeSR ? { forceSR: true } : undefined);
        pulled.push(result);

        const rarity = SLIME_BY_ID[result.slimeId]?.rarity;
        if (rarity === "SR" || rarity === "SSR") {
          hasSRPlus = true;
        }
      }

      setResults(pulled);
    } finally {
      setPulling(false);
    }
  };

  const closeOverlay = () => {
    if (pulling) return;
    setOverlayOpen(false);
    setResults([]);
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar
          showBack
          backHref="/slimes"
          backLabel="返回史萊姆圖鑑"
        />

        {ownerResetError && (
          <div className="mt-5 rounded-2xl border border-[#f0dddd] bg-[#fff8f8] px-4 py-3 text-sm font-bold text-[#9b5050]">
            測試帳號重置沒有完成：{ownerResetError}
          </div>
        )}

        <section className="mt-6 rounded-[26px] border border-[#d8e9df] bg-gradient-to-br from-[#fff7e8] via-white to-[#eefaf2] p-5 shadow-[0_14px_34px_rgba(40,106,69,0.06)] md:p-7">
          <div className="text-xs font-black tracking-[0.1em] text-[#c58a2d]">
            GACHA
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <h1 className="whitespace-nowrap text-2xl font-black tracking-[-0.04em] sm:text-3xl md:text-4xl">
              抽一隻新的史萊姆。
            </h1>

            <Link
              href="/slimes"
              className="shrink-0 rounded-xl border border-[#d7e7de] bg-white px-3 py-2 text-xs font-black text-[#315b45] sm:px-4 sm:text-sm"
            >
              查看圖鑑
            </Link>
          </div>

          <div className="mt-3 text-xs font-bold text-[#8a9c92] sm:text-sm">
            抽卡機率：N 45% · R 37% · SR 17.7% · SSR 0.3%
          </div>
          <div className="mt-1 text-xs font-bold text-[#9aa99f]">
            SSR 最晚第 80 抽保底；十連抽保證至少 1 隻 SR 以上。
          </div>
          <div className="mt-1 text-xs font-bold text-[#9aa99f]">
            收集進度會優先補齊尚未取得或尚未解鎖飾品的史萊姆。
          </div>

          <div className="mt-5 rounded-[22px] border border-[#eadfca] bg-white/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-[#6c542b]">十連目標</div>
                <div className="mt-0.5 text-xs font-bold text-[#9a8662]">
                  存到十抽再開，至少會看到 1 隻 SR 以上。
                </div>
              </div>
              <div className="shrink-0 rounded-full bg-[#fff4dc] px-3 py-1.5 text-xs font-black text-[#b77a20]">
                SR+ 保證
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TenPullProgress
                icon="🪙"
                label="金幣十連"
                current={game.coins}
                target={1000}
                neededUnit="金幣"
              />
              <TenPullProgress
                icon="🎫"
                label="抽卡券十連"
                current={game.tickets}
                target={10}
                neededUnit="張"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <PullOption
              title="每日免費"
              subtitle={
                game.canUseFreePull
                  ? "今天還可以抽 1 次"
                  : "今天已經抽過了"
              }
              buttonLabel={game.canUseFreePull ? "免費抽 1 次" : "明天再來"}
              disabled={!game.canUseFreePull || pulling}
              onClick={() => performPull(1, "free")}
            />

            <PullOption
              title="金幣抽卡"
              subtitle="100 金幣 / 1 抽"
              buttonLabel="🪙 100 抽 1 次"
              disabled={game.coins < 100 || pulling}
              onClick={() => performPull(1, "coins")}
              secondaryLabel="🪙 1,000 抽 10 次 · SR+ 保證"
              secondaryDisabled={game.coins < 1000 || pulling}
              onSecondary={() => performPull(10, "coins")}
            />

            <PullOption
              title="抽卡券"
              subtitle="1 張券 / 1 抽"
              buttonLabel="🎫 1 張抽 1 次"
              disabled={game.tickets < 1 || pulling}
              onClick={() => performPull(1, "tickets")}
              secondaryLabel="🎫 10 張抽 10 次 · SR+ 保證"
              secondaryDisabled={game.tickets < 10 || pulling}
              onSecondary={() => performPull(10, "tickets")}
            />
          </div>
        </section>
      </div>

      <GachaRevealOverlay
        open={overlayOpen}
        loading={pulling}
        results={results}
        pullCount={pullCount}
        onClose={closeOverlay}
      />
    </main>
  );
}

function TenPullProgress({
  icon,
  label,
  current,
  target,
  neededUnit,
}: {
  icon: string;
  label: string;
  current: number;
  target: number;
  neededUnit: string;
}) {
  const progress = Math.min(100, (current / target) * 100);
  const remaining = Math.max(0, target - current);

  return (
    <div className="rounded-2xl border border-[#eee5d4] bg-[#fffdf8] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-[#315b45]">
          {icon} {label}
        </div>
        <div className="text-xs font-black text-[#8c7b5e]">
          {Math.min(current, target)} / {target}
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f0eadf]">
        <div
          className="h-full rounded-full bg-[#e6b653] transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-xs font-bold text-[#8f8068]">
        {remaining === 0
          ? "可以十連了！"
          : `再 ${remaining} ${neededUnit}即可十連`}
      </div>
    </div>
  );
}

function PullOption({
  title,
  subtitle,
  buttonLabel,
  disabled,
  onClick,
  secondaryLabel,
  secondaryDisabled,
  onSecondary,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  disabled: boolean;
  onClick: () => void;
  secondaryLabel?: string;
  secondaryDisabled?: boolean;
  onSecondary?: () => void;
}) {
  return (
    <article className="rounded-[22px] border border-[#e3e9e5] bg-white p-4">
      <div className="text-base font-black">{title}</div>
      <div className="mt-1 text-sm font-medium text-[#789083]">{subtitle}</div>

      <button
        disabled={disabled}
        onClick={onClick}
        className={[
          "mt-4 w-full rounded-xl px-4 py-3 text-sm font-black transition",
          disabled
            ? "cursor-not-allowed bg-[#edf2ef] text-[#9aac9f]"
            : "bg-[#31c978] text-white hover:bg-[#2dbc70]",
        ].join(" ")}
      >
        {buttonLabel}
      </button>

      {secondaryLabel && (
        <button
          disabled={secondaryDisabled}
          onClick={onSecondary}
          className={[
            "mt-2 w-full rounded-xl border px-4 py-3 text-sm font-black transition",
            secondaryDisabled
              ? "cursor-not-allowed border-[#e3e9e5] bg-[#f7faf8] text-[#a8b7ad]"
              : "border-[#d7e7de] bg-white text-[#315b45] hover:bg-[#f7fbf8]",
          ].join(" ")}
        >
          {secondaryLabel}
        </button>
      )}
    </article>
  );
}
