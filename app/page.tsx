"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/top-bar";
import { getPlayerDisplayName, useGameState } from "@/components/game-state-provider";
import { SLIME_BY_ID } from "@/lib/slime-data";
import { SLIME_DIALOGUES } from "@/lib/slime-dialogues";
import { ACHIEVEMENT_COUNT, getClaimableAchievementIds } from "@/lib/achievement-status";
import { useAuthUser } from "@/hooks/use-auth-user";

type RoomPosition = { x: number; y: number };

export default function Home() {
  const auth = useAuthUser();
  const game = useGameState();
  const [todayKey, setTodayKey] = useState<string | null>(null);
  const [bubbleText, setBubbleText] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const [poking, setPoking] = useState(false);
  const [hopping, setHopping] = useState(false);
  const [roomPosition, setRoomPosition] = useState<RoomPosition>({ x: 50, y: 60 });
  const bubbleTimeoutRef = useRef<number | null>(null);
  const pokeTimeoutRef = useRef<number | null>(null);
  const hopTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setTodayKey(`${y}-${m}-${d}`);
  }, []);

  useEffect(() => {
    if (!auth.isLoggedIn || !game.isReady) return;

    const move = () => {
      setHopping(true);
      setRoomPosition({
        x: 24 + Math.random() * 52,
        y: 55 + Math.random() * 10,
      });
      if (hopTimeoutRef.current) window.clearTimeout(hopTimeoutRef.current);
      hopTimeoutRef.current = window.setTimeout(() => setHopping(false), 900);
    };

    const firstMove = window.setTimeout(move, 3200);
    const interval = window.setInterval(move, 8200);

    return () => {
      window.clearTimeout(firstMove);
      window.clearInterval(interval);
      if (hopTimeoutRef.current) window.clearTimeout(hopTimeoutRef.current);
    };
  }, [auth.isLoggedIn, game.isReady]);

  useEffect(
    () => () => {
      if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
      if (pokeTimeoutRef.current) window.clearTimeout(pokeTimeoutRef.current);
    },
    [],
  );

  const companion = SLIME_BY_ID[game.companionId] ?? SLIME_BY_ID["n-green"];
  const playerSlime = game.slimes[companion.id];
  const companionName = getPlayerDisplayName(companion.id, playerSlime);
  const accessoryEquipped =
    playerSlime?.accessoryUnlocked && playerSlime?.accessoryEquipped;
  const companionImage = accessoryEquipped
    ? companion.accessoryImage
    : companion.image;
  const companionScale = accessoryEquipped ? 1.02 : 1.1;

  const today = todayKey
    ? game.activityByDate[todayKey] ?? {
        questionsAnswered: 0,
        mistakesReviewed: 0,
        focusSeconds: 0,
      }
    : { questionsAnswered: 0, mistakesReviewed: 0, focusSeconds: 0 };

  const ownedCount = useMemo(
    () => Object.values(game.slimes).filter((item) => item.owned).length,
    [game.slimes],
  );

  const claimableAchievementCount = useMemo(
    () => getClaimableAchievementIds(game).length,
    [
      game.focusHistory,
      game.slimes,
      game.totalPulls,
      game.totalQuestionsAnswered,
      game.totalMistakesReviewed,
      game.streak,
      game.claimedAchievementIds,
    ],
  );

  const protectedHref = (href: string) =>
    auth.isLoggedIn ? href : `/auth/login?redirect=${encodeURIComponent(href)}`;

  const pokeCompanion = () => {
    const lines = SLIME_DIALOGUES[companion.id] ?? SLIME_DIALOGUES["n-green"];
    const next = lines[Math.floor(Math.random() * lines.length)];
    setBubbleText(next);
    setShowBubble(true);
    setPoking(true);

    if (pokeTimeoutRef.current) window.clearTimeout(pokeTimeoutRef.current);
    pokeTimeoutRef.current = window.setTimeout(() => setPoking(false), 520);

    if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = window.setTimeout(() => setShowBubble(false), 3600);
  };

  const tasks = [
    {
      icon: "🧠",
      label: "完成 5 題",
      progress: `${Math.min(today.questionsAnswered, 5)} / 5 題`,
      complete: today.questionsAnswered >= 5,
      reward: { type: "coins" as const, amount: 25 },
      claimId: `daily:${todayKey ?? "loading"}:questions`,
    },
    {
      icon: "🔍",
      label: "訂正 1 題",
      progress: `${Math.min(today.mistakesReviewed, 1)} / 1 題`,
      complete: today.mistakesReviewed >= 1,
      reward: { type: "coins" as const, amount: 25 },
      claimId: `daily:${todayKey ?? "loading"}:review`,
    },
    {
      icon: "⏱️",
      label: "專注 20 分鐘",
      progress: `${Math.min(Math.floor(today.focusSeconds / 60), 20)} / 20 分`,
      complete: today.focusSeconds >= 20 * 60,
      reward: { type: "coins" as const, amount: 25 },
      claimId: `daily:${todayKey ?? "loading"}:focus`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar />

        <section className="mt-5 rounded-[26px] border border-[#d8e9df] bg-gradient-to-br from-[#e7f9ee] via-white to-[#ebf8fc] p-5 shadow-[0_14px_34px_rgba(40,106,69,0.07)] md:p-7">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            TODAY&apos;S STUDY
          </div>
          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.04em] md:text-5xl">
            把今天的知識
            <br />
            餵給你的史萊姆。
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[#6f887b] md:text-base">
            做題、訂正與專注學習都會讓收藏慢慢前進。
          </p>
          <Link
            href="/study"
            className="mt-5 block w-full rounded-2xl bg-[#31c978] px-5 py-4 text-center text-base font-black text-white transition hover:bg-[#2dbc70]"
          >
            🧠 開始學習
          </Link>
        </section>

        {auth.isLoggedIn && game.isReady ? (
          <section className="mt-4 overflow-hidden rounded-[26px] border border-[#d8e9df] bg-white shadow-[0_10px_26px_rgba(31,83,53,0.05)]">
            <div className="flex items-center justify-between gap-3 px-5 pt-5">
              <div className="min-w-0">
                <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">
                  MY ROOM
                </div>
                <div className="mt-1 truncate text-sm font-black text-[#315b45]">
                  {companionName}
                </div>
                <div className="mt-0.5 text-xs font-bold text-[#789083]">
                  戳一下看看
                </div>
              </div>
              <Link
                href="/slimes"
                className="shrink-0 rounded-full border border-[#cfe7d8] bg-white px-3 py-1.5 text-xs font-black text-[#237849]"
              >
                前往圖鑑 →
              </Link>
            </div>

            <div className="relative min-h-[280px] overflow-hidden bg-gradient-to-b from-white via-[#fbfefc] to-[#edf8f1] sm:min-h-[320px]">
              <div className="absolute inset-x-8 bottom-6 h-8 rounded-[50%] bg-[#dfece4]/55" />
              <div
                className="absolute z-20 h-[148px] w-[148px] transition-[left,top] duration-[5600ms] ease-in-out motion-reduce:transition-none"
                style={{
                  left: `${roomPosition.x}%`,
                  top: `${roomPosition.y}%`,
                  transform: "translate3d(-50%, -50%, 0)",
                }}
              >
                <div
                  className={[
                    "relative h-full w-full will-change-transform",
                    poking
                      ? "animate-[medslime-poke_520ms_ease-out]"
                      : hopping
                        ? "animate-[medslime-hop_900ms_ease-in-out]"
                        : "",
                  ].join(" ")}
                >
                  {showBubble && (
                    <div className="pointer-events-none absolute bottom-[150px] left-1/2 z-30 max-w-[250px] -translate-x-1/2 rounded-2xl border border-[#cfe7d8] bg-[#eefaf2] px-4 py-2.5 text-center text-xs font-black leading-5 text-[#315b45] shadow-[0_8px_20px_rgba(31,83,53,0.10)] sm:text-sm">
                      {bubbleText}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={pokeCompanion}
                    className="relative grid h-full w-full place-items-center rounded-[28px] outline-none focus-visible:ring-2 focus-visible:ring-[#65d795]"
                    aria-label={`戳一下${companionName}`}
                  >
                    <img
                      src={companionImage}
                      alt={companionName}
                      draggable={false}
                      className="block h-[140px] w-[140px] max-w-none object-contain drop-shadow-[0_10px_18px_rgba(31,83,53,0.12)]"
                      style={{ transform: `scale(${companionScale})` }}
                    />
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {auth.isLoggedIn && game.isReady ? (
          <section className="mt-5">
            <h2 className="mb-3 text-xl font-black tracking-[-0.03em]">
              今日學習
            </h2>
            <div className="grid grid-cols-4 gap-2">
              <StatCard label="作答" value={`${today.questionsAnswered}`} />
              <StatCard label="訂正" value={`${today.mistakesReviewed}`} />
              <StatCard
                label="專注"
                value={`${Math.floor(today.focusSeconds / 60)}`}
                suffix="分"
              />
              <StatCard label="連續" value={`${game.streak}`} suffix="天" />
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="mb-3 text-xl font-black tracking-[-0.03em]">
            史萊姆生活
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <MiniGameCard
              href={protectedHref("/slimes")}
              icon="🐾"
              title="收藏"
              value={
                auth.isLoggedIn && game.isReady
                  ? `${ownedCount} / 17`
                  : "登入查看"
              }
            />
            <MiniGameCard
              href={protectedHref("/gacha")}
              icon="🎟️"
              title="抽卡"
              value={
                auth.isLoggedIn && game.isReady
                  ? game.canUseFreePull
                    ? "免費 1 抽"
                    : "今日已抽"
                  : "登入查看"
              }
            />
            <MiniGameCard
              href={protectedHref("/achievements")}
              icon="🏆"
              title="成就"
              value={
                auth.isLoggedIn && game.isReady
                  ? claimableAchievementCount > 0
                    ? `🎁 ${claimableAchievementCount} 個獎勵待領`
                    : `${game.claimedAchievementIds.length} / ${ACHIEVEMENT_COUNT} 已領`
                  : "登入查看"
              }
              highlight={claimableAchievementCount > 0}
              wide
            />
          </div>
        </section>

        {auth.isLoggedIn && game.isReady ? (
          <section className="mt-6 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black tracking-[-0.03em]">
                今日任務
              </h2>
              <Link href="/tasks" className="text-sm font-black text-[#2ba962]">
                查看全部 →
              </Link>
            </div>
            <div className="rounded-[24px] border border-[#dfece4] bg-white px-4 py-2 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
              {tasks.map((task, index) => {
                const claimed = game.claimedTaskIds.includes(task.claimId);
                const claimable = task.complete && !claimed;
                return (
                  <div
                    key={task.label}
                    className={[
                      "flex items-center gap-3 py-3.5",
                      index !== tasks.length - 1
                        ? "border-b border-[#edf2ef]"
                        : "",
                    ].join(" ")}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eefaf2] text-lg">
                      {task.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black">{task.label}</div>
                      <div className="mt-0.5 text-xs font-bold text-[#8a9c92]">
                        {task.progress}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!claimable}
                      onClick={() =>
                        game.claimTaskReward(task.claimId, task.reward)
                      }
                      className={[
                        "shrink-0 rounded-xl px-3 py-2 text-xs font-black transition",
                        claimed
                          ? "cursor-default bg-[#eef4f0] text-[#789083]"
                          : claimable
                            ? "bg-[#31c978] text-white hover:bg-[#2dbc70]"
                            : "cursor-not-allowed bg-[#f4f7f5] text-[#a0aea5]",
                      ].join(" ")}
                    >
                      {claimed
                        ? "已領取"
                        : claimable
                          ? `領取 🪙${task.reward.amount}`
                          : `🪙${task.reward.amount}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <style jsx global>{`
        @keyframes medslime-poke {
          0% { transform: translateY(0); }
          28% { transform: translateY(-24px); }
          55% { transform: translateY(0); }
          75% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
        @keyframes medslime-hop {
          0% { transform: translateY(0); }
          22% { transform: translateY(-18px); }
          44% { transform: translateY(0); }
          66% { transform: translateY(-10px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

function MiniGameCard({
  href,
  icon,
  title,
  value,
  wide = false,
  highlight = false,
}: {
  href: string;
  icon: string;
  title: string;
  value: string;
  wide?: boolean;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-[22px] border bg-white p-4 shadow-[0_8px_22px_rgba(31,83,53,0.04)] transition active:scale-[0.99]",
        highlight
          ? "border-[#efc66c] bg-[#fffdf6] ring-2 ring-[#f8e8bc]/60"
          : "border-[#dfece4]",
        wide ? "col-span-2" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eefaf2] text-xl">
          {icon}
        </div>
        <div>
          <div className="text-sm font-black">{title}</div>
          <div
            className={[
              "mt-0.5 text-xs font-bold",
              highlight ? "text-[#9a6a19]" : "text-[#789083]",
            ].join(" ")}
          >
            {value}
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-2 py-3 text-center">
      <div className="text-[11px] font-bold text-[#8a9c92]">{label}</div>
      <div className="mt-1 text-lg font-black leading-none">
        {value}
        {suffix && (
          <span className="ml-0.5 text-[10px] font-bold text-[#789083]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
