import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://medslime.vercel.app";

export const metadata: Metadata = {
  title: "醫檢師國考刷題｜歷屆試題、AI 詳解與錯題複習",
  description:
    "MedSlime 提供醫事檢驗師國考歷屆試題線上刷題、AI 詳解、錯題複習、弱點分析與讀書計時，給醫技系與醫檢師國考考生使用。",
  alternates: {
    canonical: "/medtech-exam",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/medtech-exam`,
    title: "醫檢師國考刷題｜MedSlime",
    description:
      "線上練習醫事檢驗師歷屆國考題，查看 AI 詳解、整理錯題與分析弱點。",
  },
};

const features = [
  {
    title: "歷屆國考題線上刷題",
    body: "直接練習醫事檢驗師歷屆國考題，省去在不同 PDF 與答案頁之間來回切換。",
  },
  {
    title: "AI 詳解與考點整理",
    body: "需要時可以查看 AI 協助整理的解題思路、正確答案理由與其他選項差異。",
  },
  {
    title: "錯題複習與弱點分析",
    body: "把答錯或不確定的題目集中整理，從作答紀錄回頭看自己比較不熟的主題。",
  },
  {
    title: "讀書計時與史萊姆收藏",
    body: "刷題、訂正與專注讀書可以累積遊戲進度，讓準備國考不只剩下題目和分數。",
  },
];

const subjects = [
  "臨床血液學與血庫學",
  "臨床生化學",
  "臨床微生物學",
  "臨床生理學與病理學",
  "醫學分子檢驗學與鏡檢學",
  "臨床血清免疫學",
];

export default function MedtechExamPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "MedSlime",
    url: SITE_URL,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: "zh-Hant",
    description:
      "醫事檢驗師國考刷題與學習網站，提供歷屆試題、AI 詳解、錯題複習、弱點分析與讀書計時。",
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5 md:px-8 md:py-12">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-black tracking-[-0.03em] text-[#17372a]">
            MedSlime 🟢
          </Link>
          <Link
            href="/study"
            className="rounded-xl bg-[#31c978] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#2dbc70]"
          >
            開始刷題
          </Link>
        </nav>

        <section className="mt-10 rounded-[30px] border border-[#d8e9df] bg-gradient-to-br from-[#e8f9ee] via-white to-[#eef9fc] p-6 shadow-[0_18px_45px_rgba(40,106,69,0.08)] sm:p-8 md:p-10">
          <div className="text-xs font-black tracking-[0.12em] text-[#2ba962]">
            醫事檢驗師國考學習工具
          </div>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight tracking-[-0.045em] sm:text-5xl md:text-6xl">
            醫檢師國考刷題，
            <br className="hidden sm:block" />
            不用只剩下一堆 PDF。
          </h1>
          <p className="mt-5 max-w-3xl text-base font-bold leading-8 text-[#60796c] sm:text-lg">
            MedSlime 是給醫技系與醫事檢驗師國考考生使用的線上刷題網站。可以練習歷屆國考題、查看 AI 詳解、整理錯題、分析弱點，還有讀書計時與史萊姆收藏。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/study"
              className="rounded-2xl bg-[#31c978] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#2dbc70] sm:text-base"
            >
              免費開始刷題 →
            </Link>
            <Link
              href="/about"
              className="rounded-2xl border border-[#cfe7d8] bg-white px-5 py-3.5 text-sm font-black text-[#237849] transition hover:bg-[#eefaf2] sm:text-base"
            >
              查看題目來源與 AI 說明
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[24px] border border-[#dfece4] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)] sm:p-6"
            >
              <h2 className="text-xl font-black tracking-[-0.02em]">{feature.title}</h2>
              <p className="mt-3 text-sm font-bold leading-7 text-[#687f73] sm:text-base">
                {feature.body}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[26px] border border-[#dfece4] bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">
            醫檢師國考常見科目
          </h2>
          <p className="mt-3 text-sm font-bold leading-7 text-[#687f73] sm:text-base">
            準備醫事檢驗師國考時，可以依科目刷歷屆試題，再搭配錯題紀錄與弱點分析安排複習順序。
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <div
                key={subject}
                className="rounded-2xl border border-[#e1eee6] bg-[#f8fcf9] px-4 py-3 text-sm font-black text-[#315b45]"
              >
                {subject}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[26px] border border-[#dfece4] bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">
            MedSlime 適合什麼時候用？
          </h2>
          <div className="mt-4 space-y-4 text-sm font-bold leading-7 text-[#687f73] sm:text-base">
            <p>
              如果你正在找「醫檢師國考刷題」、「醫檢師國考題庫」、「醫檢師歷屆試題」或「醫技國考刷題」，MedSlime 的目的就是把這些練習流程集中在同一個網站裡。
            </p>
            <p>
              題目與標準答案以考選部公開資料為基礎；AI 內容用來協助理解，不取代官方標準答案。詳細來源與使用說明可以在資料來源頁查看。
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/study"
              className="inline-flex rounded-2xl bg-[#17372a] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#244a39] sm:text-base"
            >
              進入 MedSlime 開始學習 →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
