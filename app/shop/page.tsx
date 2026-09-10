"use client";

import Link from "next/link";
import TopBar from "@/components/top-bar";
import InfoDialogButton from "@/components/info-dialog-button";
import ProPurchaseAction from "@/components/pro-purchase-action";
import { useAuthUser } from "@/hooks/use-auth-user";
import { SHOP_PRODUCTS, type ShopProduct } from "@/lib/shop-products";

const ecpayEnabled = process.env.NEXT_PUBLIC_ECPAY_ENABLED === "true";
const checkoutEnabled =
  ecpayEnabled && process.env.NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED === "true";

export default function ShopPage() {
  const auth = useAuthUser();

  if (auth.loading) return <main className="min-h-screen bg-[#f8fcf9]" />;

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-8 rounded-[28px] border border-[#dce9e1] bg-gradient-to-br from-[#fff7e8] via-white to-[#eefaf2] p-6 shadow-[0_16px_42px_rgba(30,78,50,0.06)] sm:p-8">
          <div className="text-xs font-black tracking-[0.12em] text-[#c58a2d]">
            MEDSLIME PRO
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            需要什麼，就買什麼。
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#70877a] sm:text-base">
            想追蹤整段備考表現，選 MedSlime Pro；只想把某一份國考徹底檢討完，單獨解鎖該份完整詳解即可。
          </p>
        </section>

        {!checkoutEnabled && (
          <section className="mt-5 rounded-[22px] border border-[#f0dfaa] bg-[#fff9e8] px-5 py-4 text-sm font-black leading-6 text-[#80651e]">
            🕒 目前金流重新審核中：可以查看方案內容與價格，但暫時無法付款。
          </section>
        )}

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          {SHOP_PRODUCTS.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isLoggedIn={auth.isLoggedIn}
            />
          ))}
        </section>

        <section className="mt-5 flex items-center justify-between gap-4 rounded-[22px] border border-[#e2ebe5] bg-white px-5 py-4 shadow-[0_6px_18px_rgba(31,83,53,0.035)]">
          <div>
            <div className="text-sm font-black text-[#315b45]">付款與虛擬獎勵說明</div>
            <div className="mt-1 text-xs font-bold text-[#8a9c92]">
              金幣、免費 AI 使用上限與付費服務的關係，可在這裡查看。
            </div>
          </div>
          <InfoDialogButton title="付款與虛擬獎勵說明" label="查看">
            <p>
              MedSlime 的付費商品為 30 天 Pro 學習服務，以及指定一份國考考卷的完整數位詳解。
            </p>
            <p>
              免費 AI 詳解的每日使用上限不可購買、加值、累積或轉讓。
            </p>
            <p>
              站內金幣只能透過學習、任務、專注與成就取得，不提供現金購買，也不能兌現、交易或轉讓。
            </p>
          </InfoDialogButton>
        </section>
      </div>
    </main>
  );
}

function ProductCard({
  product,
  isLoggedIn,
}: {
  product: ShopProduct;
  isLoggedIn: boolean;
}) {
  const isPro = product.kind === "pro_30d";

  return (
    <article
      className={[
        "relative flex h-full flex-col rounded-[26px] border p-5 shadow-[0_10px_28px_rgba(31,83,53,0.045)] sm:p-6",
        product.featured
          ? "border-[#bfe1cb] bg-gradient-to-br from-[#f1fbf5] via-white to-[#fff9ec]"
          : "border-[#dce9e1] bg-white",
      ].join(" ")}
    >
      {product.badge && (
        <div className="absolute right-5 top-5 rounded-full bg-[#fff0bd] px-3 py-1 text-xs font-black text-[#94660f]">
          {product.badge}
        </div>
      )}

      <div className="pr-24">
        <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
          {isPro ? "30-DAY ACCESS" : "ONE-TIME PURCHASE"}
        </div>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">{product.title}</h2>
      </div>

      <div className="mt-5 flex items-end gap-2">
        <span className="text-4xl font-black tracking-[-0.05em]">NT${product.price}</span>
        <span className="pb-1 text-sm font-black text-[#789083]">{product.priceSuffix}</span>
      </div>

      <p className="mt-2 text-sm font-black text-[#557768]">{product.note}</p>
      <p className="mt-3 text-sm font-bold leading-7 text-[#789083]">{product.description}</p>

      <ul className="mt-5 space-y-2.5 text-sm font-bold text-[#456b58]">
        {product.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="text-[#2ba962]">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        {product.kind === "exam_explanation" ? (
          <Link
            href="/study/exam?mode=explanation"
            className="block w-full rounded-xl border border-[#cfe7d8] bg-[#eefaf2] px-4 py-3 text-center text-sm font-black text-[#237849] transition hover:-translate-y-0.5 hover:border-[#9ed8b5] hover:bg-[#e3f7eb]"
          >
            選擇考卷 · NT$59／份
          </Link>
        ) : (
          <ProPurchaseAction isLoggedIn={isLoggedIn} />
        )}
      </div>
    </article>
  );
}
