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
  const baseClass = compact
    ? "rounded-xl px-4 py-2.5 text-sm font-black"
    : "w-full rounded-xl px-4 py-3 text-sm font-black";

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
