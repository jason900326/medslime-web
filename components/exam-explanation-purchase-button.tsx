"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCachedExamExplanationAccess,
  loadExamExplanationAccessKeys,
} from "@/lib/exam-explanation-access-cache";

const ecpayEnabled = process.env.NEXT_PUBLIC_ECPAY_ENABLED === "true";
const checkoutEnabled =
  ecpayEnabled && process.env.NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED === "true";

export default function ExamExplanationPurchaseButton({
  year,
  session,
  subject,
  compact = false,
  knownPurchased,
}: {
  year: string;
  session: string;
  subject: string;
  compact?: boolean;
  knownPurchased?: boolean;
}) {
  const examKey = useMemo(() => `${year}-${session}-${subject}`, [year, session, subject]);
  const [purchased, setPurchased] = useState<boolean | null>(() =>
    typeof knownPurchased === "boolean"
      ? knownPurchased
      : getCachedExamExplanationAccess(examKey),
  );
  const baseClass = compact
    ? "rounded-xl px-4 py-2.5 text-sm font-black"
    : "w-full rounded-xl px-4 py-3 text-sm font-black";

  useEffect(() => {
    if (typeof knownPurchased === "boolean") {
      setPurchased(knownPurchased);
      return;
    }

    const cached = getCachedExamExplanationAccess(examKey);
    if (cached !== null) {
      setPurchased(cached);
      return;
    }

    let cancelled = false;
    void loadExamExplanationAccessKeys()
      .then((keys) => {
        if (!cancelled) setPurchased(keys.has(examKey));
      })
      .catch(() => {
        if (!cancelled) setPurchased(false);
      });

    return () => {
      cancelled = true;
    };
  }, [examKey, knownPurchased]);

  if (purchased) {
    return (
      <span
        className={`${baseClass} inline-flex cursor-default items-center justify-center border border-[#bfe1cb] bg-[#eaf9f0] text-[#237849]`}
      >
        ✓ 詳解權限已解鎖
      </span>
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
        NT$59 解鎖考卷詳解
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
        NT$59 解鎖考卷詳解
      </button>
    </form>
  );
}
