"use client";

import TopBar from "@/components/top-bar";
import LoginRequired from "@/components/login-required";
import { useAuthUser } from "@/hooks/use-auth-user";

export default function ShopPage() {
  const auth = useAuthUser();

  if (auth.loading) {
    return <main className="min-h-screen bg-[#f8fcf9]" />;
  }

  if (!auth.isLoggedIn) {
    return (
      <LoginRequired
        title="登入後查看資源"
        description="登入後才能查看你的金幣、抽卡券與之後開放的購買功能。"
        backHref="/"
        backLabel="返回首頁"
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-10 overflow-hidden rounded-[30px] border border-[#dce9e1] bg-white shadow-[0_18px_50px_rgba(30,78,50,0.07)]">
          <div className="bg-gradient-to-br from-[#fff7e8] via-white to-[#eefaf2] px-6 py-8 text-center sm:px-10 sm:py-10">
            <div className="text-sm font-black tracking-[0.12em] text-[#c58a2d]">
              BETA TEST
            </div>

            <div className="mx-auto mt-5 grid h-20 w-20 place-items-center rounded-full border border-[#f0d9a5] bg-white text-4xl shadow-sm">
              🛑
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              先不要花錢。
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm font-bold leading-7 text-[#70877a] sm:text-base">
              你現在是在幫 MedSlime 測試網站。商城與付款功能都還沒有正式開放，這個禮拜請把錢留著，拿測試資源放心玩就好。
            </p>
          </div>

          <div className="border-t border-[#e4eee8] px-6 py-6 sm:px-10">
            <div className="rounded-[20px] border border-[#dfece4] bg-[#f8fcf9] px-5 py-4 text-sm font-bold leading-6 text-[#557768]">
              之後正式版才會在這裡提供金幣、抽卡券與 AI 詳解額度等購買選項；目前沒有任何付款按鈕，也不會向你收費。
            </div>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-5 w-full rounded-2xl bg-[#31c978] px-5 py-3.5 font-black text-white transition hover:bg-[#2dbc70]"
            >
              好，我忍住
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
