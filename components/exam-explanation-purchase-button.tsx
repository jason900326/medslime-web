"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const ecpayEnabled = process.env.NEXT_PUBLIC_ECPAY_ENABLED === "true";
const checkoutEnabled =
  ecpayEnabled && process.env.NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED === "true";

export default function ExamExplanationPurchaseButton({
  year,
  session,
  subject,
  compact = false,
}: {
  year: string;
  session: string;
  subject: string;
  compact?: boolean;
}) {
  const [purchased, setPurchased] = useState<boolean | null>(null);
  const baseClass = compact
    ? "rounded-xl px-4 py-2.5 text-sm font-black"
    : "w-full rounded-xl px-4 py-3 text-sm font-black";
  const explanationHref = useMemo(() => {
    const params = new URLSearchParams({ year, session, subject });
    return `/study/exam/explanation?${params.toString()}`;
  }, [year, session, subject]);

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
        setPurchased(Boolean(payload?.purchased));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPurchased(false);
      }
    }

    void loadAccess();
    return () => controller.abort();
  }, [year, session, subject]);

  if (purchased) {
    return (
      <Link
        href={explanationHref}
        className={`${baseClass} inline-flex items-center justify-center border border-[#31c978] bg-[#31c978] text-white transition hover:bg-[#2dbc70]`}
      >
        📚 查看完整詳解
      </Link>
    );
  }

  if (purchased === null) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClass} cursor-wait border border-[#e4e9e6] bg-[#f7faf8] text-[#91a298]`}
      >
        確認詳解權限中…
      </button>
    );
  }

  if (!checkoutEnabled) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClass} cursor-not-allowed border border-[#e4e9e6] bg-[#eef2ef] text-[#91a298]`}
      >
        NT$59 購買完整詳解
      </button>
    );
  }

  return (
    <form action="/api/payments/ecpay/checkout" method="post">
      <input type="hidden" name="productId" value="exam-full-explanation" />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="session" value={session} />
      <input type="hidden" name="subject" value={subject} />
      <button
        type="submit"
        className={`${baseClass} bg-[#17372a] text-white transition hover:bg-[#214b39]`}
      >
        NT$59 購買完整詳解
      </button>
    </form>
  );
}
