import Link from "next/link";
import TopBar from "@/components/top-bar";

const CONTACT_EMAIL = "jasonwannaretire@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-5 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-8 rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-[0_14px_36px_rgba(31,83,53,0.05)] sm:p-8">
          <div className="text-xs font-black tracking-[0.12em] text-[#2ba962]">PRIVACY</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">隱私權政策</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-[#70877a] sm:text-base">
            最後更新：2026 年 9 月 6 日
          </p>
        </section>

        <PolicySection title="我們可能處理哪些資料">
          <ul className="list-disc space-y-2 pl-5">
            <li>帳號資料，例如 Email、Google 登入識別資訊與顯示名稱。</li>
            <li>學習資料，例如作答、錯題、任務、專注時間、成就與史萊姆收藏進度。</li>
            <li>你主動上傳的教材及為提供功能而擷取的必要內容。</li>
            <li>交易與額度資料，例如訂單編號、付款狀態、金幣與 AI 詳解額度；完整付款資訊由綠界付款頁處理。</li>
            <li>你主動送出的問題回報，例如聯絡 Email、問題類型、描述、相關頁面網址與必要的瀏覽器資訊。</li>
            <li>維運所需的技術資訊，例如錯誤紀錄與基本請求資訊。</li>
          </ul>
        </PolicySection>

        <PolicySection title="資料用途">
          <p>
            資料主要用於登入與帳號管理、保存學習進度、提供 AI 與教材功能、處理付款與虛擬資源入帳、處理使用者問題回報、偵錯、防止濫用，以及改善 MedSlime。
          </p>
        </PolicySection>

        <PolicySection title="第三方服務">
          <p>為了提供網站功能，MedSlime 可能使用下列第三方服務：</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Supabase：帳號驗證與資料庫。</li>
            <li>Vercel：網站託管與伺服器功能。</li>
            <li>OpenAI：AI 解析、詳解與教材相關功能。</li>
            <li>綠界科技 ECPay：付款處理。</li>
            <li>Google：使用者選擇 Google 登入時的身分驗證。</li>
          </ul>
          <p className="mt-3">
            各服務可能依其自身政策處理必要資料。使用 AI 功能或教材功能時，為完成你的請求，題目或必要教材文字可能會傳送至 AI 服務。
          </p>
        </PolicySection>

        <PolicySection title="資料保存與安全">
          <p>
            MedSlime 會在提供服務、維護帳號、處理交易、處理問題回報與履行必要法令義務所需的期間保存相關資料，並採取合理的技術措施降低未授權存取、遺失或濫用的風險。但任何網路服務都無法保證絕對安全。
          </p>
        </PolicySection>

        <PolicySection title="你的權利與聯絡方式">
          <p>
            若你希望查詢、更正、停止使用或刪除與你帳號相關的個人資料，或對隱私處理有疑問，可透過站內回報表單或下方 Email 聯絡。依法必須保留的交易或紀錄可能無法立即刪除。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href="/feedback"
              className="inline-flex rounded-xl bg-[#eefaf2] px-4 py-3 text-sm font-black text-[#237849]"
            >
              前往回報表單
            </Link>
            <span className="text-sm font-black text-[#557768]">{CONTACT_EMAIL}</span>
          </div>
        </PolicySection>

        <div className="mt-6 flex flex-wrap gap-3 text-sm font-black">
          <Link href="/about" className="text-[#2a9d5e] underline underline-offset-4">資料來源與 AI 使用說明</Link>
          <Link href="/terms" className="text-[#2a9d5e] underline underline-offset-4">服務條款與著作權</Link>
        </div>
      </div>
    </main>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-[24px] border border-[#dfece4] bg-white p-5 text-sm font-bold leading-7 text-[#617a6e] shadow-[0_8px_22px_rgba(31,83,53,0.035)] sm:p-6 sm:text-base">
      <h2 className="text-xl font-black text-[#17372a]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
