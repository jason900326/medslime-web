"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFocusTimer } from "@/components/focus-timer-provider";
import { useGameState } from "@/components/game-state-provider";
import { useProStatus } from "@/hooks/use-pro-status";

type TopBarProps = {
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
};

export default function TopBar({
  showBack = false,
  backHref = "/",
  backLabel = "返回首頁",
}: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const game = useGameState();
  const focus = useFocusTimer();
  const pro = useProStatus();
  const showFocusTimer =
    focus.isReady &&
    pathname !== "/study/focus" &&
    (focus.mode === "running" || focus.mode === "paused");

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="relative z-50 flex w-full flex-col gap-3">
      <div className="flex w-full items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {showBack && (
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="shrink-0 py-2 pr-2 text-xs font-medium text-[var(--brand-text-secondary)] transition hover:text-[#247451] sm:pr-3 sm:text-sm"
            >
              ← {backLabel}
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push("/")}
            className="relative z-50 shrink-0 border-0 bg-transparent p-0 text-2xl font-black tracking-[-0.04em] text-[var(--brand-text)] md:text-3xl"
            aria-label="回到 MedSlime 首頁"
          >
            MedSlime.
          </button>

          {!showBack && pro.isPro && (
            <GoldenProBadge proExpiresAt={pro.proExpiresAt} />
          )}
        </div>

        {!pro.loading && pro.isLoggedIn && (
          <button
            type="button"
            onClick={logout}
            className="h-10 shrink-0 rounded-full border border-[var(--brand-border-soft)] bg-[var(--brand-surface)] px-3 text-xs font-black text-[var(--brand-text-secondary)] shadow-sm transition hover:bg-[#f5faf7] md:px-4 md:text-sm"
          >
            登出
          </button>
        )}

        {!pro.loading && !pro.isLoggedIn && (
          <Link
            href="/auth/login"
            className="flex h-10 shrink-0 items-center rounded-full border border-[var(--brand-border-soft)] bg-[var(--brand-surface)] px-4 text-sm font-black text-[var(--brand-text-secondary)] shadow-sm transition hover:bg-[#f5faf7]"
          >
            登入
          </Link>
        )}
      </div>

      {!pro.loading && pro.isLoggedIn && (
        <div className="flex w-full flex-wrap items-center gap-2 border-b border-[#e1eae4] pb-3">
          {showFocusTimer && (
            <div className="min-w-0 flex-1">
              <Link
                href="/study/focus"
                aria-label={`回到專注計時器，剩餘 ${focus.displayTime}`}
                title="回到專注計時器"
                className="flex h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-full border border-[#cfe6d8] bg-[#f7fbf8] px-2 text-xs font-black text-[#315b45] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#eef8f2] md:px-4 md:text-sm"
              >
                <span
                  className={
                    focus.mode === "running"
                      ? "h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#31c978]"
                      : "h-2 w-2 shrink-0 rounded-full bg-[#d4a83e]"
                  }
                />
                <span className="truncate tabular-nums">{focus.displayTime}</span>
              </Link>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <ResourcePill label={`🔥 ${game.streak} 天`} />
          </div>
          <Link href="/shop" aria-label={`資源商店，${game.coins} 金幣、${game.tickets} 張抽卡券`} className="flex min-h-11 min-w-0 flex-[2] items-center justify-around gap-3 rounded-lg px-2 text-xs font-medium text-[var(--brand-text-secondary)] hover:bg-[#edf5ef] md:text-sm">
            <span>🪙 {game.coins}</span><span>🎫 {game.tickets}</span>
          </Link>
        </div>
      )}
    </header>
  );
}

function formatProDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function GoldenProBadge({ proExpiresAt }: { proExpiresAt: string | null }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dateLabel = formatProDate(proExpiresAt);

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0 shrink">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 max-w-full items-center gap-1.5 rounded-full border border-[#efd78a] bg-gradient-to-r from-[#fff6cf] to-[#fffaf0] px-2.5 shadow-sm transition hover:-translate-y-0.5"
        aria-label={dateLabel ? `MedSlime Pro，${dateLabel}` : "MedSlime Pro 已開通"}
        aria-expanded={open}
      >
        <span className="relative block h-[18px] w-[22px] shrink-0 rounded-[48%_48%_42%_42%/58%_58%_42%_42%] border border-[#c99a27] bg-gradient-to-b from-[#ffe889] to-[#f5bf35] shadow-[0_2px_5px_rgba(188,136,25,0.2)]">
          <span className="absolute left-[6px] top-[6px] h-[2px] w-[2px] rounded-full bg-[#694d16]" />
          <span className="absolute right-[6px] top-[6px] h-[2px] w-[2px] rounded-full bg-[#694d16]" />
          <span className="absolute bottom-[4px] left-1/2 h-[2px] w-[5px] -translate-x-1/2 rounded-b-full border-b border-[#694d16]" />
        </span>
        <span className="shrink-0 text-[11px] font-black tracking-[0.02em] text-[#94660f]">PRO</span>
        {dateLabel && (
          <span className="truncate text-[10px] font-black text-[#a47722]">{dateLabel}</span>
        )}
      </button>

      {open && dateLabel && (
        <div
          role="status"
          className="absolute left-0 top-[calc(100%+8px)] z-[90] whitespace-nowrap rounded-xl border border-[#efd78a] bg-[#fffdf5] px-3 py-2 text-xs font-black text-[#80651e] shadow-[0_10px_26px_rgba(93,71,20,0.12)]"
        >
          Pro 資格有效至 {dateLabel}
        </div>
      )}
    </div>
  );
}

function ResourcePill({
  label,
  href,
  ariaLabel,
}: {
  label: string;
  href?: string;
  ariaLabel?: string;
}) {
  const className =
    "flex min-h-10 w-full min-w-0 items-center justify-center rounded-md px-2 text-xs font-medium text-[var(--brand-text-secondary)] transition md:px-4 md:text-sm";

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        title="查看可購買資源"
        className={`${className} hover:bg-[#edf5ef]`}
      >
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <div className={className}>
      <span className="truncate">{label}</span>
    </div>
  );
}
