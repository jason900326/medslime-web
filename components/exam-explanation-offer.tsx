const ecpayEnabled = process.env.NEXT_PUBLIC_ECPAY_ENABLED === "true";
const checkoutEnabled =
  ecpayEnabled && process.env.NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED === "true";

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
  return (
    <section className="mx-auto mt-7 max-w-3xl rounded-[24px] border border-[#bfe1cb] bg-gradient-to-br from-[#f1fbf5] via-white to-[#fff9ec] p-5 text-left shadow-[0_10px_28px_rgba(31,83,53,0.045)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            FULL EXPLANATION
          </div>
          <h2 className="mt-1 text-xl font-black text-[#17372a]">
            解鎖這份考卷的完整詳解
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            你這次有 {reviewCount} 題需要優先檢討。解鎖後可永久查看這份考卷全部題目的完整解析，不必逐題消耗每日 5 次額度。
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-3xl font-black tracking-[-0.04em] text-[#17372a]">NT$59</div>
          <div className="text-xs font-black text-[#789083]">一次付款 · 永久存取</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#dce9e1] bg-white/80 px-4 py-3 text-xs font-bold leading-5 text-[#668276]">
        民國 {year} 年 · 第 {session} 次 · {subject}
      </div>

      {!checkoutEnabled ? (
        <button
          type="button"
          disabled
          className="mt-4 w-full cursor-not-allowed rounded-xl border border-[#e4e9e6] bg-[#eef2ef] px-4 py-3 text-sm font-black text-[#91a298]"
        >
          金流審核中 · NT$59 解鎖
        </button>
      ) : (
        <form action="/api/payments/ecpay/checkout" method="post" className="mt-4">
          <input type="hidden" name="productId" value="exam-full-explanation" />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="session" value={session} />
          <input type="hidden" name="subject" value={subject} />
          <button
            type="submit"
            className="w-full rounded-xl bg-[#31c978] px-4 py-3 text-sm font-black text-white transition hover:bg-[#2dbc70]"
          >
            NT$59 解鎖這份完整詳解
          </button>
        </form>
      )}
    </section>
  );
}
