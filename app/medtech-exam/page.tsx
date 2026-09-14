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

function QuestionPreview() {
  return (
    <div className="h-full min-h-[560px] rounded-[18px] bg-[#fbfefc] p-4 text-[#17372a] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.14em] text-[#36aa69]">民國 115 年・第 2 次</p>
          <h3 className="mt-2 text-xl font-black leading-snug tracking-[-0.03em] sm:text-2xl">
            微生物學與臨床微生物學
            <br />
            （細菌與黴菌）
          </h3>
        </div>
        <div className="shrink-0 rounded-2xl border border-[#dbe9e1] bg-white px-3 py-2 text-center shadow-sm">
          <p className="text-[10px] font-black text-[#7d9488]">作答時間</p>
          <p className="mt-1 font-mono text-lg font-black text-[#246b47]">00:48</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#dbe9e1] bg-white p-3.5">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-black text-[#6d8177] sm:text-xs">
          <span>🟢 已作答</span>
          <span>🟡 作答＋不確定</span>
          <span>🔴 只有不確定</span>
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden text-[10px] font-black sm:text-xs">
          <span className="rounded-full border border-[#d9e7df] px-3 py-1.5">🙂 1–10</span>
          <span className="rounded-full border border-[#6fd69a] bg-[#ecfaf1] px-3 py-1.5 text-[#237849]">🙂 11–20</span>
          <span className="rounded-full border border-[#d9e7df] px-3 py-1.5">🙂 21–30</span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-1">
          {[11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1 text-[9px] font-black text-[#6f8579]">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                  n === 15
                    ? "border-[#50c985] bg-[#dff7e8] text-[#1f7548] ring-4 ring-[#edf9f1]"
                    : n < 18
                      ? "border-[#62cf8e] bg-[#e9f9ef] text-[#2b7b50]"
                      : "border-[#dbe9e1] bg-[#f6faf7]"
                }`}
              >
                🙂
              </span>
              {n}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#dbe9e1] bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-black text-[#768c80]">Q15 / 80</span>
          <span className="rounded-xl border border-[#edd7d7] px-3 py-2 text-xs font-black text-[#a34e4e]">結束測驗</span>
        </div>
        <p className="mt-5 text-base font-black leading-8 sm:text-lg">
          Multidrug-resistant（MDR）tuberculosis 是指至少對下列那兩種抗生素具抗藥性？
        </p>
        <span className="mt-4 inline-flex rounded-xl border border-[#dbe9e1] px-3 py-2 text-xs font-black text-[#4f6f5e]">📄 官方原題</span>
        <div className="mt-4 space-y-2.5">
          {["A. rifampin 及 amikacin", "B. rifampin 及 isoniazid"].map((option) => (
            <div key={option} className="flex items-center gap-3 rounded-xl border border-[#dfeae4] px-3 py-3 text-xs font-black text-[#496a59] sm:text-sm">
              <span className="h-6 w-6 shrink-0 rounded-full border-2 border-[#b9cec2]" />
              {option}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewPreview() {
  return (
    <div className="h-full rounded-[18px] bg-[#fbfefc] p-4 text-[#17372a] sm:p-5">
      <p className="text-[10px] font-black tracking-[0.15em] text-[#748b80] sm:text-xs">SMART REVIEW</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 className="text-base font-black leading-snug text-[#2ba962] sm:text-lg">IS 與 transposon 的區分</h3>
        <span className="shrink-0 rounded-xl border border-[#dbe9e1] bg-white px-2.5 py-1.5 text-[10px] font-black text-[#668074]">＋ 加到筆記</span>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#dbe9e1] bg-white text-[10px] font-bold leading-5 text-[#5c7468] sm:text-xs">
        <div className="grid grid-cols-[70px_1fr_1fr] bg-[#f0f8f3] font-black text-[#315b45]">
          <div className="p-2.5">特徵</div>
          <div className="p-2.5">Insertion sequence (IS)</div>
          <div className="p-2.5">Transposon</div>
        </div>
        {[
          ["基本組成", "轉位相關序列，通常含 transposase 與兩端 repeats", "轉位序列外，還可攜帶抗藥性或其他功能基因"],
          ["主要功能", "移動自身，可能造成插入突變", "移動自身並散播額外功能基因"],
          ["抗藥性基因", "通常不攜帶多種抗藥性基因", "可攜帶一個或多個抗藥性基因"],
        ].map(([label, a, b]) => (
          <div key={label} className="grid grid-cols-[70px_1fr_1fr] border-t border-[#e4eee8]">
            <div className="p-2.5 font-black text-[#496a59]">{label}</div>
            <div className="p-2.5">{a}</div>
            <div className="p-2.5">{b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeaknessPreview() {
  return (
    <div className="h-full rounded-[18px] bg-[#fbfefc] p-4 text-[#17372a] sm:p-5">
      <div className="rounded-2xl border border-[#dbe9e1] bg-white p-3.5">
        <p className="text-sm font-black">今天建議先做什麼</p>
        <p className="mt-3 text-xs font-bold leading-6 text-[#61796d]">
          目前最需要補的是「革蘭氏陽性菌」，6 題作答正確率 16.7%。先處理尚未完成的錯題複習。
        </p>
      </div>
      <div className="mt-3 rounded-2xl border border-[#dbe9e1] bg-white p-3.5">
        <p className="text-sm font-black">弱主題與細分弱點</p>
        <p className="mt-3 text-[10px] font-black text-[#5a7466]">優先補強主題</p>
        {[
          ["革蘭氏陽性菌", "16.7%", "1/6 題", "w-[17%]"],
          ["革蘭氏陰性菌", "0.0%", "0/3 題", "w-[4%]"],
        ].map(([label, pct, count, width]) => (
          <div key={label} className="mt-2.5 rounded-xl border border-[#e1ece6] p-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-[#809389]">微生物 / 臨床微生物學</p>
                <p className="mt-1 text-xs font-black sm:text-sm">{label}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-[#237849]">{pct}</p>
                <p className="text-[10px] font-bold text-[#91a098]">{count}</p>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf4ef]">
              <div className={`h-full ${width} rounded-full bg-[#6bd89a]`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

        <section className="mt-8 overflow-hidden rounded-[30px] border border-[#dfece4] bg-[#17372a] p-5 text-white shadow-[0_18px_45px_rgba(28,70,48,0.12)] sm:p-7 md:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black tracking-[0.14em] text-[#7ce0a8]">REAL PRODUCT</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
              真的就是這樣刷。
            </h2>
            <p className="mt-3 text-sm font-bold leading-7 text-[#c9ddd2] sm:text-base">
              從歷屆試題作答、AI 考點整理，到最後回頭看弱點，整段流程都留在同一個網站裡。
            </p>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <figure className="overflow-hidden rounded-[24px] border border-white/15 bg-white p-2 shadow-[0_14px_36px_rgba(0,0,0,0.16)] sm:p-3">
              <QuestionPreview />
              <figcaption className="px-2 pb-1 pt-3 text-sm font-black text-[#17372a]">
                歷屆國考題直接線上作答
              </figcaption>
            </figure>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <figure className="overflow-hidden rounded-[24px] border border-white/15 bg-white p-2 shadow-[0_14px_36px_rgba(0,0,0,0.14)] sm:p-3">
                <ReviewPreview />
                <figcaption className="px-2 pb-1 pt-3 text-sm font-black text-[#17372a]">
                  AI 詳解與 Smart Review
                </figcaption>
              </figure>

              <figure className="overflow-hidden rounded-[24px] border border-white/15 bg-white p-2 shadow-[0_14px_36px_rgba(0,0,0,0.14)] sm:p-3">
                <WeaknessPreview />
                <figcaption className="px-2 pb-1 pt-3 text-sm font-black text-[#17372a]">
                  從作答紀錄找出弱主題
                </figcaption>
              </figure>
            </div>
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
