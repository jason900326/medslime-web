"use client";

import Link from "next/link";
import TopBar from "@/components/top-bar";
import { useAuthUser } from "@/hooks/use-auth-user";

const learningFlow = [
  {
    step: "01",
    title: "先刷國考題",
    copy: "從歷屆國考開始作答，讓每一次答對、答錯與不確定都變成你的學習資料。",
  },
  {
    step: "02",
    title: "找出真正弱點",
    copy: "MedSlime 會從累積的作答紀錄整理出反覆失分的主題，而不是只看單次考試。",
  },
  {
    step: "03",
    title: "知道下一步讀什麼",
    copy: "把最需要補的地方排出優先順序，快速複習，再用同主題題目確認自己有沒有進步。",
  },
];

export default function Home() {
  const auth = useAuthUser();

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar />

        <section className="relative mt-5 overflow-hidden rounded-[30px] border border-[#d7eadf] bg-[radial-gradient(circle_at_top_right,#dff8ea_0%,transparent_38%),linear-gradient(135deg,#f0fbf4_0%,#ffffff_56%,#eef9f7_100%)] px-5 py-9 shadow-[0_18px_48px_rgba(31,83,53,0.08)] sm:px-8 sm:py-12 md:px-10 md:py-16">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-[#c9e6d4] bg-white/80 px-3 py-1.5 text-xs font-black tracking-[0.08em] text-[#278754] backdrop-blur">
              國考刷題 × 弱點補強
            </div>

            <h1 className="mt-5 text-[2.55rem] font-black leading-[1.04] tracking-[-0.055em] text-[#17372a] sm:text-5xl md:text-6xl">
              弱點補起來，
              <br />
              分數撿回來。
            </h1>

            <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-[#668073] sm:text-lg sm:leading-8">
              刷國考歷屆題，讓 MedSlime 從你的作答紀錄找出真正的弱點，
              告訴你接下來該讀什麼，再用題目確認自己有沒有真的進步。
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/study/exam"
                className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-[#31c978] px-6 py-4 text-base font-black text-white shadow-[0_10px_24px_rgba(49,201,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#2dbc70]"
              >
                開始刷題
                <span className="ml-2" aria-hidden="true">
                  →
                </span>
              </Link>

              {auth.isLoggedIn ? (
                <Link
                  href="/study/records"
                  className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-[#cfe5d7] bg-white px-6 py-4 text-base font-black text-[#315b45] transition hover:-translate-y-0.5 hover:bg-[#f7fbf8]"
                >
                  看我的學習紀錄
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-[#cfe5d7] bg-white px-6 py-4 text-base font-black text-[#315b45] transition hover:-translate-y-0.5 hover:bg-[#f7fbf8]"
                >
                  已有帳號？登入
                </Link>
              )}
            </div>

            <p className="mt-4 text-xs font-bold leading-5 text-[#82958b]">
              不用先研究一堆功能。準備國考，就先從一份歷屆題開始。
            </p>
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

        <section className="mt-10 md:mt-14">
          <div className="max-w-2xl">
            <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
              HOW IT WORKS
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
              不只是寫完一份考卷。
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[#70877a] sm:text-base">
              MedSlime 想做的，是把每一次刷題都累積成下一步的方向。
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3 md:gap-4">
            {learningFlow.map((item) => (
              <article
                key={item.step}
                className="rounded-[24px] border border-[#dceae2] bg-white p-5 shadow-[0_8px_24px_rgba(31,83,53,0.04)] sm:p-6"
              >
                <div className="text-xs font-black tracking-[0.08em] text-[#31b96f]">
                  {item.step}
                </div>
                <h3 className="mt-3 text-xl font-black tracking-[-0.03em] text-[#17372a]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm font-bold leading-6 text-[#71877b]">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-[#d9e9df] bg-white p-6 shadow-[0_10px_30px_rgba(31,83,53,0.045)] sm:p-8 md:mt-14">
          <div className="grid gap-7 md:grid-cols-[1.15fr_0.85fr] md:items-center">
            <div>
              <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
                THE DIFFERENCE
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                答錯一題，不代表你只是不會那一題。
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-[#70877a] sm:text-base">
                真正有價值的是知道：同一個觀念是不是一直錯、哪個主題最常失分、
                最近有沒有改善，以及現在最值得先補哪一塊。
              </p>
            </div>

            <div className="rounded-[22px] border border-[#cfe7d8] bg-[#f1fbf5] p-5 sm:p-6">
              <div className="text-xs font-black text-[#2ba962]">學習循環</div>
              <div className="mt-3 space-y-2 text-sm font-black text-[#315b45]">
                <div>刷題 → 訂正</div>
                <div>找弱點 → 補弱點</div>
                <div>再練習 → 看見改善</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 pb-8 text-center md:mt-14 md:pb-12">
          <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
            不知道今天該讀什麼？
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-6 text-[#70877a] sm:text-base">
            先寫一份國考題。剩下的學習方向，交給你的作答紀錄慢慢說話。
          </p>
          <Link
            href="/study/exam"
            className="mt-6 inline-flex min-h-13 items-center justify-center rounded-2xl bg-[#31c978] px-7 py-4 text-base font-black text-white shadow-[0_10px_24px_rgba(49,201,120,0.2)] transition hover:-translate-y-0.5 hover:bg-[#2dbc70]"
          >
            開始刷題
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
