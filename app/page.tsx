"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import TopBar from "@/components/top-bar";
import AppNavigation from "@/components/app-navigation";
import { useAuthUser } from "@/hooks/use-auth-user";

const startSteps = [
  { number: "01", title: "練一份考卷", description: "依年度與科目，挑選歷屆國考試題。" },
  { number: "02", title: "看懂自己的錯題", description: "回顧作答與分數，釐清不熟悉的觀念。" },
  { number: "03", title: "知道下一步讀什麼", description: "從學習紀錄找出弱點，逐步補強。" },
];

export default function Home() {
  const auth = useAuthUser();
  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]">
      <div className="ms-workspace">
        <TopBar />
        <AppNavigation />
        <section className="grid items-center gap-4 py-12 sm:py-16 md:grid-cols-[1.2fr_1fr] md:gap-10">
          <div>
            <p className="ms-eyebrow">你的國考練習夥伴</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.3] tracking-tight sm:text-5xl lg:text-6xl">弱點補起來，<br /><span className="text-[#27835b]">分數撿回來。</span></h1>
            <p className="ms-description mt-6 max-w-md text-base">刷國考歷屆題，從作答紀錄找出弱點。<br />讓每一次練習，都更靠近你的目標。</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={auth.isLoggedIn ? "/study/exam" : "/auth/login?redirect=%2Fstudy%2Fexam"} className="ms-primary-action">{auth.isLoggedIn ? "開始刷題" : "登入後開始刷題"}<ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/study" className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-[#315b45]">探索學習工具 <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <p className="mt-4 text-xs leading-6 text-[#61786b]">登入後，自動保存你的作答紀錄與弱點分析。</p>
          </div>
          <div className="relative flex min-h-[240px] flex-col items-center justify-center rounded-[44%_44%_24%_24%] bg-[#e8f3eb] py-4 sm:min-h-[330px]">
            <Image src="/slimes/n-green.png" alt="MedSlime 綠色史萊姆學習夥伴" width={320} height={280} priority className="h-56 w-64 object-contain sm:h-64 sm:w-80" />
            <p className="pb-6 text-sm font-medium text-[#426d54]">慢慢來，每一題都算數。</p>
          </div>
        </section>
        <section aria-labelledby="start-title" className="border-t border-[#dce7df] pt-8">
          <h2 id="start-title" className="text-lg font-bold">準備國考，從這三步開始</h2>
          <ol className="mt-6 grid gap-7 sm:grid-cols-3">
            {startSteps.map((step) => (
              <li key={step.number} className="flex items-start gap-4">
                <span className="pt-1 text-sm font-semibold tabular-nums text-[#388060]">{step.number}</span>
                <div><h3 className="font-bold">{step.title}</h3><p className="ms-description mt-2">{step.description}</p></div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
