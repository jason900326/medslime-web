"use client";

import { useMemo, useState } from "react";
import TopBar from "@/components/top-bar";
import {
  getPlayerDisplayName,
  useGameState,
} from "@/components/game-state-provider";
import {
  RARITY_ORDER,
  SLIMES,
  type SlimeDefinition,
} from "@/lib/slime-data";

export default function SlimesPage() {
  const game = useGameState();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<
    "ALL" | "N" | "R" | "SR" | "SSR"
  >("ALL");

  const sortedSlimes = useMemo(() => {
    return [...SLIMES]
      .filter((slime) =>
        rarityFilter === "ALL" ? true : slime.rarity === rarityFilter,
      )
      .sort((a, b) => {
        if (a.id === game.companionId) return -1;
        if (b.id === game.companionId) return 1;
        return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
      });
  }, [rarityFilter, game.companionId]);

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            COLLECTION
          </div>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            史萊姆圖鑑
          </h1>
        </section>

        <section className="mt-6 flex flex-wrap gap-2">
          {(["ALL", "N", "R", "SR", "SSR"] as const).map((rarity) => (
            <button
              key={rarity}
              onClick={() => setRarityFilter(rarity)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-black transition",
                rarityFilter === rarity
                  ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                  : "border-[#dbe9e1] bg-white text-[#466a58]",
              ].join(" ")}
            >
              {rarity === "ALL" ? "全部" : rarity}
            </button>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-2 items-start gap-4 md:grid-cols-3 lg:grid-cols-4">
          {sortedSlimes.map((slime) => (
            <SlimeCard
              key={slime.id}
              slime={slime}
              expanded={expandedId === slime.id}
              onToggle={() =>
                setExpandedId((current) =>
                  current === slime.id ? null : slime.id,
                )
              }
            />
          ))}
        </section>
      </div>
    </main>
  );
}

function SlimeCard({
  slime,
  expanded,
  onToggle,
}: {
  slime: SlimeDefinition;
  expanded: boolean;
  onToggle: () => void;
}) {
  const game = useGameState();
  const player = game.slimes[slime.id];
  const owned = player?.owned ?? false;
  const companion = game.companionId === slime.id;
  const fragments = player?.fragments ?? 0;
  const accessoryUnlocked = player?.accessoryUnlocked ?? false;
  const hiddenSSR = slime.rarity === "SSR" && !owned;
  const displayName = getPlayerDisplayName(slime.id, player);

  const fragmentPercent = Math.min(100, (fragments / 30) * 100);

  return (
    <article
      className={[
        "overflow-hidden rounded-[24px] border border-[#dbe9e1] bg-white p-5 text-center shadow-[0_8px_22px_rgba(32,85,54,0.05)] transition-all duration-300",
        expanded
          ? "scale-[1.02] shadow-[0_18px_40px_rgba(32,85,54,0.12)]"
          : "",
      ].join(" ")}
    >
      <div className="relative flex min-h-[150px] items-center justify-center">
        <img
          src={slime.image}
          alt={hiddenSSR ? "???" : displayName}
          className={[
            "h-auto w-full object-contain transition-all duration-300",
            owned ? "opacity-100" : "grayscale opacity-35",
            expanded ? "max-w-[190px]" : "max-w-[160px]",
          ].join(" ")}
        />

        {!owned && (
          <div className="absolute right-1 top-1 rounded-full bg-white p-2 shadow-sm">
            🔒
          </div>
        )}
      </div>

      <div className="mt-3 text-lg font-black">
        {hiddenSSR ? "???" : displayName}
      </div>

      <div className="mt-1 text-sm font-bold text-[#789083]">
        {slime.rarity} · {owned ? "已擁有" : "尚未取得"}
      </div>

      {companion && (
        <div className="mx-auto mt-3 inline-flex rounded-full border border-[#cfe9da] bg-[#e9f8ef] px-3 py-1 text-sm font-black text-[#28754b]">
          ✓ 陪伴中
        </div>
      )}

      <div
        className={[
          "grid transition-[grid-template-rows,opacity,margin] duration-300",
          expanded
            ? "mt-4 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#e3ede7] pt-4 text-left">
            {owned ? (
              <>
                <p className="text-sm leading-6 text-[#6f887b]">
                  {slime.description}
                </p>

                <div className="mt-4 flex items-center justify-between text-sm font-bold text-[#557768]">
                  <span>專屬碎片</span>
                  <span>{fragments} / 30</span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7efe9]">
                  <div
                    className="h-full rounded-full bg-[#55b97b]"
                    style={{ width: `${fragmentPercent}%` }}
                  />
                </div>

                <div className="mt-4 rounded-xl bg-[#f3f8f5] px-3 py-3 text-sm font-black text-[#315b45]">
                  ✨ 專屬飾品：{slime.accessory}
                </div>

                {accessoryUnlocked ? (
                  <div className="mt-3 rounded-xl border border-[#cfe9da] bg-[#e9f8ef] px-3 py-3 text-center text-sm font-black text-[#28754b]">
                    ✓ 專屬飾品已解鎖
                  </div>
                ) : fragments >= 30 ? (
                  <button
                    onClick={() => game.unlockAccessory(slime.id)}
                    className="mt-3 w-full rounded-xl bg-[#f3a93b] py-2.5 font-black text-white transition hover:bg-[#e99c2f]"
                  >
                    ✨ 使用 30 碎片解鎖
                  </button>
                ) : (
                  <div className="mt-3 text-center text-xs font-bold text-[#789083]">
                    還差 {30 - fragments} 碎片解鎖
                  </div>
                )}

                {!companion && (
                  <button
                    onClick={() => game.setCompanion(slime.id)}
                    className="mt-3 w-full rounded-xl bg-[#31c978] py-2.5 font-black text-white transition hover:bg-[#2dbc70]"
                  >
                    設為陪伴
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm leading-6 text-[#6f887b]">
                抽到這隻史萊姆後，就會立即加入你的圖鑑。
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="mt-4 w-full rounded-xl border border-[#d7e7de] bg-white py-2.5 font-bold transition hover:bg-[#f5faf7]"
      >
        {expanded ? "收起詳情" : "查看詳情"}
      </button>
    </article>
  );
}
