"use client";

import Link from "next/link";
import TopBar from "@/components/top-bar";
import AppNavigation from "@/components/app-navigation";
import { useAuthUser } from "@/hooks/use-auth-user";
const startSteps = [
  { number: "1", title: "選一份國考考卷" },
  { number: "2", title: "作答、看分數與錯題" },
  { number: "3", title: "找出弱點，知道先讀什麼" },
];

export default function Home() {
  const auth = useAuthUser();

  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar />
        {auth.isLoggedIn && <AppNavigation />}

        <section className="relative mt-5 overflow-hidden rounded-[30px] border border-[#d7eadf] bg-[radial-gradient(circle_at_top_right,#dff8ea_0%,transparent_38%),linear-gradient(135deg,#f0fbf4_0%,#ffffff_56%,#eef9f7_100%)] px-5 py-9 shadow-[0_18px_48px_rgba(31,83,53,0.08)] sm:px-8 sm:py-12 md:px-10 md:py-14">
          <div className="relative z-10 grid gap-9 md:grid-cols-[1.08fr_0.92fr] md:items-center md:gap-12">
            <div>
            <div className="inline-flex items-center rounded-full border border-[#c9e6d4] bg-white/80 px-3 py-1.5 text-xs font-black tracking-[0.08em] text-[#278754] backdrop-blur">
              國考刷題 × 弱點補強
            </div>

            <h1 className="mt-5 text-[2.55rem] font-black leading-[1.04] tracking-[-0.055em] text-[#17372a] sm:text-5xl md:text-6xl">
              弱點補起來，
              <br />
              分數撿回來。
            </h1>

            <p className="mt-5 max-w-xl text-base font-bold leading-7 text-[#668073] sm:text-lg sm:leading-8">
              刷國考歷屆題，從作答紀錄找出弱點，知道下一步該讀什麼。
            </p>

            <Link
              href="/study/exam"
              className="mt-7 inline-flex min-h-13 items-center justify-center rounded-2xl bg-[#31c978] px-6 py-4 text-base font-black text-white shadow-[0_10px_24px_rgba(49,201,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#2dbc70]"
            >
              開始刷題
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>

            <p className="mt-4 text-xs font-bold leading-5 text-[#82958b]">
              不用先註冊，也能先完整體驗一份考卷。
            </p>

            </div>

            <div className="rounded-[24px] border border-[#cfe7d8] bg-white/85 p-5 shadow-[0_12px_30px_rgba(31,83,53,0.06)] backdrop-blur sm:p-6">
              <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
                3 步開始
              </div>

              <ol className="mt-4 space-y-4">
                {startSteps.map((step) => (
                  <li key={step.number} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f8ed] text-sm font-black text-[#279255]">
                      {step.number}
                    </span>
                    <span className="text-sm font-black leading-6 text-[#315b45] sm:text-base">
                      {step.title}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div
            className="pointer-events-none absolute -right-14 -top-12 h-44 w-44 rounded-full border-[28px] border-[#d8f3e3]/70 sm:h-56 sm:w-56"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 right-16 h-40 w-40 rounded-full bg-[#e5f7ed]/65 blur-2xl"
            aria-hidden="true"
          />
        </section>

        <p className="mx-auto max-w-2xl px-4 py-8 text-center text-sm font-bold leading-6 text-[#70877a] md:py-10">
          每次刷題都會累積成你的學習紀錄，之後再回來看自己哪裡進步、哪裡需要補強。
        </p>
      </div>
    </main>
  );
}
