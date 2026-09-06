"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/top-bar";
import LoginRequired from "@/components/login-required";
import { useAuthUser } from "@/hooks/use-auth-user";
import { SHOP_PRODUCTS } from "@/lib/shop-products";

const ecpayEnabled = process.env.NEXT_PUBLIC_ECPAY_ENABLED === "true";
const coinPackages = SHOP_PRODUCTS.filter((item) => item.kind === "coins");
const aiPackages = SHOP_PRODUCTS.filter((item) => item.kind === "ai_detail");

export default function ShopPage() {
  const auth = useAuthUser();
  const [aiCredits, setAiCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!auth.isLoggedIn) return;

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/entitlements", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "額度讀取失敗");
        if (!cancelled) setAiCredits(payload.aiDetailCredits ?? 0);
      } catch {
        if (!cancelled) setAiCredits(0);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth.isLoggedIn]);

  if (auth.loading) return <main className="min-h-screen bg-[#f8fcf9]" />;
  if (!auth.isLoggedIn) {
    return (
      <LoginRequired
        title="登入後才能儲值"
        description="金幣與 AI 詳解額度會綁定你的 MedSlime 帳號。"
        backHref="/"
        backLabel="返回首頁"
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-5 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-8 rounded-[28px] border border-[#dce9e1] bg-gradient-to-br from-[#fff7e8] via-white to-[#eefaf2] p-6 shadow-[0_16px_42px_rgba(30,78,50,0.06)] sm:p-8">
          <div className="text-xs font-black tracking-[0.12em] text-[#c58a2d]">
            RECHARGE
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            額度儲值
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-[#70877a] sm:text-base">
            需要更多抽卡資源或 AI 詳解時再買就好。正常學習與收集不會要求付費。
          </p>
        </section>

        <ShopSection
          eyebrow="COINS"
          title="金幣"
          description="100 金幣可抽 1 次。金幣也能透過每日任務、專注學習與成就免費取得。"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {coinPackages.map((item) => (
              <PackageCard key={item.id} {...item} icon="🪙" />
            ))}
          </div>
        </ShopSection>

        <ShopSection
          eyebrow="AI DETAIL"
          title="AI 詳解額度"
          description="用在需要深入理解的題目；快速 AI 解析與已存在的詳解快取不會重複扣額度。"
        >
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#dfece4] bg-[#f7fcf9] px-4 py-3">
            <div>
              <div className="text-xs font-black text-[#789083]">目前剩餘</div>
              <div className="mt-0.5 text-xl font-black text-[#237849]">
                {aiCredits === null ? "讀取中…" : `${aiCredits} 次`}
              </div>
            </div>
            <div className="text-2xl">🤖</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {aiPackages.map((item) => (
              <PackageCard key={item.id} {...item} icon="🤖" />
            ))}
          </div>
        </ShopSection>

        <section className="mt-5 rounded-[22px] border border-[#dce9e1] bg-white px-5 py-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
          <div className="font-black">付款方式</div>
          <p className="mt-2 text-sm font-bold leading-6 text-[#789083]">
            會導向綠界科技付款頁；付款完成後由 MedSlime 伺服器驗證並入帳，不以前端返回畫面作為發放依據。
          </p>
          <div className="mt-4 rounded-2xl border border-[#f0dfaa] bg-[#fff9e8] px-4 py-3 text-sm font-bold leading-6 text-[#80651e]">
            {ecpayEnabled
              ? "目前為綠界 Stage 測試串接，請只使用測試交易。"
              : "綠界環境變數尚未啟用，商品按鈕暫時鎖定。"}
          </div>
        </section>
      </div>
    </main>
  );
}

function ShopSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-[26px] border border-[#dce9e1] bg-white p-5 shadow-[0_10px_28px_rgba(31,83,53,0.045)] sm:p-6">
      <div className="text-[11px] font-black tracking-[0.12em] text-[#2ba962]">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-[#789083]">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PackageCard({
  id,
  icon,
  amount,
  price,
  note,
}: {
  id: string;
  icon: string;
  amount: number;
  price: number;
  note: string;
}) {
  return (
    <article className="flex min-h-[190px] flex-col rounded-[20px] border border-[#dfe9e3] bg-[#fbfefc] p-4">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-xl font-black">
        {amount.toLocaleString()}
        {id.startsWith("ai-") ? " 次" : ""}
      </div>
      <div className="mt-1 text-xs font-bold leading-5 text-[#8a9c92]">
        {note}
      </div>
      <div className="mt-auto pt-4 text-lg font-black">NT${price}</div>
      <form action="/api/payments/ecpay/checkout" method="post">
        <input type="hidden" name="productId" value={id} />
        <button
          type="submit"
          disabled={!ecpayEnabled}
          className={
            ecpayEnabled
              ? "mt-3 w-full rounded-xl bg-[#31c978] px-3 py-2.5 text-xs font-black text-white"
              : "mt-3 w-full cursor-not-allowed rounded-xl bg-[#e9f0ec] px-3 py-2.5 text-xs font-black text-[#91a298]"
          }
        >
          {ecpayEnabled ? "前往綠界付款" : "尚未啟用"}
        </button>
      </form>
    </article>
  );
}
