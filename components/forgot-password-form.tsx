"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "寄送重設信失敗，請稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[30px] border border-[#dce9e1] bg-white p-7 text-[#17372a] shadow-[0_18px_44px_rgba(40,106,69,0.08)] md:p-8">
      {success ? (
        <>
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            EMAIL SENT
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            去信箱看看。
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[#789083]">
            如果這個 Email 是用 Email＋密碼建立的 MedSlime 帳號，我們已寄出重設密碼連結。
          </p>
          <Link
            href="/auth/login"
            className="mt-7 block w-full rounded-2xl bg-[#31c978] px-5 py-4 text-center font-black text-white transition hover:bg-[#2dbc70]"
          >
            返回登入
          </Link>
        </>
      ) : (
        <>
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            RESET PASSWORD
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            忘記密碼了？
          </h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#789083]">
            輸入註冊 Email，我們會寄一封重設密碼信給你。
          </p>

          <form onSubmit={handleForgotPassword} className="mt-7 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-[#557768]">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
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
              {isLoading ? "寄送中..." : "寄送重設密碼信"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm font-bold text-[#789083]">
            想起密碼了？{" "}
            <Link href="/auth/login" className="font-black text-[#2a9d5e] hover:underline">
              返回登入
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
