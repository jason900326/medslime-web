import Link from "next/link";
import TopBar from "@/components/top-bar";

const studyItems = [
  { icon: "🧪", title: "國考題庫", href: "/study/exam" },
  { icon: "🎯", title: "自由測驗", href: "/study/free-quiz" },
  { icon: "📝", title: "錯題複習", href: "/study/mistakes" },
  { icon: "📊", title: "學習紀錄", href: "/study/records" },
  { icon: "⏱️", title: "專心讀書", href: "/study/focus" },
  { icon: "📄", title: "教材上傳", href: "/study/material" },
];

export default function StudyPage() {
  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-6">
          <h1 className="ms-page-title">今天想怎麼學？</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--brand-text-muted)]">
            刷題、複習、看紀錄或專心讀書，都從這裡開始。
          </p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 md:gap-4">
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
        </section>
      </div>
    </main>
  );
}
