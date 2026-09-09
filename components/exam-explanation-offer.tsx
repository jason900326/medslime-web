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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            FULL EXPLANATION
          </div>
          <h2 className="mt-1 text-xl font-black text-[#17372a]">
            購買這份考卷的完整詳解
          </h2>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-3xl font-black tracking-[-0.04em] text-[#17372a]">NT$59</div>
          <div className="text-xs font-black text-[#789083]">永久存取</div>
        </div>
      </div>

      {checkoutEnabled ? (
        <form action="/api/payments/ecpay/checkout" method="post" className="mt-4">
          <input type="hidden" name="productId" value="exam-full-explanation" />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="session" value={session} />
          <input type="hidden" name="subject" value={subject} />
          <button
            type="submit"
            className="w-full rounded-xl bg-[#31c978] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#2dbc70]"
          >
            NT$59 購買這份完整詳解
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-xl bg-[#31c978]/55 px-4 py-3.5 text-sm font-black text-white"
          >
            NT$59 購買這份完整詳解
          </button>
          <div className="mt-2 text-center text-xs font-bold text-[#9a8a62]">
            目前金流審核中，通過後即可付款。
          </div>
        </>
      )}

      <p className="mt-4 text-sm font-bold leading-6 text-[#70877a]">
        購買後可永久查看這份考卷全部題目的完整解析。你這次有 {reviewCount} 題需要優先檢討，會先從這些題目開始整理。
      </p>

      <div className="mt-3 rounded-2xl border border-[#dce9e1] bg-white/80 px-4 py-3 text-xs font-bold leading-5 text-[#668276]">
        民國 {year} 年 · 第 {session} 次 · {subject}
      </div>
    </section>
  );
}
