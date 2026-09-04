"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/top-bar";
import {
  getPlayerDisplayName,
  useGameState,
} from "@/components/game-state-provider";
import { SLIME_BY_ID } from "@/lib/slime-data";
import { useAuthUser } from "@/hooks/use-auth-user";

const sillyMessages = [
  "我剛剛什麼都沒做，累死。",
  "今天的腦容量：2 KB。",
  "你讀你的，我先軟爛。",
  "這題我會。騙你的。",
  "我只是史萊姆，不要問我。",
  "可以下課了嗎？我沒有課。",
  "我有在陪你，只是看不出來。",
  "再戳我，我就……算了。",
];

type RoomPosition = {
  x: number;
  y: number;
};

export default function Home() {
  const auth = useAuthUser();
  const game = useGameState();

  const [todayKey, setTodayKey] = useState<string | null>(null);
  const [bubbleText, setBubbleText] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const [poking, setPoking] = useState(false);
  const [hopping, setHopping] = useState(false);
  const [roomPosition, setRoomPosition] = useState<RoomPosition>({
    x: 50,
    y: 58,
  });

  const roomRef = useRef<HTMLDivElement | null>(null);
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pokeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        x: 18 + Math.random() * 64,
        y: 46 + Math.random() * 20,
      });

      if (hopTimeoutRef.current) {
        window.clearTimeout(hopTimeoutRef.current);
      }

      hopTimeoutRef.current = window.setTimeout(() => {
        setHopping(false);
      }, 900);
    };

    const firstMove = window.setTimeout(move, 2800);
    const interval = window.setInterval(move, 7600);

    return () => {
      window.clearTimeout(firstMove);
      window.clearInterval(interval);

      if (hopTimeoutRef.current) {
        window.clearTimeout(hopTimeoutRef.current);
      }
    };
  }, [auth.isLoggedIn, game.isReady]);

  useEffect(() => {
    return () => {
      if (bubbleTimeoutRef.current) {
        window.clearTimeout(bubbleTimeoutRef.current);
      }

      if (pokeTimeoutRef.current) {
        window.clearTimeout(pokeTimeoutRef.current);
      }
    };
  }, []);

  const companion =
    SLIME_BY_ID[game.companionId] ?? SLIME_BY_ID["n-green"];

  const playerSlime = game.slimes[companion.id];

  const today =
    todayKey
      ? game.activityByDate[todayKey] ?? {
          questionsAnswered: 0,
          mistakesReviewed: 0,
          focusSeconds: 0,
        }
      : {
          questionsAnswered: 0,
          mistakesReviewed: 0,
          focusSeconds: 0,
        };

  const tasks = [
    {
      icon: "🧠",
      title: "完成 5 題",
      progress: `${Math.min(today.questionsAnswered, 5)} / 5 題`,
      reward:
        today.questionsAnswered >= 5 ? "✓ 已完成" : "🪙 10",
    },
    {
      icon: "🔍",
      title: "訂正 1 題",
      progress: `${Math.min(today.mistakesReviewed, 1)} / 1 題`,
      reward:
        today.mistakesReviewed >= 1 ? "✓ 已完成" : "🪙 10",
    },
    {
      icon: "⏱️",
      title: "專注 20 分鐘",
      progress: `${Math.min(
        Math.floor(today.focusSeconds / 60),
        20,
      )} / 20 分鐘`,
      reward:
        today.focusSeconds >= 20 * 60 ? "✓ 已完成" : "🪙 10",
    },
  ];

  const ownedCount = useMemo(
    () =>
      Object.values(game.slimes).filter((item) => item.owned)
        .length,
    [game.slimes],
  );

  const protectedHref = (href: string) =>
    auth.isLoggedIn ? href : "/auth/login";

  const pokeCompanion = () => {
    const next =
      sillyMessages[Math.floor(Math.random() * sillyMessages.length)];

    setBubbleText(next);
    setShowBubble(true);
    setPoking(true);

    if (pokeTimeoutRef.current) {
      window.clearTimeout(pokeTimeoutRef.current);
    }

    pokeTimeoutRef.current = window.setTimeout(() => {
      setPoking(false);
    }, 520);

    if (bubbleTimeoutRef.current) {
      window.clearTimeout(bubbleTimeoutRef.current);
    }

    bubbleTimeoutRef.current = window.setTimeout(() => {
      setShowBubble(false);
    }, 3200);
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <TopBar />

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-[#d8e9df] bg-gradient-to-br from-[#e7f9ee] via-white to-[#ebf8fc] p-7 shadow-[0_18px_44px_rgba(40,106,69,0.08)]">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              TODAY&apos;S STUDY
            </div>

            <h1 className="mt-2 max-w-xl text-4xl font-black leading-tight tracking-[-0.05em] md:text-5xl">
              把今天的知識
              <br />
              餵給你的史萊姆。
            </h1>

            <p className="mt-4 max-w-xl text-base leading-8 text-[#6f887b]">
              做題、訂正與專注學習都會讓 MedSlime 的收藏系統慢慢前進。
            </p>

            <div className="mt-7 grid gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Link
                href="/study"
                className="block rounded-2xl bg-[#31c978] px-5 py-4 text-center text-base font-black text-white transition hover:-translate-y-[1px] hover:bg-[#2dbc70]"
              >
                🧠 開始學習
              </Link>

              <Link
                href={protectedHref("/slimes")}
                className="block rounded-2xl bg-[#31c978] px-5 py-4 text-center text-base font-black text-white transition hover:-translate-y-[1px] hover:bg-[#2dbc70]"
              >
                🐾 我的史萊姆
              </Link>

              <Link
                href={protectedHref("/achievements")}
                className="block rounded-2xl bg-[#31c978] px-5 py-4 text-center text-base font-black text-white transition hover:-translate-y-[1px] hover:bg-[#2dbc70]"
              >
                🏆 成就
              </Link>
            </div>

            {auth.isLoggedIn && game.isReady ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#dfece4] bg-white/80 px-4 py-3">
                  <div className="text-xs font-bold text-[#789083]">
                    已收藏
                  </div>
                  <div className="mt-1 text-lg font-black">
                    {ownedCount} / 17
                  </div>
                </div>

                <div className="rounded-2xl border border-[#dfece4] bg-white/80 px-4 py-3">
                  <div className="text-xs font-bold text-[#789083]">
                    連續學習
                  </div>
                  <div className="mt-1 text-lg font-black">
                    🔥 {game.streak} 天
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {auth.isLoggedIn && game.isReady ? (
            <div
              ref={roomRef}
              className="relative min-h-[360px] overflow-hidden rounded-[30px] border border-[#d8e9df] bg-gradient-to-b from-[#f5fbf7] via-white to-[#edf8f1] shadow-[0_14px_36px_rgba(40,106,69,0.06)] md:min-h-[420px]"
            >
              <div className="absolute left-5 top-5 z-10">
                <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">
                  MY ROOM
                </div>
                <div className="mt-1 text-sm font-bold text-[#789083]">
                  戳一下看看
                </div>
              </div>

              <div className="absolute inset-x-6 bottom-5 h-10 rounded-[50%] bg-[#dfece4]/55 blur-[1px]" />

              <div
                className="absolute z-20 transition-[left,top] duration-[5200ms] ease-in-out motion-reduce:transition-none"
                style={{
                  left: `${roomPosition.x}%`,
                  top: `${roomPosition.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="relative flex flex-col items-center">
                  {showBubble && (
                    <div className="pointer-events-none absolute bottom-[148px] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-2xl border border-[#cfe7d8] bg-[#eefaf2] px-5 py-3 text-sm font-black text-[#315b45] shadow-[0_10px_24px_rgba(31,83,53,0.10)]">
                      {bubbleText}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={pokeCompanion}
                    className={[
                      "rounded-[28px] p-1 outline-none focus-visible:ring-2 focus-visible:ring-[#65d795]",
                      poking
                        ? "animate-[medslime-poke_520ms_ease-out]"
                        : hopping
                          ? "animate-[medslime-hop_900ms_ease-in-out]"
                          : "",
                    ].join(" ")}
                    aria-label={`戳一下${getPlayerDisplayName(
                      companion.id,
                      playerSlime,
                    )}`}
                    title="戳一下"
                  >
                    <img
                      src={companion.image}
                      alt={getPlayerDisplayName(companion.id, playerSlime)}
                      className="h-[132px] w-[132px] object-contain drop-shadow-[0_10px_18px_rgba(31,83,53,0.12)] md:h-[150px] md:w-[150px]"
                    />
                  </button>

                  <div className="mt-1 rounded-full border border-[#cfe7d8] bg-white/90 px-3 py-1 text-xs font-black text-[#237849] shadow-sm">
                    {getPlayerDisplayName(companion.id, playerSlime)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {auth.isLoggedIn && game.isReady ? (
          <section className="mt-10">
            <div className="mb-4 text-2xl font-black tracking-[-0.03em]">
              今日任務
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {tasks.map((task) => (
                <div
                  key={task.title}
                  className="rounded-[24px] border border-[#dfece4] bg-white p-5 shadow-[0_10px_26px_rgba(31,83,53,0.05)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eefaf2] text-2xl">
                    {task.icon}
                  </div>

                  <div className="mt-4 text-lg font-black">
                    {task.title}
                  </div>

                  <div className="mt-1 text-sm font-medium text-[#789083]">
                    {task.progress}
                  </div>

                  <div className="mt-4 font-black text-[#2a9d5e]">
                    {task.reward}
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/tasks"
              className="mt-4 block w-full rounded-2xl border border-[#d7e7de] bg-white px-5 py-3 text-center font-bold text-[#315b45] transition hover:bg-[#f5faf7]"
            >
              查看每日／每週任務
            </Link>
          </section>
        ) : null}
      </div>

      <style jsx global>{`
        @keyframes medslime-poke {
          0% {
            transform: translateY(0) scale(1);
          }
          28% {
            transform: translateY(-24px) scale(0.94, 1.08);
          }
          55% {
            transform: translateY(0) scale(1.08, 0.92);
          }
          75% {
            transform: translateY(-8px) scale(0.97, 1.03);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        @keyframes medslime-hop {
          0% {
            transform: translateY(0);
          }
          22% {
            transform: translateY(-18px);
          }
          44% {
            transform: translateY(0);
          }
          66% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
