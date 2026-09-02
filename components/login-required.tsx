"use client";

import Link from "next/link";
import TopBar from "@/components/top-bar";

export default function LoginRequired({
  title = "這裡需要登入",
  description = "登入後才能查看你的個人資料與進度。",
  backHref = "/",
  backLabel = "返回首頁",
}: {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref={backHref} backLabel={backLabel} />

        <section className="mt-10 rounded-[30px] border border-[#dce9e1] bg-white p-8 text-center shadow-[0_16px_40px_rgba(31,83,53,0.07)]">
          <div className="text-5xl">🔐</div>
          <h1 className="mt-5 text-3xl font-black">{title}</h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-[#789083]">
            {description}
          </p>

          <Link
            href="/auth/login"
            className="mx-auto mt-7 inline-flex rounded-2xl bg-[#31c978] px-7 py-3.5 font-black text-white transition hover:bg-[#2dbc70]"
          >
            登入 MedSlime
          </Link>
        </section>
      </div>
    </main>
  );
}
