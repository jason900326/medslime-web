"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 6) {
      setError("密碼至少需要 6 個字元。");
      return;
    }

    if (password !== repeatPassword) {
      setError("兩次輸入的密碼不同。");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "更新密碼失敗，請重新開啟重設連結。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[30px] border border-[#dce9e1] bg-white p-7 text-[#17372a] shadow-[0_18px_44px_rgba(40,106,69,0.08)] md:p-8">
      <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
        NEW PASSWORD
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
        設定新密碼
      </h1>
      <p className="mt-2 text-sm font-bold leading-6 text-[#789083]">
        輸入新的 MedSlime 密碼，完成後會直接回到首頁。
      </p>

      <form onSubmit={handleUpdatePassword} className="mt-7 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black text-[#557768]">新密碼</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-bold text-[#17372a] outline-none transition focus:border-[#65d795]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[#557768]">再次輸入新密碼</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={repeatPassword}
            onChange={(event) => setRepeatPassword(event.target.value)}
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
          {isLoading ? "更新中..." : "儲存新密碼"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm font-bold text-[#789083]">
        <Link href="/auth/login" className="font-black text-[#2a9d5e] hover:underline">
          返回登入
        </Link>
      </div>
    </div>
  );
}
