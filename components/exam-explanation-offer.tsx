"use client";

import { useEffect, useState } from "react";

const ecpayEnabled = process.env.NEXT_PUBLIC_ECPAY_ENABLED === "true";
const checkoutEnabled =
  ecpayEnabled && process.env.NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED === "true";

type AccessState =
  | { status: "loading" }
  | { status: "ready"; purchased: boolean; purchasedAt: string | null }
  | { status: "error" };

export default function ExamExplanationOffer({
  year,
  session,
  subject,
  reviewCount,
}: {
  year: string;
  session: string;
  subject: string;
  reviewCount: number;
}) {
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  const [showPurchasedNotice, setShowPurchasedNotice] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAccess() {
      try {
        const params = new URLSearchParams({ year, session, subject });
        const response = await fetch(
          `/api/exam-explanation-access?${params.toString()}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error ?? "讀取權限失敗。");

        setAccess({
          status: "ready",
          purchased: Boolean(payload?.purchased),
          purchasedAt:
            typeof payload?.purchasedAt === "string" ? payload.purchasedAt : null,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAccess({ status: "error" });
      }
    }

    void loadAccess();
    return () => controller.abort();
  }, [year, session, subject]);

  const purchased = access.status === "ready" && access.purchased;

  useEffect(() => {
    if (!purchased) {
      setShowPurchasedNotice(false);
      return;
    }
    setShowPurchasedNotice(true);
    const timer = window.setTimeout(() => setShowPurchasedNotice(false), 4200);
    return () => window.clearTimeout(timer);
  }, [purchased, year, session, subject]);

  if (purchased) {
    if (!showPurchasedNotice) return null;
    return (
      <div
        role="status"
        className="mx-auto mt-5 max-w-3xl rounded-2xl border border-[#bfe1cb] bg-[#eefaf2] px-4 py-3 text-sm font-black leading-6 text-[#237849] shadow-[0_6px_18px_rgba(31,83,53,0.04)]"
      >
        ✓ 本卷詳解已解鎖，需要哪一題就直接展開查看。
      </div>
    );
  }

  return (
    <section className="mx-auto mt-7 max-w-3xl rounded-[24px] border border-[#bfe1cb] bg-gradient-to-br from-[#f1fbf5] via-white to-[#fff9ec] p-5 text-left shadow-[0_10px_28px_rgba(31,83,53,0.045)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-[#17372a]">解鎖這份考卷的詳解</h2>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-3xl font-black tracking-[-0.04em] text-[#17372a]">NT$59</div>
          <div className="text-xs font-black text-[#789083]">一次解鎖整份考卷</div>
        </div>
      </div>

      {access.status === "loading" ? (
        <div className="mt-4 rounded-xl border border-[#e4e9e6] bg-[#f7faf8] px-4 py-3 text-center text-sm font-black text-[#91a298]">
          正在確認詳解權限…
        </div>
      ) : checkoutEnabled ? (
        <form action="/api/payments/ecpay/checkout" method="post" className="mt-4">
          <input type="hidden" name="productId" value="exam-full-explanation" />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="session" value={session} />
          <input type="hidden" name="subject" value={subject} />
          <button
            type="submit"
            className="w-full rounded-xl bg-[#31c978] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#2dbc70]"
          >
            NT$59 解鎖這份考卷詳解
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-xl bg-[#31c978]/55 px-4 py-3.5 text-sm font-black text-white"
          >
            NT$59 解鎖這份考卷詳解
          </button>
          <div className="mt-2 text-center text-xs font-bold text-[#9a8a62]">目前金流審核中，通過後即可付款。</div>
        </>
      )}

      <p className="mt-4 text-sm font-bold leading-6 text-[#70877a]">
        這次有 {reviewCount} 題需要優先檢討。購買的是整份考卷的詳解權限，不是逐題購買；之後只在你真正需要的錯題上載入解析。
      </p>

      <div className="mt-3 rounded-2xl border border-[#dce9e1] bg-white/80 px-4 py-3 text-xs font-bold leading-5 text-[#668276]">
        {year} 年 · 第 {session} 次 · {subject}
      </div>
    </section>
  );
}
