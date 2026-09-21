import Link from "next/link";
import TopBar from "@/components/top-bar";
import AppNavigation from "@/components/app-navigation";

const studyItems = [
  { icon: "🎯", title: "自由測驗", href: "/study/free-quiz" },
  { icon: "📝", title: "錯題複習", href: "/study/mistakes" },
  { icon: "⏱️", title: "專心讀書", href: "/study/focus" },
  { icon: "📄", title: "教材上傳", href: "/study/material" },
];

export default function StudyPage() {
  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/" backLabel="返回首頁" />
        <AppNavigation />

        <section className="mt-6">
          <h1 className="ms-page-title">學習</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--brand-text-muted)]">
            準備國考，就從國考題庫開始。
          </p>
        </section>

        <Link
          href="/study/exam"
          className="group mt-6 flex min-h-[154px] items-center gap-4 rounded-[24px] border border-[#bfe1cb] bg-gradient-to-br from-[#eaf9f0] via-white to-[#f6fcf8] px-5 py-5 shadow-[0_12px_28px_rgba(30,78,50,0.07)] transition hover:-translate-y-0.5 hover:border-[#8fd4a6] sm:px-7"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#d6f3df] text-3xl sm:h-16 sm:w-16 sm:text-4xl">
            🧪
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-black tracking-[-0.03em] text-[#17372a] sm:text-2xl">
              國考題庫
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-[#668073]">
              依職類、年份、考次與科目，開始一份歷屆考卷。
            </p>
          </div>
          <span className="shrink-0 text-sm font-black text-[#237849] group-hover:translate-x-0.5">
            開始刷題 →
          </span>
        </Link>

        <section className="mt-8">
          <h2 className="text-sm font-black text-[#789083]">其他學習方式</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:gap-4">
          {studyItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex min-h-[126px] flex-col items-center justify-center rounded-[20px] border border-[#dceae2] bg-white px-3 py-4 text-center shadow-[0_8px_22px_rgba(30,78,50,0.045)] transition hover:-translate-y-0.5 hover:border-[#bfe1cb] hover:shadow-[0_12px_28px_rgba(30,78,50,0.07)] active:scale-[0.98] sm:min-h-[138px] sm:rounded-[22px] sm:px-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-primary-soft)] text-2xl sm:h-12 sm:w-12">
                {item.icon}
              </div>
              <div className="mt-3 text-sm font-black leading-tight sm:text-base">
                {item.title}
              </div>
            </Link>
          ))}
          </div>
        </section>
      </div>
    </main>
  );
}
