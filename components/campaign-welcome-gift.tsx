"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useGameState } from "@/components/game-state-provider";
import { WELCOME_GIFT_TICKETS } from "@/lib/campaign";

type GiftState =
  | { status: "idle" | "loading" }
  | { status: "hidden" }
  | { status: "ready" }
  | { status: "received" }
  | { status: "error"; message: string };

export default function CampaignWelcomeGift() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuthUser();
  const game = useGameState();
  const [state, setState] = useState<GiftState>({ status: "idle" });
  const [claiming, setClaiming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const canCheck =
    pathname === "/" &&
    !auth.loading &&
    auth.isLoggedIn &&
    game.isReady &&
    game.hasSeenOnboarding;

  useEffect(() => {
    if (!canCheck || dismissed || state.status !== "idle") return;

    const controller = new AbortController();
    setState({ status: "loading" });

    void (async () => {
      try {
        const response = await fetch("/api/campaign/welcome-gift", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error ?? "讀取小禮物失敗。");

        if (!payload?.eligible || payload?.claimed) {
          setState({ status: "hidden" });
          return;
        }

        setState({ status: "ready" });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "讀取小禮物失敗。",
        });
      }
    })();

    return () => controller.abort();
  }, [canCheck, dismissed, state.status]);

  const claim = async () => {
    if (claiming) return;
    setClaiming(true);

    try {
      const response = await fetch("/api/campaign/welcome-gift", {
        method: "POST",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "領取失敗。");

      const added = Math.max(0, Number(payload?.ticketsAdded ?? 0));
      if (added > 0) game.addTickets(added);
      setState({ status: "received" });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "領取失敗，請稍後再試。",
      });
    } finally {
      setClaiming(false);
    }
  };

  if (
    !canCheck ||
    dismissed ||
    state.status === "idle" ||
    state.status === "loading" ||
    state.status === "hidden"
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#d8e9df] bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-[#e8faef] via-white to-[#fff8e9] px-6 pb-6 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-4xl shadow-[0_8px_24px_rgba(31,83,53,0.08)]">
            🎁
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#17372a]">
            歡迎你的加入
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#6f887b]">
            這是給新同學的一點小心意。先拿去玩一次十連抽，看看會帶哪隻史萊姆回家。
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-[22px] border border-[#dce9e1] bg-[#f8fcf9] px-5 py-4 text-center">
            <div className="text-sm font-black text-[#789083]">新手小禮物</div>
            <div className="mt-1 text-3xl font-black text-[#17372a]">
              🎫 × {WELCOME_GIFT_TICKETS}
            </div>
            <div className="mt-1 text-xs font-bold text-[#789083]">剛好可以抽一次十連</div>
          </div>

          {state.status === "error" && (
            <div className="mt-4 rounded-xl border border-[#f0dddd] bg-[#fff7f7] px-4 py-3 text-sm font-bold leading-5 text-[#9b5050]">
              {state.message}
            </div>
          )}

          {state.status === "received" ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded-2xl border border-[#d7e7de] bg-white px-4 py-3.5 text-sm font-black text-[#557768]"
              >
                晚點再抽
              </button>
              <button
                type="button"
                onClick={() => router.push("/gacha")}
                className="rounded-2xl bg-[#31c978] px-4 py-3.5 text-sm font-black text-white"
              >
                去抽十連 →
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded-2xl border border-[#d7e7de] bg-white px-4 py-3.5 text-sm font-black text-[#789083]"
              >
                晚點再領
              </button>
              <button
                type="button"
                onClick={claim}
                disabled={claiming}
                className="rounded-2xl bg-[#31c978] px-4 py-3.5 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
              >
                {claiming ? "領取中..." : `收下 ${WELCOME_GIFT_TICKETS} 張抽卡券`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
