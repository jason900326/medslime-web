import Link from "next/link";
import TopBar from "@/components/top-bar";

const studyItems = [
  {
    icon: "🧪",
    title: "國考題庫",
    copy: "練習歷屆醫檢師國考題",
    href: "/study/exam",
  },
  {
    icon: "📄",
    title: "教材測驗",
    copy: "上傳 PDF，產生 10 題測驗",
    href: "/study/material",
  },
  {
    icon: "📘",
    title: "錯題庫",
    copy: "整理答錯與不確定的題目",
    href: "/study/mistakes",
  },
  {
    icon: "⏱️",
    title: "專心讀書",
    copy: "開始一輪專注計時",
    href: "/study/focus",
  },
];

export default function StudyPage() {
  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar
          showBack
          backHref="/"
          backLabel="返回首頁"
        />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            STUDY
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">
            今天想怎麼學？
          </h1>

          <p className="mt-2 text-sm font-bold leading-6 text-[var(--brand-text-muted)]">
            選一個現在最想做的就好。
          </p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 md:gap-4">
          {studyItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="min-h-[150px] rounded-[22px] border border-[#dceae2] bg-white p-4 shadow-[0_8px_22px_rgba(30,78,50,0.05)] transition active:scale-[0.99] md:min-h-[180px] md:p-5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-primary-soft)] text-2xl md:h-12 md:w-12">
                {item.icon}
              </div>

              <div className="mt-4 text-base font-black md:text-lg">
                {item.title}
              </div>

              <div className="mt-1 text-xs font-bold leading-5 text-[var(--brand-text-muted)] md:text-sm">
                {item.copy}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
