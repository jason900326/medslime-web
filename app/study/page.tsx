import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, ClipboardCheck, Timer, FileUp, Target, ChartNoAxesCombined } from "lucide-react";
import StudyShell from "@/components/study-shell";
import DailyLearningSummary from "@/components/daily-learning-summary";

const studyItems = [
  { icon: Target, title: "自由測驗", description: "依科目與主題，安排自己的練習。", href: "/study/free-quiz" },
  { icon: Timer, title: "專心讀書", description: "開啟計時器，留一段時間給自己。", href: "/study/focus" },
  { icon: FileUp, title: "教材上傳", description: "帶上你的教材，整理與練習。", href: "/study/material" },
];

export default function StudyPage() {
  return (
    <StudyShell>
        <section className="mb-8 mt-9 sm:mt-12">
          <p className="ms-eyebrow">一點一滴，累積實力</p>
          <h1 className="ms-page-title mt-3">今天，一起往前一點。</h1>
          <p className="ms-description mt-3">從一份考卷開始，讓每次練習都有方向。</p>
        </section>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <section className="ms-study-hero">
              <div className="relative z-10 max-w-sm">
                <p className="ms-eyebrow">從這裡開始</p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">國考題庫</h2>
                <p className="ms-description mt-3 max-w-[260px]">選擇年度與科目，練習歷屆試題。<br />作答後，再一起找出需要補強的地方。</p>
                <Link href="/study/exam" className="ms-primary-action mt-6">開始刷題 <ArrowRight size={18} aria-hidden="true" /></Link>
              </div>
              <Image src="/slimes/n-green.png" alt="陪你準備國考的綠色史萊姆" width={240} height={240} className="pointer-events-none absolute -bottom-7 -right-9 w-40 opacity-60 sm:bottom-0 sm:right-0 sm:w-60 sm:opacity-100" />
            </section>
            <DailyLearningSummary />
            <section className="mt-8" aria-labelledby="review-title">
              <h2 id="review-title" className="ms-section-title">練習之後，讓進步留下來</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Link href="/study/records/what-to-study" className="ms-review-link group">
                  <ClipboardCheck size={24} className="text-[#347c61]" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold">學習分析</h3>
                  <p className="ms-description mt-2">找到優先補強的科目。</p>
                  <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#267452]">查看分析 <ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
                <Link href="/study/records" className="ms-review-link group">
                  <ChartNoAxesCombined size={24} className="text-[#347c61]" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold">學習紀錄</h3>
                  <p className="ms-description mt-2">回顧作答，找到下一步的方向。</p>
                  <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#267452]">查看紀錄 <ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
              </div>
            </section>
          </div>
          <aside className="lg:border-l lg:border-[#dfe8e2] lg:pl-7">
            <h2 className="flex items-center gap-2 text-base font-bold"><BookOpen size={18} aria-hidden="true" /> 依照你的步調</h2>
            <div className="mt-3 divide-y divide-[#e2eae5]">
              {studyItems.map(({ icon: Icon, ...item }) => (
                <Link key={item.href} href={item.href} className="ms-tool-link">
                  <Icon size={20} className="mt-1 shrink-0 text-[#608373]" aria-hidden="true" />
                  <div className="flex-1"><h3 className="font-semibold">{item.title}</h3><p className="ms-description mt-1 text-xs">{item.description}</p></div>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-[#608373]" aria-hidden="true" />
                </Link>
              ))}
            </div>
            <div className="mt-7 border-t border-[#dfe8e2] pt-6">
              <p className="text-sm font-semibold">讀累了，休息一下也沒關係。</p>
              <p className="ms-description mt-2 text-xs">你的史萊姆夥伴，陪你走過備考的每一天。</p>
              <Link href="/slimes" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#267452]">看看史萊姆 <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </aside>
        </div>
      </StudyShell>
  );
}
