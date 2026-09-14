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
    title: "歷屆試題直接刷，不用 PDF 來回切",
    body: "選年度、梯次與科目就能開始作答，寫過的考卷會留下成績與錯題紀錄。",
  },
  {
    title: "AI 詳解不是只丟答案",
    body: "需要時再打開詳解，整理考點、正確答案理由、常見陷阱與選項差異。",
  },
  {
    title: "把錯在哪裡留下來",
    body: "錯題、不確定題與作答紀錄會集中整理，之後回來複習不用重新翻整份考卷。",
  },
  {
    title: "知道下一步先補什麼",
    body: "從作答紀錄看弱主題與細分弱點，讓複習順序不只靠感覺。",
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

const steps = [
  "選一份歷屆國考題開始作答",
  "需要時打開 AI 詳解釐清考點",
  "把錯題與不確定題留下來",
  "回頭看弱點分析，決定下一輪複習",
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
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "TWD",
    },
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 md:px-8 md:py-12">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-black tracking-[-0.03em] text-[#17372a]">
            MedSlime 🟢
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-[#31c978] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#2dbc70]"
          >
            回到首頁
          </Link>
        </nav>

        <section className="mt-10 rounded-[30px] border border-[#d8e9df] bg-gradient-to-br from-[#e8f9ee] via-white to-[#eef9fc] p-6 shadow-[0_18px_45px_rgba(40,106,69,0.08)] sm:p-8 md:p-10">
          <div className="text-xs font-black tracking-[0.12em] text-[#2ba962]">
            醫事檢驗師國考學習工具
          </div>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight tracking-[-0.045em] sm:text-5xl md:text-6xl">
            醫檢師國考刷題，
            <br className="hidden sm:block" />
            不用只剩下一堆 PDF。
          </h1>
          <p className="mt-5 max-w-3xl text-base font-bold leading-8 text-[#60796c] sm:text-lg">
            MedSlime 把歷屆國考題、AI 詳解、錯題複習與弱點分析放在同一個地方。寫完不是看過答案就算了，而是把你錯在哪裡留下來。
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs font-black text-[#2b6848] sm:text-sm">
            {["免安裝", "目前可免費使用", "可直接開始使用", "登入後保存作答與學習紀錄"].map((item) => (
              <span key={item} className="rounded-full border border-[#cfe7d8] bg-white/85 px-3 py-2">
                ✓ {item}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-2xl bg-[#31c978] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#2dbc70] sm:text-base"
            >
              前往 MedSlime 首頁 →
            </Link>
            <Link
              href="/about"
              className="rounded-2xl border border-[#cfe7d8] bg-white px-5 py-3.5 text-sm font-black text-[#237849] transition hover:bg-[#eefaf2] sm:text-base"
            >
              查看題目來源與 AI 說明
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black tracking-[0.14em] text-[#2ba962]">WHY MEDSLIME</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
              不只是看答案，而是把你錯在哪裡留下來。
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[24px] border border-[#dfece4] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)] sm:p-6"
              >
                <h3 className="text-xl font-black tracking-[-0.02em]">{feature.title}</h3>
                <p className="mt-3 text-sm font-bold leading-7 text-[#687f73] sm:text-base">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[26px] border border-[#dfece4] bg-white p-6 sm:p-8">
          <p className="text-xs font-black tracking-[0.14em] text-[#2ba962]">HOW IT WORKS</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
            準備醫檢師國考時，可以這樣用 MedSlime
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-[#e1eee6] bg-[#f8fcf9] p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#31c978] text-sm font-black text-white">
                  {index + 1}
                </div>
                <p className="mt-3 text-sm font-black leading-6 text-[#315b45]">{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-[#687f73] sm:text-base">
            如果你以前是開著考題 PDF、答案檔和自己的錯題筆記來回切，MedSlime 想做的就是把這些流程放在同一個地方，讓每次作答都能接到下一次複習。
          </p>
        </section>

        <section className="mt-8 rounded-[26px] border border-[#dfece4] bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">
            醫檢師國考常見科目
          </h2>
          <p className="mt-3 text-sm font-bold leading-7 text-[#687f73] sm:text-base">
            可以依科目刷歷屆試題，再搭配錯題紀錄與弱點分析安排複習順序。
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

        <section className="mt-8 rounded-[28px] bg-[#17372a] p-6 text-white sm:p-8 md:flex md:items-center md:justify-between md:gap-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">
              想刷題，就從首頁開始。
            </h2>
            <p className="mt-3 text-sm font-bold leading-7 text-[#c9ddd2] sm:text-base">
              MedSlime 免安裝，目前可免費使用；登入後可以保存作答紀錄、錯題與學習進度。題目與標準答案以考選部公開資料為基礎，AI 內容用來協助理解，不取代官方標準答案。
            </p>
          </div>
          <div className="mt-6 shrink-0 md:mt-0">
            <Link
              href="/"
              className="inline-flex rounded-2xl bg-[#31c978] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#2dbc70] sm:text-base"
            >
              前往 MedSlime 首頁 →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
