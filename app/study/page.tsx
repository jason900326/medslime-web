import Link from "next/link";
import TopBar from "@/components/top-bar";

const primaryItems = [
  {
    icon: "🧪",
    eyebrow: "歷屆國考",
    title: "國考題庫",
    copy: "完整作答歷屆醫檢師國考，保留每次成績與錯題。",
    href: "/study/exam",
  },
  {
    icon: "🎯",
    eyebrow: "自由組卷",
    title: "自由測驗",
    copy: "自選年份範圍、科目與題數，快速組一份練習。",
    href: "/study/free-quiz",
  },
  {
    icon: "📝",
    eyebrow: "複習",
    title: "錯題複習",
    copy: "集中整理答錯與不確定題目，直接開始複習。",
    href: "/study/mistakes",
  },
  {
    icon: "📊",
    eyebrow: "歷史與分析",
    title: "學習紀錄",
    copy: "查看歷史作答、成績趨勢與 Pro 備考分析。",
    href: "/study/records",
  },
  {
    icon: "⏱️",
    eyebrow: "專注",
    title: "專心讀書",
    copy: "和陪伴史萊姆一起完成一輪專注，累積讀書紀錄。",
    href: "/study/focus",
  },
];

export default function StudyPage() {
  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">STUDY</div>
          <h1 className="ms-page-title mt-2">今天想怎麼學？</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--brand-text-muted)]">
            刷題、複習、看紀錄或專心讀書，都從這裡開始。
          </p>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 md:gap-4">
          {primaryItems.map((item, index) => (
            <Link
              key={item.title}
              href={item.href}
              className={[
                "group rounded-[24px] border border-[#dceae2] bg-white p-5 shadow-[0_8px_22px_rgba(30,78,50,0.045)] transition hover:-translate-y-0.5 hover:border-[#bfe1cb] hover:shadow-[0_12px_28px_rgba(30,78,50,0.07)] active:scale-[0.99]",
                index === 0 ? "sm:col-span-2 md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-5" : "",
              ].join(" ")}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-primary-soft)] text-2xl md:h-12 md:w-12">
                {item.icon}
              </div>

              <div className={index === 0 ? "mt-4 min-w-0 md:mt-0" : "mt-4"}>
                <div className="text-[11px] font-black tracking-[0.08em] text-[#2ba962]">
                  {item.eyebrow}
                </div>
                <div className="mt-1 text-lg font-black md:text-xl">{item.title}</div>
                <div className="mt-1 text-sm font-bold leading-6 text-[var(--brand-text-muted)]">
                  {item.copy}
                </div>
              </div>

              {index === 0 && (
                <div className="mt-4 text-sm font-black text-[#237849] md:mt-0">
                  選一份考卷 →
                </div>
              )}
            </Link>
          ))}
        </section>

        <section className="mt-8 border-t border-[#e5eee9] pt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#8aa095]">OTHER TOOLS</div>
          <h2 className="mt-1 text-lg font-black">其他學習工具</h2>

          <Link
            href="/study/material"
            className="mt-3 flex items-center gap-4 rounded-[20px] border border-[#e1eae5] bg-white/75 px-4 py-4 transition hover:bg-white"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f8f5] text-xl">
              📄
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-black">教材上傳</div>
                <span className="rounded-full bg-[#f2f5f3] px-2 py-0.5 text-[10px] font-black text-[#789083]">
                  BETA
                </span>
              </div>
              <div className="mt-1 text-xs font-bold leading-5 text-[#789083]">
                上傳 PDF 產生教材測驗。功能保留，但不再佔用主要學習入口。
              </div>
            </div>
            <span className="shrink-0 text-sm font-black text-[#789083]">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
