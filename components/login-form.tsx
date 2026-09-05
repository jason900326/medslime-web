"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function getSafeRedirect() {
  if (typeof window === "undefined") return "/";

  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect")?.trim() ?? "";

  if (!redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/";
  }

  return redirect;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email 或密碼錯誤。"
          : error.message,
      );
      setIsLoading(false);
      return;
    }

    // 這裡使用完整頁面導向，而不是只做 client-side push。
    // 可確保 Supabase 剛寫入的 session cookie 會立刻帶到下一個受保護頁面，
    // 避免從錯題庫被導到登入頁後又被判定成未登入。
    window.location.assign(getSafeRedirect());
  };

  return (
    <div className="w-full max-w-md rounded-[30px] border border-[#dce9e1] bg-white p-7 text-[#17372a] shadow-[0_18px_44px_rgba(40,106,69,0.08)] md:p-8">
      <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
        WELCOME BACK
      </div>

      <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
        登入 MedSlime
      </h1>

      <p className="mt-2 text-sm font-bold leading-6 text-[#789083]">
        登入後可以保存你的史萊姆、任務、成就與學習紀錄。
      </p>

      <form onSubmit={handleLogin} className="mt-7 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black text-[#557768]">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-bold text-[#17372a] outline-none transition focus:border-[#65d795]"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-black text-[#557768]">
              密碼
            </span>

            <Link
              href="/auth/forgot-password"
              className="text-xs font-black text-[#2a9d5e] hover:underline"
            >
              忘記密碼？
            </Link>
          </div>

          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-bold text-[#17372a] outline-none transition focus:border-[#65d795]"
          />
        </label>

        {error && (
          <div className="rounded-xl border border-[#f0dddd] bg-[#fff7f7] px-4 py-3 text-sm font-bold text-[#9b5050]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-[#31c978] px-5 py-4 font-black text-white transition hover:bg-[#2dbc70] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "登入中..." : "登入"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm font-bold text-[#789083]">
        還沒有帳號？{" "}
        <Link
          href="/auth/sign-up"
          className="font-black text-[#2a9d5e] hover:underline"
        >
          建立帳號
        </Link>
      </div>
    </div>
  );
}
