"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import TopBar from "@/components/top-bar";
import LoginRequired from "@/components/login-required";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  getPlayerDisplayName,
  useGameState,
} from "@/components/game-state-provider";
import {
  RARITY_ORDER,
  SLIMES,
  type SlimeDefinition,
} from "@/lib/slime-data";

const LOCKED_SSR_PLACEHOLDER = "/slimes/n-green.png";

export default function SlimesPage() {
  const auth = useAuthUser();
  const game = useGameState();
  const pathname = usePathname();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [rarityFilter, setRarityFilter] = useState<
    "ALL" | "N" | "R" | "SR" | "SSR"
  >("ALL");

  const [sortMode, setSortMode] = useState<
    "owned-rarity" | "rarity-owned" | "name"
  >("owned-rarity");

  useEffect(() => {
    if (pathname !== "/slimes") {
      setExpandedId(null);
    }
  }, [pathname]);

  useEffect(() => {
    setExpandedId(null);

    const handlePageHide = () => {
      setExpandedId(null);
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      setExpandedId(null);
    };
  }, []);

  const ownedCount = useMemo(
    () =>
      SLIMES.filter((slime) => game.slimes[slime.id]?.owned)
        .length,
    [game.slimes],
  );

  const accessoryCount = useMemo(
    () =>
      SLIMES.filter(
        (slime) => game.slimes[slime.id]?.accessoryUnlocked,
      ).length,
    [game.slimes],
  );

  const sortedSlimes = useMemo(() => {
    return [...SLIMES]
      .filter((slime) =>
        rarityFilter === "ALL"
          ? true
          : slime.rarity === rarityFilter,
      )
      .sort((a, b) => {
        if (
          a.id === game.companionId &&
          b.id !== game.companionId
        ) {
          return -1;
        }

        if (
          b.id === game.companionId &&
          a.id !== game.companionId
        ) {
          return 1;
        }

        const aOwned =
          game.slimes[a.id]?.owned ?? false;
        const bOwned =
          game.slimes[b.id]?.owned ?? false;

        if (sortMode === "owned-rarity") {
          if (aOwned !== bOwned) {
            return aOwned ? -1 : 1;
          }

          return (
            RARITY_ORDER[a.rarity] -
            RARITY_ORDER[b.rarity]
          );
        }

        if (sortMode === "rarity-owned") {
          const rarityDiff =
            RARITY_ORDER[a.rarity] -
            RARITY_ORDER[b.rarity];

          if (rarityDiff !== 0) {
            return rarityDiff;
          }

          if (aOwned !== bOwned) {
            return aOwned ? -1 : 1;
          }

          return 0;
        }

        return a.defaultName.localeCompare(
          b.defaultName,
          "zh-Hant",
        );
      });
  }, [
    rarityFilter,
    game.slimes,
    game.companionId,
    sortMode,
  ]);

  if (auth.loading) {
    return <main className="min-h-screen bg-[#f8fcf9]" />;
  }

  if (!auth.isLoggedIn) {
    return (
      <LoginRequired
        title="登入後查看你的史萊姆"
        description="史萊姆收藏、陪伴角色、碎片與專屬飾品都屬於你的個人帳號資料。"
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack />

        <section className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              COLLECTION
            </div>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
              史萊姆圖鑑
            </h1>

            <p className="mt-3 text-sm font-bold text-[#70877a]">
              收集角色、累積碎片並解鎖每隻史萊姆的專屬飾品。
            </p>
          </div>

          <Link
            href="/gacha"
            className="inline-flex items-center justify-center rounded-2xl bg-[#31c978] px-6 py-3.5 font-black text-white shadow-[0_10px_24px_rgba(49,201,120,0.18)] transition hover:-translate-y-0.5 hover:bg-[#2dbc70]"
          >
            🎟️ 前往抽卡
          </Link>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <SummaryCard
            label="已收藏"
            value={`${ownedCount} / ${SLIMES.length}`}
          />
          <SummaryCard
            label="專屬飾品"
            value={`${accessoryCount} / ${SLIMES.length}`}
          />
        </section>

        <section className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["ALL", "N", "R", "SR", "SSR"] as const).map(
              (rarity) => (
                <button
                  key={rarity}
                  type="button"
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
              ),
            )}
          </div>

          <label className="flex items-center gap-2 text-sm font-black text-[#557768]">
            <span>排序</span>

            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(
                  event.target.value as
                    | "owned-rarity"
                    | "rarity-owned"
                    | "name",
                )
              }
              className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2.5 font-black text-[#315b45] outline-none transition focus:border-[#65d795]"
            >
              <option value="owned-rarity">已擁有</option>
              <option value="rarity-owned">稀有度</option>
              <option value="name">名稱</option>
            </select>
          </label>
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

  const [editingNickname, setEditingNickname] =
    useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");

  const owned = player?.owned ?? false;
  const companion = game.companionId === slime.id;
  const fragments = player?.fragments ?? 0;
  const accessoryUnlocked =
    player?.accessoryUnlocked ?? false;
  const accessoryEquipped =
    player?.accessoryEquipped ?? false;

  const hiddenSSR =
    slime.rarity === "SSR" && !owned;

  const displayName =
    getPlayerDisplayName(slime.id, player);

  const cardImage =
    hiddenSSR
      ? LOCKED_SSR_PLACEHOLDER
      : owned &&
          accessoryUnlocked &&
          accessoryEquipped
        ? slime.accessoryImage
        : slime.image;

  const startNicknameEdit = () => {
    setNicknameDraft(player?.nickname ?? "");
    setEditingNickname(true);
  };

  const saveNickname = () => {
    const next = nicknameDraft.trim();
    game.setNickname(slime.id, next);
    setEditingNickname(false);
  };

  const cancelNicknameEdit = () => {
    setNicknameDraft(player?.nickname ?? "");
    setEditingNickname(false);
  };

  const fragmentPercent = Math.min(
    100,
    (fragments / 30) * 100,
  );

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
          src={cardImage}
          alt={hiddenSSR ? "???" : displayName}
          className={[
            "h-auto w-full object-contain transition-all duration-300",
            hiddenSSR
              ? "brightness-0 opacity-70"
              : owned
                ? "opacity-100"
                : "grayscale opacity-35",
            expanded ? "max-w-[190px]" : "max-w-[160px]",
          ].join(" ")}
        />

        {!owned && (
          <div className="absolute right-1 top-1 rounded-full bg-white p-2 shadow-sm">
            🔒
          </div>
        )}
      </div>

      <div className="mt-3">
        {editingNickname && owned && expanded ? (
          <div className="mx-auto flex max-w-[260px] items-center gap-2">
            <input
              autoFocus
              value={nicknameDraft}
              onChange={(event) =>
                setNicknameDraft(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  saveNickname();
                }

                if (event.key === "Escape") {
                  cancelNicknameEdit();
                }
              }}
              placeholder={slime.defaultName}
              className="min-w-0 flex-1 rounded-xl border border-[#bcdcca] bg-white px-3 py-2 text-center text-base font-black text-[#17372a] outline-none focus:border-[#65d795]"
            />

            <button
              type="button"
              onClick={saveNickname}
              className="rounded-xl bg-[#31c978] px-3 py-2 text-sm font-black text-white"
              aria-label="儲存暱稱"
              title="儲存暱稱"
            >
              ✓
            </button>

            <button
              type="button"
              onClick={cancelNicknameEdit}
              className="rounded-xl border border-[#d7e7de] bg-white px-3 py-2 text-sm font-black text-[#60786c]"
              aria-label="取消修改暱稱"
              title="取消"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-lg font-black">
            <span>
              {hiddenSSR ? "???" : displayName}
            </span>

            {owned && expanded && !hiddenSSR && (
              <button
                type="button"
                onClick={startNicknameEdit}
                className="rounded-lg border-0 bg-transparent p-1 text-base text-[#668276] transition hover:bg-[#eef7f1]"
                aria-label="修改史萊姆暱稱"
                title="修改暱稱"
              >
                ✏️
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-1 text-sm font-bold text-[#789083]">
        {slime.rarity} · {owned ? "已擁有" : "尚未取得"}
      </div>

      {companion && (
        <div className="mx-auto mt-3 inline-flex rounded-full border border-[#cfe7d8] bg-[#eefaf2] px-3 py-1 text-sm font-black text-[#237849]">
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
                    style={{
                      width: `${fragmentPercent}%`,
                    }}
                  />
                </div>

                <AccessoryPreview
                  slime={slime}
                  unlocked={accessoryUnlocked}
                  hiddenSSR={false}
                />

                {accessoryUnlocked ? (
                  <button
                    type="button"
                    onClick={() =>
                      game.setAccessoryEquipped(
                        slime.id,
                        !accessoryEquipped,
                      )
                    }
                    className={[
                      "mt-3 w-full rounded-xl py-2.5 font-black transition",
                      accessoryEquipped
                        ? "border border-[#d7e7de] bg-white text-[#466a58] hover:bg-[#f5faf7]"
                        : "bg-[#31c978] text-white hover:bg-[#2dbc70]",
                    ].join(" ")}
                  >
                    {accessoryEquipped
                      ? "取下專屬飾品"
                      : "戴上專屬飾品"}
                  </button>
                ) : fragments >= 30 ? (
                  <button
                    type="button"
                    onClick={() =>
                      game.unlockAccessory(slime.id)
                    }
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
                    type="button"
                    onClick={() =>
                      game.setCompanion(slime.id)
                    }
                    className="mt-3 w-full rounded-xl bg-[#31c978] py-2.5 font-black text-white transition hover:bg-[#2dbc70]"
                  >
                    設為陪伴
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm leading-6 text-[#6f887b]">
                  抽到這隻史萊姆後，就會立即加入你的圖鑑。
                </p>

                <AccessoryPreview
                  slime={slime}
                  unlocked={false}
                  hiddenSSR={hiddenSSR}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="mt-4 w-full rounded-xl border border-[#d7e7de] bg-white py-2.5 font-bold transition hover:bg-[#f5faf7]"
      >
        {expanded ? "收起詳情" : "查看詳情"}
      </button>
    </article>
  );
}

function AccessoryPreview({
  slime,
  unlocked,
  hiddenSSR,
}: {
  slime: SlimeDefinition;
  unlocked: boolean;
  hiddenSSR: boolean;
}) {
  return (
    <div className="mt-4 rounded-xl border border-[#e0e9e3] bg-[#f7faf8] px-3 py-3">
      <div className="text-xs font-black tracking-[0.05em] text-[#789083]">
        專屬飾品
      </div>

      <div className="mt-1 text-sm font-black text-[#315b45]">
        ✨ {hiddenSSR ? "???" : slime.accessory}
      </div>

    </div>
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
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-4 py-3">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}
