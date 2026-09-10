"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const ecpayEnabled = process.env.NEXT_PUBLIC_ECPAY_ENABLED === "true";
const checkoutEnabled =
  ecpayEnabled && process.env.NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED === "true";

type EntitlementState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      isPro: boolean;
      proExpiresAt: string | null;
    }
  | { status: "error" };

export default function ProPurchaseAction({
  isLoggedIn,
}: {
  isLoggedIn: boolean;
}) {
  const [state, setState] = useState<EntitlementState>({ status: "idle" });

  useEffect(() => {
    if (!isLoggedIn) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    void (async () => {
      try {
        const response = await fetch("/api/entitlements", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error ?? "讀取 Pro 狀態失敗。");

        setState({
          status: "ready",
          isPro: Boolean(payload?.isPro),
          proExpiresAt:
            typeof payload?.proExpiresAt === "string" ? payload.proExpiresAt : null,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error" });
      }
    })();

    return () => controller.abort();
  }, [isLoggedIn]);

  const remainingDays = useMemo(() => {
    if (state.status !== "ready" || !state.proExpiresAt) return null;
    const expiresAt = new Date(state.proExpiresAt).getTime();
    if (!Number.isFinite(expiresAt)) return null;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000));
  }, [state]);

  if (!isLoggedIn) {
    return (
      <Link
        href={`/auth/login?redirect=${encodeURIComponent("/shop")}`}
        className="block w-full rounded-xl bg-[#31c978] px-4 py-3 text-center text-sm font-black text-white"
      >
        登入後開通 Pro
      </Link>
    );
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-wait rounded-xl border border-[#e4e9e6] bg-[#f7faf8] px-4 py-3 text-sm font-black text-[#91a298]"
      >
        正在確認 Pro 狀態…
      </button>
    );
  }

  const active = state.status === "ready" && state.isPro;
  const expired =
    state.status === "ready" &&
    !state.isPro &&
    Boolean(state.proExpiresAt) &&
    new Date(state.proExpiresAt as string).getTime() <= Date.now();

  return (
    <div className="space-y-3">
      {active && state.status === "ready" && state.proExpiresAt && (
        <div className="rounded-2xl border border-[#bfe1cb] bg-[#eefaf2] px-4 py-3 text-sm font-black leading-6 text-[#237849]">
          ✓ Pro 使用中
          <div className="mt-1 text-xs font-bold text-[#557768]">
            {remainingDays !== null ? `剩餘約 ${remainingDays} 天 · ` : ""}
            到期日 {formatExpiry(state.proExpiresAt)}
          </div>
        </div>
      )}

      {expired && state.status === "ready" && state.proExpiresAt && (
        <div className="rounded-2xl border border-[#eadfc5] bg-[#fffaf0] px-4 py-3 text-xs font-bold leading-5 text-[#8b7442]">
          你先前的 Pro 已於 {formatExpiry(state.proExpiresAt)} 到期。
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-2xl border border-[#ead8d8] bg-[#fff8f8] px-4 py-3 text-xs font-bold leading-5 text-[#9b5050]">
          Pro 狀態暫時無法確認；請重新整理後再試，避免重複付款。
        </div>
      )}

      {!checkoutEnabled ? (
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-xl border border-[#e4e9e6] bg-[#eef2ef] px-4 py-3 text-sm font-black text-[#91a298]"
        >
          {active ? "金流審核中，暫時無法延長" : "金流審核中"}
        </button>
      ) : state.status === "error" ? (
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-xl border border-[#e4e9e6] bg-[#eef2ef] px-4 py-3 text-sm font-black text-[#91a298]"
        >
          請先確認 Pro 狀態
        </button>
      ) : (
        <form action="/api/payments/ecpay/checkout" method="post">
          <input type="hidden" name="productId" value="pro-30d" />
          <button
            type="submit"
            className="w-full rounded-xl bg-[#31c978] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2dbc70]"
          >
            {active ? "延長 30 天 Pro" : "開通 30 天 Pro"}
          </button>
        </form>
      )}

      {active && (
        <div className="text-center text-[11px] font-bold leading-5 text-[#8a9c92]">
          再次購買會從目前到期日再延長 30 天，不會覆蓋剩餘天數。
        </div>
      )}
    </div>
  );
}

function formatExpiry(value: string) {
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
