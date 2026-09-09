"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  const game = useGameState();
  const pro = useProStatus();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="relative z-50 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm font-bold text-[var(--brand-text-secondary)] transition hover:bg-[#f5faf7]"
          >
            ← {backLabel}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="relative z-50 border-0 bg-transparent p-0 text-2xl font-black tracking-[-0.04em] text-[var(--brand-text)] md:text-3xl"
          aria-label="回到 MedSlime 首頁"
        >
          MedSlime.
        </button>

        {!showBack && pro.isPro && <GoldenProBadge />}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {!pro.loading && pro.isLoggedIn && (
          <>
            <ResourcePill label={`🔥 ${game.streak} 天`} />
            <ResourcePill label={`🪙 ${game.coins}`} href="/shop" ariaLabel="前往資源頁" />
            <ResourcePill label={`🎫 ${game.tickets}`} href="/shop" ariaLabel="前往資源頁" />

            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-[var(--brand-border-soft)] bg-[var(--brand-surface)] px-3 py-2 text-xs font-black text-[var(--brand-text-secondary)] shadow-sm transition hover:bg-[#f5faf7] md:text-sm"
            >
              登出
            </button>
          </>
        )}

        {!pro.loading && !pro.isLoggedIn && (
          <Link
            href="/auth/login"
            className="rounded-full border border-[var(--brand-border-soft)] bg-[var(--brand-surface)] px-4 py-2 text-sm font-black text-[var(--brand-text-secondary)] shadow-sm transition hover:bg-[#f5faf7]"
          >
            登入
          </Link>
        )}
      </div>
    </header>
  );
}

function GoldenProBadge() {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-[#efd78a] bg-gradient-to-r from-[#fff6cf] to-[#fffaf0] px-2.5 py-1 shadow-sm"
      title="MedSlime Pro 已開通"
      aria-label="MedSlime Pro 已開通"
    >
      <span className="relative block h-[18px] w-[22px] shrink-0 rounded-[48%_48%_42%_42%/58%_58%_42%_42%] border border-[#c99a27] bg-gradient-to-b from-[#ffe889] to-[#f5bf35] shadow-[0_2px_5px_rgba(188,136,25,0.2)]">
        <span className="absolute left-[6px] top-[6px] h-[2px] w-[2px] rounded-full bg-[#694d16]" />
        <span className="absolute right-[6px] top-[6px] h-[2px] w-[2px] rounded-full bg-[#694d16]" />
        <span className="absolute bottom-[4px] left-1/2 h-[2px] w-[5px] -translate-x-1/2 rounded-b-full border-b border-[#694d16]" />
      </span>
      <span className="text-[11px] font-black tracking-[0.02em] text-[#94660f]">PRO</span>
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
    "rounded-full border border-[var(--brand-border-soft)] bg-[var(--brand-surface)] px-3 py-2 text-xs font-black text-[var(--brand-text)] shadow-sm transition md:px-4 md:text-sm";

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        title="查看可購買資源"
        className={`${className} hover:-translate-y-0.5 hover:bg-[#f5faf7]`}
      >
        {label}
      </Link>
    );
  }

  return <div className={className}>{label}</div>;
}
