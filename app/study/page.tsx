import Link from "next/link";

const studyItems = [
  {
    icon: "📄",
    title: "我有教材",
    copy: "上傳教材，讓 AI 幫你生成測驗。",
    href: "/study/material",
  },
  {
    icon: "🧪",
    title: "我要刷國考",
    copy: "直接練習歷屆醫檢師國考題。",
    href: "/study/exam",
  },
  {
    icon: "📘",
    title: "我要複習錯題",
    copy: "回頭整理答錯與不確定的題目。",
    href: "/study/mistakes",
  },
  {
    icon: "⏱️",
    title: "我要專心讀書",
    copy: "開始一輪專注計時。",
    href: "/study/focus",
  },
];

export default function StudyPage() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-[#d7e7de] bg-white px-4 py-2 font-bold text-[#315b45] transition hover:bg-[#f5faf7]"
          >
            ← 返回首頁
          </Link>

          <div className="text-2xl font-black tracking-[-0.04em]">
            MedSlime.
          </div>
        </div>

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            STUDY
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            今天想怎麼學？
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-[#70877a]">
            選擇你現在最需要的學習方式。
          </p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {studyItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-[26px] border border-[#dceae2] bg-white p-6 shadow-[0_12px_28px_rgba(30,78,50,0.055)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(30,78,50,0.09)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eefaf2] text-2xl">
                {item.icon}
              </div>

              <div className="mt-5 text-xl font-black">
                {item.title}
              </div>

              <div className="mt-2 leading-7 text-[#70877a]">
                {item.copy}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
