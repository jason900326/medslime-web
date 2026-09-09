"use client";

import Link from "next/link";
import TopBar from "@/components/top-bar";
import InfoDialogButton from "@/components/info-dialog-button";
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
          <div className="text-xs font-black tracking-[0.12em] text-[#c58a2d]">MEDSLIME PRO</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            刷完題，不只是知道答案。
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#70877a] sm:text-base">
            MedSlime 的付費內容為線上學習會員服務與指定考卷的完整數位詳解。本站不販售金幣、抽卡券、AI 次數、點數或任何可儲值餘額。
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

        <section className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">FREE AI DETAIL</div>
              <h2 className="mt-1 text-xl font-black">免費 AI 即時詳解仍然保留</h2>
            </div>
            <InfoDialogButton title="每日 AI 詳解怎麼算？">
              <p>免費帳號每天可使用 5 次新的 AI 即時詳解。</p>
              <p>每日重新計算，未使用次數不累積，也不提供額外次數購買。</p>
              <p>如果該題已有共用詳解快取，會直接讀取既有內容，不需要重新生成。</p>
            </InfoDialogButton>
          </div>
          <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
            每日次數只是學習服務的使用上限，不是帳戶餘額。MedSlime 不提供 AI Credits、加值次數或預付額度。
          </p>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)] sm:p-6">
          <div className="font-black">🪙 金幣是學習獎勵，不是付費商品</div>
          <p className="mt-2 text-sm font-bold leading-7 text-[#789083]">
            MedSlime 金幣只能透過站內學習、任務、專注與成就取得，可用於史萊姆抽卡；無法以現金購買，也無法兌現、交易或轉讓。
          </p>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)] sm:p-6">
          <div className="font-black">付款與服務開通</div>
          <p className="mt-2 text-sm font-bold leading-7 text-[#789083]">
            金流開放後，付款只會對應 MedSlime Pro 會員服務或你指定購買的單份國考完整詳解；付款不會轉換成站內點數、錢包餘額或任何可再次消耗的儲值資產。
          </p>
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
  const isPro = product.kind === "pro_monthly";

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
          {isPro ? "MEMBERSHIP" : "ONE-TIME PURCHASE"}
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
            href="/study/exam"
            className="block w-full rounded-xl border border-[#cfe7d8] bg-[#eefaf2] px-4 py-3 text-center text-sm font-black text-[#237849] transition hover:-translate-y-0.5 hover:border-[#9ed8b5] hover:bg-[#e3f7eb]"
          >
            到國考題庫選擇考卷
          </Link>
        ) : !checkoutEnabled ? (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-[#e4e9e6] bg-[#eef2ef] px-4 py-3 text-sm font-black text-[#91a298]"
          >
            金流審核中
          </button>
        ) : isLoggedIn ? (
          <form action="/api/payments/ecpay/checkout" method="post">
            <input type="hidden" name="productId" value={product.id} />
            <button
              type="submit"
              className="w-full rounded-xl bg-[#31c978] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2dbc70]"
            >
              加入 MedSlime Pro
            </button>
          </form>
        ) : (
          <Link
            href={`/auth/login?redirect=${encodeURIComponent("/shop")}`}
            className="block w-full rounded-xl bg-[#31c978] px-4 py-3 text-center text-sm font-black text-white"
          >
            登入後加入 Pro
          </Link>
        )}
      </div>
    </article>
  );
}
