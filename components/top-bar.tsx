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
    <header className="relative z-50 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-bold text-[#315b45] transition hover:bg-[#f5faf7]"
          >
            ← {backLabel}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="relative z-50 border-0 bg-transparent p-0 text-3xl font-black tracking-[-0.04em] text-[#17372a]"
          aria-label="回到 MedSlime 首頁"
        >
          MedSlime.
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {!auth.loading && auth.isLoggedIn && (
          <>
            <ResourcePill label={`🔥 ${game.streak} 天`} />
            <ResourcePill label={`🪙 ${game.coins}`} />
            <ResourcePill label={`🎫 ${game.tickets}`} />
          </>
        )}

        {!auth.loading &&
          (auth.isLoggedIn ? (
            <>
              <div
                className="hidden max-w-[190px] truncate rounded-full border border-[#dfece4] bg-white px-4 py-2 text-sm font-black text-[#557768] shadow-sm sm:block"
                title={auth.email ?? ""}
              >
                {auth.email}
              </div>

              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-[#dfece4] bg-white px-4 py-2 text-sm font-black text-[#315b45] shadow-sm transition hover:bg-[#f5faf7]"
              >
                登出
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-full border border-[#dfece4] bg-white px-4 py-2 text-sm font-black text-[#315b45] shadow-sm transition hover:bg-[#f5faf7]"
            >
              登入
            </Link>
          ))}
      </div>
    </header>
  );
}

function ResourcePill({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-[#dfece4] bg-white px-4 py-2 text-sm font-black text-[#17372a] shadow-sm">
      {label}
    </div>
  );
}
