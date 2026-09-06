import Link from "next/link";
import TopBar from "@/components/top-bar";

const CONTACT_EMAIL = "jasonwannaretire@gmail.com";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-5 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-8 rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-[0_14px_36px_rgba(31,83,53,0.05)] sm:p-8">
          <div className="text-xs font-black tracking-[0.12em] text-[#2ba962]">ABOUT & SOURCES</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">資料來源與 AI 使用說明</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-[#70877a] sm:text-base">
            MedSlime 是獨立製作的醫檢師國考學習工具，不是考選部、學校、醫院或任何政府機關的官方網站。
          </p>
        </section>

        <InfoSection title="國考試題與標準答案">
          <p>
            MedSlime 的國考題庫整理自考選部公開的歷年考畢試題與測驗題標準答案。題目、答案與考試資訊若有差異，請以考選部最新公布內容為準。
          </p>
          <a
            href="https://wwwq.moex.gov.tw/exam/wFrmExamQandASearch.aspx"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex font-black text-[#2a9d5e] underline underline-offset-4"
          >
            前往考選部考畢試題查詢平臺 ↗
          </a>
        </InfoSection>

        <InfoSection title="AI 解析與 AI 詳解">
          <p>
            AI 內容由 MedSlime 串接 OpenAI API 協助產生。AI 解析的用途是幫助理解考點、正確答案理由與其他選項差異，不代表官方解答，也可能出現錯誤、遺漏或不精確內容。
          </p>
          <p className="mt-3">
            國考題目的正確答案仍以考選部公布的標準答案為準；教材題目則應以原教材與授課內容為優先依據。
          </p>
        </InfoSection>

        <InfoSection title="使用者上傳教材">
          <p>
            使用者應只上傳自己有權使用的教材、講義或文件。MedSlime 會依功能需要處理教材內容，並可能將必要的文字內容傳送至 AI 服務以完成摘要、出題或解析。
          </p>
        </InfoSection>

        <InfoSection title="發現題目或解析有問題？">
          <p>如果你發現答案、題目文字、AI 解析或網站功能有問題，歡迎直接回報。</p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("MedSlime 問題回報")}`}
            className="mt-3 inline-flex rounded-xl bg-[#31c978] px-4 py-3 text-sm font-black text-white"
          >
            寄信給我 · {CONTACT_EMAIL}
          </a>
        </InfoSection>

        <div className="mt-6 flex flex-wrap gap-3 text-sm font-black">
          <Link href="/privacy" className="text-[#2a9d5e] underline underline-offset-4">隱私權政策</Link>
          <Link href="/terms" className="text-[#2a9d5e] underline underline-offset-4">服務條款與著作權</Link>
        </div>
      </div>
    </main>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-[24px] border border-[#dfece4] bg-white p-5 text-sm font-bold leading-7 text-[#617a6e] shadow-[0_8px_22px_rgba(31,83,53,0.035)] sm:p-6 sm:text-base">
      <h2 className="text-xl font-black text-[#17372a]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
