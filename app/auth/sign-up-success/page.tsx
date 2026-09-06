import Link from "next/link";

export default function Page() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-[#f8fcf9] p-5 md:p-10">
      <div className="w-full max-w-md rounded-[30px] border border-[#dce9e1] bg-white p-7 text-[#17372a] shadow-[0_18px_44px_rgba(40,106,69,0.08)] md:p-8">
        <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
          ONE MORE STEP
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
          去信箱確認帳號。
        </h1>
        <p className="mt-3 text-sm font-bold leading-6 text-[#789083]">
          我們已寄出確認信。點擊信件裡的連結後，就可以回 MedSlime 登入並開始保存學習進度。
        </p>
        <div className="mt-5 rounded-2xl border border-[#cfe7d8] bg-[#eefaf2] px-4 py-3 text-sm font-bold leading-6 text-[#315b45]">
          如果暫時沒看到，先確認垃圾郵件或稍等一兩分鐘。
        </div>
        <Link
          href="/auth/login"
          className="mt-7 block w-full rounded-2xl bg-[#31c978] px-5 py-4 text-center font-black text-white transition hover:bg-[#2dbc70]"
        >
          返回登入
        </Link>
      </div>
    </main>
  );
}
