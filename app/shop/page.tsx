"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/top-bar";
import { useAuthUser } from "@/hooks/use-auth-user";
import { SHOP_PRODUCTS, type ShopProduct } from "@/lib/shop-products";

const ecpayEnabled = process.env.NEXT_PUBLIC_ECPAY_ENABLED === "true";
const checkoutEnabled =
  ecpayEnabled && process.env.NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED === "true";
const coinPackages = SHOP_PRODUCTS.filter((item) => item.kind === "coins");
const aiPackages = SHOP_PRODUCTS.filter((item) => item.kind === "ai_detail");

type AiBalance = {
  total: number;
  free: number;
  paid: number;
  freeLimit: number;
};

export default function ShopPage() {
  const auth = useAuthUser();
  const [aiBalance, setAiBalance] = useState<AiBalance | null>(null);

  useEffect(() => {
    if (!auth.isLoggedIn) return;

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/entitlements", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "額度讀取失敗");
        if (!cancelled) {
          setAiBalance({
            total: Math.max(0, Number(payload.aiDetailCredits ?? 0)),
            free: Math.max(0, Number(payload.aiDetailFreeRemaining ?? 0)),
            paid: Math.max(0, Number(payload.aiDetailPaidCredits ?? 0)),
            freeLimit: Math.max(0, Number(payload.aiDetailFreeDailyLimit ?? 10)),
          });
        }
      } catch {
        if (!cancelled) setAiBalance({ total: 0, free: 0, paid: 0, freeLimit: 10 });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth.isLoggedIn]);

  if (auth.loading) return <main className="min-h-screen bg-[#f8fcf9]" />;

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-8 rounded-[28px] border border-[#dce9e1] bg-gradient-to-br from-[#fff7e8] via-white to-[#eefaf2] p-6 shadow-[0_16px_42px_rgba(30,78,50,0.06)] sm:p-8">
          <div className="text-xs font-black tracking-[0.12em] text-[#c58a2d]">SHOP</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">MedSlime 商城</h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-[#70877a] sm:text-base">
            商城販售虛擬金幣與 AI 詳解使用額度。商品內容與價格公開展示，付款功能會在金流審核完成後開放。
          </p>
        </section>

        {!checkoutEnabled && (
          <section className="mt-5 rounded-[22px] border border-[#f0dfaa] bg-[#fff9e8] px-5 py-4 text-sm font-black leading-6 text-[#80651e]">
            🕒 目前金流審核中：可以查看所有商品與價格，但暫時無法付款。
          </section>
        )}

        <ShopSection
          eyebrow="COINS"
          title="金幣"
          description="100 金幣可抽 1 次。金幣也能透過每日任務、專注學習與成就免費取得。"
        >
          <PackageGrid
            products={coinPackages}
            icon="🪙"
            isLoggedIn={auth.isLoggedIn}
          />
        </ShopSection>

        <ShopSection
          eyebrow="AI DETAIL"
          title="AI 詳解額度"
          description="每個帳號每天有 10 次免費的新詳解；免費次數用完後才會使用購買額度。已存在的詳解快取不會扣任何次數。"
        >
          {auth.isLoggedIn ? (
            <div className="mb-5 rounded-2xl border border-[#dfece4] bg-[#f7fcf9] px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black text-[#789083]">目前可用</div>
                  <div className="mt-0.5 text-2xl font-black text-[#237849]">
                    {aiBalance === null ? "讀取中…" : `${aiBalance.total} 次`}
                  </div>
                </div>
                <div className="text-3xl">🤖</div>
              </div>

              {aiBalance && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
                  <div className="rounded-xl bg-white px-3 py-2.5 text-[#557768]">
                    今日免費 <span className="text-[#237849]">{aiBalance.free} / {aiBalance.freeLimit}</span>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2.5 text-[#557768]">
                    購買額度 <span className="text-[#237849]">{aiBalance.paid}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-5 rounded-2xl border border-[#dfece4] bg-[#f7fcf9] px-4 py-4 text-sm font-bold leading-6 text-[#668276]">
              登入後可查看你的每日免費次數與已購買 AI 詳解額度。
            </div>
          )}

          <PackageGrid
            products={aiPackages}
            icon="🤖"
            isLoggedIn={auth.isLoggedIn}
          />
        </ShopSection>

        <section className="mt-5 rounded-[22px] border border-[#dce9e1] bg-white px-5 py-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
          <div className="font-black">付款與入帳</div>
          <p className="mt-2 text-sm font-bold leading-6 text-[#789083]">
            金流開放後，點選商品價格會前往綠界科技付款頁；付款完成後由 MedSlime 伺服器驗證交易並自動將商品入帳至登入帳號。
          </p>
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
      <div className="text-[11px] font-black tracking-[0.12em] text-[#2ba962]">{eyebrow}</div>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-[#789083]">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PackageGrid({
  products,
  icon,
  isLoggedIn,
}: {
  products: ShopProduct[];
  icon: string;
  isLoggedIn: boolean;
}) {
  const baseline = useMemo(() => {
    if (products.length === 0) return 0;
    return Math.min(...products.map((item) => item.amount / item.price));
  }, [products]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((item) => {
        const valuePerDollar = item.amount / item.price;
        const bonusPercent = baseline > 0
          ? Math.max(0, Math.round((valuePerDollar / baseline - 1) * 100))
          : 0;

        return (
          <PackageCard
            key={item.id}
            {...item}
            icon={icon}
            bonusPercent={bonusPercent}
            isLoggedIn={isLoggedIn}
          />
        );
      })}
    </div>
  );
}

function PackageCard({
  id,
  icon,
  amount,
  price,
  note,
  bonusPercent,
  isLoggedIn,
}: ShopProduct & {
  icon: string;
  bonusPercent: number;
  isLoggedIn: boolean;
}) {
  const isAi = id.startsWith("ai-");
  const isBestValue = bonusPercent >= 50 || id === "coins-3300";

  return (
    <article className="relative flex min-h-[220px] flex-col rounded-[22px] border border-[#dfe9e3] bg-[#fbfefc] px-4 pb-4 pt-5 shadow-[0_6px_18px_rgba(31,83,53,0.035)]">
      <div className="absolute right-3 top-3">
        <span
          className={[
            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-black",
            bonusPercent > 0
              ? isBestValue
                ? "bg-[#fff1c9] text-[#9a6a12]"
                : "bg-[#eef8f2] text-[#2b8250]"
              : "bg-[#f0f3f1] text-[#819187]",
          ].join(" ")}
        >
          {bonusPercent > 0 ? `+${bonusPercent}%` : "基準"}
        </span>
      </div>

      <div className="text-3xl">{icon}</div>
      <div className="mt-3 text-2xl font-black tracking-[-0.03em]">
        {amount.toLocaleString()}
        {isAi ? " 次" : ""}
      </div>
      <div className="mt-1 text-xs font-bold leading-5 text-[#8a9c92]">{note}</div>

      <div className="mt-auto pt-5">
        {bonusPercent > 0 && (
          <div className="mb-2 text-center text-[11px] font-black text-[#789083]">
            相較基準方案多 {bonusPercent}% 價值
          </div>
        )}

        {!checkoutEnabled ? (
          <>
            <div className="mb-2 text-center text-lg font-black text-[#17372a]">
              NT${price.toLocaleString()}
            </div>
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-[#e4e9e6] bg-[#eef2ef] px-3 py-3 text-sm font-black text-[#91a298]"
            >
              金流審核中
            </button>
          </>
        ) : isLoggedIn ? (
          <form action="/api/payments/ecpay/checkout" method="post">
            <input type="hidden" name="productId" value={id} />
            <button
              type="submit"
              className="w-full rounded-xl border border-[#cfe7d8] bg-[#eefaf2] px-3 py-3 text-base font-black text-[#237849] transition hover:-translate-y-0.5 hover:border-[#9ed8b5] hover:bg-[#e3f7eb]"
            >
              NT${price.toLocaleString()}
            </button>
          </form>
        ) : (
          <Link
            href={`/auth/login?redirect=${encodeURIComponent("/shop")}`}
            className="block w-full rounded-xl border border-[#cfe7d8] bg-[#eefaf2] px-3 py-3 text-center text-sm font-black text-[#237849]"
          >
            登入後購買 · NT${price.toLocaleString()}
          </Link>
        )}
      </div>
    </article>
  );
}
