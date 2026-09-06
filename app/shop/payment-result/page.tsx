import { Suspense } from "react";
import PaymentResultClient from "./payment-result-client";

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<PaymentResultLoading />}>
      <PaymentResultClient />
    </Suspense>
  );
}

function PaymentResultLoading() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-5">
        <div className="text-center">
          <div className="text-4xl">⏳</div>
          <div className="mt-3 font-black">正在準備付款結果…</div>
        </div>
      </div>
    </main>
  );
}
