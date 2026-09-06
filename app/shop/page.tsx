"use client";

import TopBar from "@/components/top-bar";
import LoginRequired from "@/components/login-required";
import { useAuthUser } from "@/hooks/use-auth-user";

const COIN_PACKAGES = [
  { id: "coins-300", amount: "300", price: 30, note: "約 3 抽" },
  { id: "coins-700", amount: "700", price: 60, note: "約 7 抽" },
  { id: "coins-1500", amount: "1,500", price: 120, note: "約 15 抽" },
  { id: "coins-3300", amount: "3,300", price: 240, note: "約 33 抽" },
];

const AI_PACKAGES = [
  { id: "ai-30", amount: "30 次", price: 30, note: "適合偶爾深挖錯題" },
  { id: "ai-80", amount: "80 次", price: 60, note: "刷題期間比較夠用" },
  { id: "ai-200", amount: "200 次", price: 120, note: "大量題目檢討" },
];

export default function ShopPage() {
  const auth = useAuthUser();

  if (auth.loading) {
    return <main className="min-h-screen bg-[#f8fcf9]" />;
  }

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
            {COIN_PACKAGES.map((item) => (
              <PackageCard
                key={item.id}
                icon="🪙"
                amount={item.amount}
                price={item.price}
                note={item.note}
              />
            ))}
          </div>
        </ShopSection>

        <ShopSection
          eyebrow="AI DETAIL"
          title="AI 詳解額度"
          description="用在需要深入理解的題目；快速 AI 解析與國考既有快取不會在這裡重複收費。"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {AI_PACKAGES.map((item) => (
              <PackageCard
                key={item.id}
                icon="🤖"
                amount={item.amount}
                price={item.price}
                note={item.note}
              />
            ))}
          </div>
        </ShopSection>

        <section className="mt-5 rounded-[22px] border border-[#dce9e1] bg-white px-5 py-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
          <div className="font-black">付款方式</div>
          <p className="mt-2 text-sm font-bold leading-6 text-[#789083]">
            正式付款會導向綠界科技付款頁面，付款完成後再由 MedSlime 伺服器確認結果並發放資源。
          </p>
          <div className="mt-4 rounded-2xl border border-[#f0dfaa] bg-[#fff9e8] px-4 py-3 text-sm font-bold leading-6 text-[#80651e]">
            綠界正式金流尚未啟用，因此目前商品按鈕先鎖定，不會產生任何扣款。
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
  icon,
  amount,
  price,
  note,
}: {
  icon: string;
  amount: string;
  price: number;
  note: string;
}) {
  return (
    <article className="flex min-h-[190px] flex-col rounded-[20px] border border-[#dfe9e3] bg-[#fbfefc] p-4">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-xl font-black">{amount}</div>
      <div className="mt-1 text-xs font-bold leading-5 text-[#8a9c92]">{note}</div>
      <div className="mt-auto pt-4 text-lg font-black">NT${price}</div>
      <button
        type="button"
        disabled
        className="mt-3 w-full cursor-not-allowed rounded-xl bg-[#e9f0ec] px-3 py-2.5 text-xs font-black text-[#91a298]"
      >
        綠界串接後啟用
      </button>
    </article>
  );
}
