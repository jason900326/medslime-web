"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/game-state-provider";
import { useAuthUser } from "@/hooks/use-auth-user";

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
  const auth = useAuthUser();

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
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {!auth.loading && auth.isLoggedIn && (
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

        {!auth.loading && !auth.isLoggedIn && (
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
