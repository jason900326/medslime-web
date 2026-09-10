"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";

type PaymentState = {
  status: string;
  message: string;
  productId: string | null;
  entitlement: Record<string, unknown> | null;
};

export default function PaymentResultClient() {
  const searchParams = useSearchParams();
  const trade = searchParams.get("trade") ?? "";
  const [state, setState] = useState<PaymentState>({
    status: "checking",
    message: "正在確認綠界付款結果…",
    productId: null,
    entitlement: null,
  });

  useEffect(() => {
    if (!trade) {
      setState({
        status: "error",
        message: "找不到訂單編號。",
        productId: null,
        entitlement: null,
      });
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timeoutId: number | null = null;

    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/payments/order-status?trade=${encodeURIComponent(trade)}`,
          { cache: "no-store" },
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "查詢付款結果失敗。");
        }
        if (cancelled) return;

        const nextStatus = payload?.order?.status ?? "pending";
        const productId =
          typeof payload?.order?.product_id === "string"
            ? payload.order.product_id
            : null;
        const entitlement =
          payload?.entitlement && typeof payload.entitlement === "object"
            ? (payload.entitlement as Record<string, unknown>)
            : null;

        if (nextStatus === "paid") {
          setState({
            status: "paid",
            message: successMessage(productId, entitlement),
            productId,
            entitlement,
          });
          return;
        }

        if (nextStatus === "cancelled" || nextStatus === "refunded") {
          setState({
            status: nextStatus,
            message:
              nextStatus === "refunded"
                ? "這筆訂單目前已退款。"
                : "這筆訂單目前沒有完成付款。",
            productId,
            entitlement,
          });
          return;
        }

        if (attempts < 10) {
          setState({
            status: nextStatus,
            message: "綠界已返回頁面，正在等待伺服器付款通知…",
            productId,
            entitlement,
          });
          timeoutId = window.setTimeout(check, 1500);
        } else {
          setState({
            status: nextStatus,
            message:
              "付款結果仍在確認中。稍後回到商城重新查看即可，不需要重複付款。",
            productId,
            entitlement,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error ? error.message : "查詢付款結果失敗。",
            productId: null,
            entitlement: null,
          });
        }
      }
    };

    void check();

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [trade]);

  const primaryAction = useMemo(
    () => getPrimaryAction(state.productId, state.entitlement),
    [state.productId, state.entitlement],
  );

  const paid = state.status === "paid";
  const failed =
    state.status === "error" ||
    state.status === "cancelled" ||
    state.status === "refunded";

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-5 md:px-8 md:py-10">
        <TopBar showBack backHref="/shop" backLabel="返回商城" />
        <section className="mt-10 rounded-[28px] border border-[#dce9e1] bg-white p-6 text-center shadow-[0_16px_42px_rgba(30,78,50,0.06)] sm:p-8">
          <div className="text-5xl">{paid ? "✅" : failed ? "⚠️" : "⏳"}</div>
          <h1 className="mt-4 text-2xl font-black">
            {paid ? "付款完成" : failed ? "付款未完成" : "付款確認中"}
          </h1>
          <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
            {state.message}
          </p>

          {paid && state.productId === "pro-30d" && (
            <div className="mt-5 rounded-2xl border border-[#cfe7d8] bg-[#eefaf2] px-4 py-4 text-sm font-black text-[#237849]">
              MedSlime Pro 已立即生效。
            </div>
          )}

          {paid && state.productId === "exam-full-explanation" && (
            <div className="mt-5 rounded-2xl border border-[#cfe7d8] bg-[#eefaf2] px-4 py-4 text-left text-sm font-black leading-6 text-[#237849]">
              ✓ 這份考卷的詳解權限已永久解鎖。回到作答紀錄後，先看自己答錯或不確定的題目，需要哪題再展開哪題解析；系統不會一次產生整份考卷。
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-[#f7faf8] px-4 py-3 text-xs font-bold text-[#8a9c92]">
            訂單：{trade || "—"}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {paid && primaryAction ? (
              <Link
                href={primaryAction.href}
                className="rounded-xl bg-[#31c978] px-5 py-3 text-sm font-black text-white"
              >
                {primaryAction.label}
              </Link>
            ) : (
              <Link
                href="/shop"
                className="rounded-xl bg-[#31c978] px-5 py-3 text-sm font-black text-white"
              >
                返回商城
              </Link>
            )}

            <Link
              href="/"
              className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3 text-sm font-black text-[#315b45]"
            >
              回首頁
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function successMessage(
  productId: string | null,
  entitlement: Record<string, unknown> | null,
) {
  if (productId === "pro-30d") {
    const expiresAt =
      typeof entitlement?.proExpiresAt === "string"
        ? entitlement.proExpiresAt
        : null;
    return expiresAt
      ? `付款已確認，MedSlime Pro 已開通至 ${formatDate(expiresAt)}。`
      : "付款已確認，MedSlime Pro 已開通。";
  }

  if (productId === "exam-full-explanation") {
    return "付款已確認，指定國考的詳解權限已永久開通。";
  }

  return "付款已確認，購買的學習服務已開通。";
}

function getPrimaryAction(
  productId: string | null,
  entitlement: Record<string, unknown> | null,
) {
  if (productId === "pro-30d") {
    return { href: "/study/records", label: "查看 Pro 分析" };
  }

  if (productId === "exam-full-explanation") {
    const year = typeof entitlement?.year === "string" ? entitlement.year : "";
    const session =
      typeof entitlement?.session === "string" ? entitlement.session : "";
    const subject =
      typeof entitlement?.subject === "string" ? entitlement.subject : "";

    if (year && session && subject) {
      const params = new URLSearchParams({
        tab: "attempts",
        year,
        session,
        subject,
      });
      return {
        href: `/study/records?${params.toString()}`,
        label: "回顧這份考卷的錯題",
      };
    }

    return { href: "/study/records?tab=attempts", label: "前往作答紀錄" };
  }

  return null;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
