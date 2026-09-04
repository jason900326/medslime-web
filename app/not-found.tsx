import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] px-5 py-10 text-[#17372a]">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-[30px] border border-[#d8e9df] bg-white p-7 text-center shadow-[0_16px_38px_rgba(40,106,69,0.06)]">
          <div className="text-6xl">🫥</div>

          <div className="mt-4 text-sm font-black tracking-[0.08em] text-[#2ba962]">
            404
          </div>

          <h1 className="mt-2 text-3xl font-black">
            這裡沒有史萊姆。
          </h1>

          <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
            這個頁面可能被移動、刪除，或網址打錯了。
          </p>

          <Link
            href="/"
            className="mt-6 block rounded-2xl bg-[#31c978] px-5 py-4 font-black text-white transition hover:bg-[#2dbc70]"
          >
            回到 MedSlime
          </Link>
        </div>
      </div>
    </main>
  );
}
