import Link from "next/link";
import TopBar from "@/components/top-bar";

const CONTACT_EMAIL = "jasonwannaretire@gmail.com";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-5 md:px-8 md:py-10">
        <TopBar showBack backHref="/" backLabel="返回首頁" />

        <section className="mt-8 rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-[0_14px_36px_rgba(31,83,53,0.05)] sm:p-8">
          <div className="text-xs font-black tracking-[0.12em] text-[#2ba962]">TERMS</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">服務條款與著作權</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-[#70877a] sm:text-base">
            最後更新：2026 年 9 月 9 日
          </p>
        </section>

        <PolicySection title="服務定位與免責說明">
          <p>
            MedSlime 是獨立製作的學習工具，並非考選部、學校、醫院或任何政府機關的官方服務。網站中的 AI 內容、整理與學習提示僅供學習參考，不應取代官方試題、標準答案、教材、授課內容或專業判斷。
          </p>
        </PolicySection>

        <PolicySection title="國考試題來源與著作權">
          <p>
            MedSlime 顯示的國考試題與測驗題標準答案整理自考選部公開資料。依考選部著作權聲明，依法令舉行之各類考試試題及其備用試題屬著作權法第 9 條所列不得為著作權標的之內容；引用考選部網站資料時仍應註明來源並維持資料完整。
          </p>
          <a
            href="https://wwwc.moex.gov.tw/main/content/wfrmContent.aspx?menu_id=102"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex font-black text-[#2a9d5e] underline underline-offset-4"
          >
            查看考選部著作權聲明 ↗
          </a>
        </PolicySection>

        <PolicySection title="MedSlime 原創內容">
          <p>
            除另有標示、國考公開試題、第三方服務或使用者上傳內容外，MedSlime 的原創介面、文字設計、品牌元素、史萊姆角色與相關素材均屬其創作者所有。未經同意，不得將這些原創內容大量重製、轉售、冒名發布或作為其他商業服務的主要內容。
          </p>
        </PolicySection>

        <PolicySection title="使用者上傳內容">
          <p>
            你應只上傳自己有權使用的教材、講義、PDF 或其他內容。你保留原內容的權利；但為了執行你要求的摘要、出題、解析、保存或其他學習功能，你同意 MedSlime 在必要範圍內處理該內容。
          </p>
        </PolicySection>

        <PolicySection title="付費學習服務、付款與交易異常">
          <p>
            MedSlime 的付費內容為線上學習服務，包括 MedSlime Pro 會員方案與指定國考考卷的完整數位詳解。實際服務內容與價格以購買當下商城或題庫頁面顯示為準。付款由合作金流服務處理，付款完成後由 MedSlime 驗證交易結果並開通對應會員服務或指定數位內容。
          </p>
          <p className="mt-3">
            MedSlime 不提供以現金購買金幣、抽卡券、AI 次數、點數、錢包餘額或其他可儲值資產。站內金幣僅能透過學習、任務、專注與成就取得，且無法兌現、交易或轉讓。免費 AI 即時詳解的每日使用次數為服務使用上限，每日重新計算、未使用次數不累積，也不提供額外次數購買。
          </p>
          <p className="mt-3">
            若發生付款成功但服務未開通、重複扣款或其他交易異常，請盡快聯絡 MedSlime。退款、取消及其他消費者權利依適用法令與付款服務規則處理；依法不得排除的權利不因本條款而受影響。
          </p>
        </PolicySection>

        <PolicySection title="帳號與服務變更">
          <p>
            請勿利用 MedSlime 從事未授權存取、破壞服務、濫用 API、欺詐付款或其他違法行為。為維持服務品質與安全，MedSlime 可能調整功能、每日使用上限、價格或活動內容；重大變更會盡可能在網站上說明。
          </p>
        </PolicySection>

        <PolicySection title="聯絡方式">
          <p>若有著作權、付款、帳號或其他服務問題，請寄信聯絡：</p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("MedSlime 服務相關問題")}`}
            className="mt-3 inline-flex font-black text-[#2a9d5e] underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
        </PolicySection>

        <div className="mt-6 flex flex-wrap gap-3 text-sm font-black">
          <Link href="/about" className="text-[#2a9d5e] underline underline-offset-4">資料來源與 AI 使用說明</Link>
          <Link href="/privacy" className="text-[#2a9d5e] underline underline-offset-4">隱私權政策</Link>
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
