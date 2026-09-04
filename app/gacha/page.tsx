"use client";

import Link from "next/link";
import { useState } from "react";
import TopBar from "@/components/top-bar";
import LoginRequired from "@/components/login-required";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useGameState } from "@/components/game-state-provider";
import { SLIME_BY_ID } from "@/lib/slime-data";

type Result = ReturnType<typeof useGameState>["pullOne"] extends () => infer R
  ? R
  : never;

export default function GachaPage() {
  const auth = useAuthUser();
  const game = useGameState();
  const [results, setResults] = useState<Result[]>([]);
  const [pulling, setPulling] = useState(false);

  if (auth.loading) {
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

    setPulling(true);
    setResults([]);

    await new Promise((resolve) => setTimeout(resolve, 250));

    const pulled: Result[] = [];
    for (let i = 0; i < count; i += 1) {
      pulled.push(game.pullOne());
    }

    setResults(pulled);
    setPulling(false);
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar
          showBack
          backHref="/slimes"
          backLabel="返回史萊姆圖鑑"
        />

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
            抽卡機率：N 32% · R 38% · SR 27% · SSR 3%
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
              secondaryLabel="🪙 1,000 抽 10 次"
              secondaryDisabled={game.coins < 1000 || pulling}
              onSecondary={() => performPull(10, "coins")}
            />

            <PullOption
              title="抽卡券"
              subtitle="1 張券 / 1 抽"
              buttonLabel="🎫 1 張抽 1 次"
              disabled={game.tickets < 1 || pulling}
              onClick={() => performPull(1, "tickets")}
              secondaryLabel="🎫 10 張抽 10 次"
              secondaryDisabled={game.tickets < 10 || pulling}
              onSecondary={() => performPull(10, "tickets")}
            />
          </div>
        </section>

        <section className="mt-6 pb-8">
          <div className="text-xl font-black">抽卡結果</div>

          <div className="mt-4">
            {pulling ? (
              <div className="rounded-[24px] border border-[#dceae2] bg-white p-8 text-center">
                <div className="text-4xl">🫧</div>
                <div className="mt-3 font-black">史萊姆生成中...</div>
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#cfded5] bg-white/70 p-7 text-center text-sm font-bold text-[#789083]">
                抽完之後，結果會出現在這裡。
              </div>
            ) : (
              <>
                <div
                  className={
                    results.length === 1
                      ? "mx-auto grid max-w-sm grid-cols-1 gap-4"
                      : "grid grid-cols-2 gap-3 md:grid-cols-5"
                  }
                >
                  {results.map((result, index) => {
                    const slime = SLIME_BY_ID[result.slimeId];

                    return (
                      <article
                        key={`${result.slimeId}-${index}`}
                        className="rounded-[22px] border border-[#dfe9e3] bg-white p-4 text-center shadow-[0_8px_20px_rgba(31,83,53,0.04)]"
                      >
                        <div className="flex min-h-[130px] items-center justify-center">
                          <img
                            src={slime.image}
                            alt={slime.defaultName}
                            className="h-auto w-full max-w-[135px] object-contain"
                          />
                        </div>

                        <div className="mt-2 text-xs font-black text-[#789083]">
                          {slime.rarity}
                        </div>
                        <div className="mt-1 text-sm font-black">
                          {slime.defaultName}
                        </div>

                        <ResultReward result={result} />
                      </article>
                    );
                  })}
                </div>

                <Link
                  href="/slimes"
                  className="mx-auto mt-4 block max-w-sm rounded-2xl border border-[#d7e7de] bg-white px-5 py-3 text-center text-sm font-black text-[#315b45]"
                >
                  🐾 回圖鑑看看
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ResultReward({ result }: { result: Result }) {
  if (result.isNew) {
    return (
      <div className="mt-3 rounded-xl bg-[#eaf9f0] px-3 py-2 text-xs font-black text-[#28754b]">
        NEW! · 已加入圖鑑
      </div>
    );
  }

  if (!result.duplicateReward) return null;

  if (result.duplicateReward.type === "coins") {
    return (
      <div className="mt-3 rounded-xl bg-[#fff7e8] px-3 py-2 text-xs font-black text-[#9b6a20]">
        重複角色 · +{result.duplicateReward.amount} 金幣
      </div>
    );
  }

  if (result.duplicateReward.type === "fragments_full") {
    return (
      <div className="mt-3 rounded-xl bg-[#f4f8f5] px-3 py-2 text-xs font-black text-[#557768]">
        碎片已滿 · 可解鎖飾品
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-[#f4f8f5] px-3 py-2 text-xs font-black text-[#557768]">
      重複角色 · +{result.duplicateReward.amount} 碎片
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
              : "border-[#d7e7de] bg-white text-[#315b45]",
          ].join(" ")}
        >
          {secondaryLabel}
        </button>
      )}
    </article>
  );
}
