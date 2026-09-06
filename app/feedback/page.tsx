"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/top-bar";
import { useAuthUser } from "@/hooks/use-auth-user";

const categories = [
  "題目或答案問題",
  "AI 解析／AI 詳解問題",
  "登入／帳號問題",
  "付款／商城問題",
  "教材／PDF 問題",
  "抽卡／史萊姆問題",
  "網站錯誤／顯示異常",
  "功能建議",
  "其他",
] as const;

export default function FeedbackPage() {
  const auth = useAuthUser();
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>(categories[0]);
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (auth.email && !email) setEmail(auth.email);
    if (typeof window !== "undefined" && !pageUrl) setPageUrl(window.location.href);
  }, [auth.email, email, pageUrl]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category, description, pageUrl, website }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "回報送出失敗，請稍後再試。");

      setSuccess(true);
      setDescription("");
      setCategory(categories[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "回報送出失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-8 rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-[0_14px_36px_rgba(31,83,53,0.05)] sm:p-8">
          <div className="text-xs font-black tracking-[0.12em] text-[#2ba962]">FEEDBACK</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">回報問題</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-[#70877a] sm:text-base">
            發現錯題、AI 解析怪怪的、付款沒入帳或網站哪裡壞掉，都可以直接在這裡告訴我。
          </p>
        </section>

        <form onSubmit={submit} className="mt-5 space-y-5 rounded-[26px] border border-[#dfece4] bg-white p-5 shadow-[0_10px_28px_rgba(31,83,53,0.04)] sm:p-6">
          <div>
            <label htmlFor="feedback-email" className="text-sm font-black">你的 Email</label>
            <p className="mt-1 text-xs font-bold leading-5 text-[#8a9c92]">如果需要確認細節或回覆，我會透過這個信箱聯絡你。</p>
            <input
              id="feedback-email"
              type="email"
              required
              maxLength={200}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-3 w-full rounded-2xl border border-[#d7e7de] bg-white px-4 py-3 text-base font-bold outline-none transition focus:border-[#75d79d] focus:ring-2 focus:ring-[#dff7e8]"
            />
          </div>

          <div>
            <label htmlFor="feedback-category" className="text-sm font-black">問題類型</label>
            <select
              id="feedback-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
              className="mt-3 w-full rounded-2xl border border-[#d7e7de] bg-white px-4 py-3 text-base font-bold outline-none transition focus:border-[#75d79d] focus:ring-2 focus:ring-[#dff7e8]"
            >
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="feedback-description" className="text-sm font-black">問題描述</label>
            <p className="mt-1 text-xs font-bold leading-5 text-[#8a9c92]">如果可以，請寫下你在哪個頁面、做了什麼、原本預期什麼結果。</p>
            <textarea
              id="feedback-description"
              required
              minLength={5}
              maxLength={4000}
              rows={8}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="例如：我在錯題庫按 AI 詳解後……"
              className="mt-3 w-full resize-y rounded-2xl border border-[#d7e7de] bg-white px-4 py-3 text-base font-bold leading-7 outline-none transition focus:border-[#75d79d] focus:ring-2 focus:ring-[#dff7e8]"
            />
            <div className="mt-1 text-right text-xs font-bold text-[#9aa9a1]">{description.length} / 4000</div>
          </div>

          <div>
            <label htmlFor="feedback-page" className="text-sm font-black">相關頁面網址（選填）</label>
            <input
              id="feedback-page"
              type="text"
              maxLength={1000}
              value={pageUrl}
              onChange={(event) => setPageUrl(event.target.value)}
              placeholder="https://medslime.vercel.app/..."
              className="mt-3 w-full rounded-2xl border border-[#d7e7de] bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-[#75d79d] focus:ring-2 focus:ring-[#dff7e8]"
            />
          </div>

          <div className="hidden" aria-hidden="true">
            <label htmlFor="feedback-website">Website</label>
            <input id="feedback-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </div>

          {success && (
            <div className="rounded-2xl border border-[#bfe7ce] bg-[#f0fbf4] px-4 py-3 text-sm font-black leading-6 text-[#237849]">
              ✓ 已收到你的回報，謝謝！如果需要更多資訊，我會用你留下的 Email 聯絡。
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-[#f0cccc] bg-[#fff6f6] px-4 py-3 text-sm font-black leading-6 text-[#9a4c4c]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-[#31c978] px-5 py-4 text-base font-black text-white transition hover:bg-[#2dbc70] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "送出中…" : "送出回報"}
          </button>
        </form>

        <div className="mt-5 text-center text-xs font-bold leading-6 text-[#8a9c92]">
          也可以直接寄信至 <span className="font-black text-[#557768]">jasonwannaretire@gmail.com</span>
          <br />
          <Link href="/privacy" className="font-black text-[#2a9d5e] underline underline-offset-4">查看隱私權政策</Link>
        </div>
      </div>
    </main>
  );
}
