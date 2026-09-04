"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("MedSlime page error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f8fcf9] px-5 py-10 text-[#17372a]">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-[30px] border border-[#d8e9df] bg-white p-7 text-center shadow-[0_16px_38px_rgba(40,106,69,0.06)]">
          <div className="text-5xl">🫠</div>

          <div className="mt-4 text-sm font-black tracking-[0.08em] text-[#2ba962]">
            SOMETHING WENT WRONG
          </div>

          <h1 className="mt-2 text-3xl font-black">
            這一頁剛剛卡住了。
          </h1>

          <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
            你的學習資料不會因為看到這個畫面就自動消失。可以先重試一次，如果還是不行，再用左下角的「測試回饋」告訴我。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-2xl bg-[#31c978] px-5 py-4 font-black text-white transition hover:bg-[#2dbc70]"
            >
              再試一次
            </button>

            <Link
              href="/"
              className="rounded-2xl border border-[#d7e7de] bg-white px-5 py-4 font-black text-[#315b45] transition hover:bg-[#f5faf7]"
            >
              回到首頁
            </Link>
          </div>

          {error.digest && (
            <div className="mt-5 text-xs font-bold text-[#9aaba1]">
              錯誤代碼：{error.digest}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
