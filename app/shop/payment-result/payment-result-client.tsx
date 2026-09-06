"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";

export default function PaymentResultClient() {
  const searchParams = useSearchParams();
  const trade = searchParams.get("trade") ?? "";
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("正在確認綠界付款結果…");

  useEffect(() => {
    if (!trade) {
      setStatus("error");
      setMessage("找不到訂單編號。");
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
        setStatus(nextStatus);

        if (nextStatus === "paid") {
          setMessage("付款已確認，資源已入帳。");
          return;
        }

        if (attempts < 10) {
          setMessage("綠界已返回頁面，正在等待伺服器付款通知…");
          timeoutId = window.setTimeout(check, 1500);
        } else {
          setMessage(
            "付款結果仍在確認中。稍後回到商城重新查看即可，不需要重複付款。",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            error instanceof Error ? error.message : "查詢付款結果失敗。",
          );
        }
      }
    };

    void check();

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [trade]);

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-5 md:px-8 md:py-10">
        <TopBar showBack backHref="/shop" backLabel="返回商城" />
        <section className="mt-10 rounded-[28px] border border-[#dce9e1] bg-white p-6 text-center shadow-[0_16px_42px_rgba(30,78,50,0.06)] sm:p-8">
          <div className="text-5xl">
            {status === "paid" ? "✅" : status === "error" ? "⚠️" : "⏳"}
          </div>
          <h1 className="mt-4 text-2xl font-black">
            {status === "paid" ? "付款完成" : "付款確認中"}
          </h1>
          <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
            {message}
          </p>
          <div className="mt-5 rounded-2xl bg-[#f7faf8] px-4 py-3 text-xs font-bold text-[#8a9c92]">
            訂單：{trade || "—"}
          </div>
        </section>
      </div>
    </main>
  );
}
