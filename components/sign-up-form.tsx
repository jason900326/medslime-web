"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSignupTrialCampaignOpen } from "@/lib/campaign";

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const campaignActive = isSignupTrialCampaignOpen();

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setError(`Google 註冊失敗：${error.message}`);
      setGoogleLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
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

    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    router.push("/auth/sign-up-success");
  };

  return (
    <div className="w-full max-w-md rounded-[30px] border border-[#dce9e1] bg-white p-7 text-[#17372a] shadow-[0_18px_44px_rgba(40,106,69,0.08)] md:p-8">
      <h1 className="text-3xl font-black tracking-[-0.04em]">
        建立 MedSlime 帳號
      </h1>

      <p className="mt-2 text-sm font-bold leading-6 text-[#789083]">
        {campaignActive
          ? "9/12–9/25 活動期間註冊，可免費使用 MedSlime Pro 14 天，不綁信用卡，另外送 10 張抽卡券。"
          : "建立帳號後，史萊姆收藏、學習紀錄與任務進度都會跟著你保存。"}
      </p>

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={googleLoading || isLoading}
        className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d7e7de] bg-white px-5 py-3.5 font-black text-[#315b45] transition hover:bg-[#f7fbf8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#dfe8e2] bg-white text-sm font-black text-[#4285f4]">
          G
        </span>
        {googleLoading ? "正在前往 Google..." : "使用 Google 繼續"}
      </button>

      <div className="my-5 flex items-center gap-3 text-xs font-black text-[#9aaba1]">
        <div className="h-px flex-1 bg-[#e5ece8]" />
        或使用 Email
        <div className="h-px flex-1 bg-[#e5ece8]" />
      </div>

      <form onSubmit={handleSignUp} className="space-y-5">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
        />

        <Field
          label="密碼"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />

        <Field
          label="再次輸入密碼"
          type="password"
          autoComplete="new-password"
          value={repeatPassword}
          onChange={setRepeatPassword}
        />

        {error && (
          <div className="rounded-xl border border-[#f0dddd] bg-[#fff7f7] px-4 py-3 text-sm font-bold text-[#9b5050]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || googleLoading}
          className="w-full rounded-2xl bg-[#31c978] px-5 py-4 font-black text-white transition hover:bg-[#2dbc70] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? "建立帳號中..."
            : campaignActive
              ? "建立帳號 · 免費試用 14 天"
              : "建立帳號"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm font-bold text-[#789083]">
        已經有帳號？{" "}
        <Link
          href="/auth/login"
          className="font-black text-[#2a9d5e] hover:underline"
        >
          登入
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  autoComplete,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#557768]">
        {label}
      </span>

      <input
        type={type}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-bold text-[#17372a] outline-none transition focus:border-[#65d795]"
      />
    </label>
  );
}
