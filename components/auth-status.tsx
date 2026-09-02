"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthStatus() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? null);
      setLoading(false);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setLoading(false);
      router.refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    setEmail(null);
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="h-9 w-20 animate-pulse rounded-full bg-[#edf4ef]" />
    );
  }

  if (!email) {
    return (
      <Link
        href="/auth/login"
        className="rounded-full border border-[#dfece4] bg-white px-4 py-2 text-sm font-black text-[#315b45] shadow-sm transition hover:bg-[#f5faf7]"
      >
        登入
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="hidden max-w-[190px] truncate rounded-full border border-[#dfece4] bg-white px-4 py-2 text-sm font-black text-[#557768] shadow-sm sm:block"
        title={email}
      >
        {email}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-[#dfece4] bg-white px-4 py-2 text-sm font-black text-[#315b45] shadow-sm transition hover:bg-[#f5faf7]"
      >
        登出
      </button>
    </div>
  );
}
