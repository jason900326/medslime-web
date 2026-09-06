"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CONTACT_EMAIL = "jasonwannaretire@gmail.com";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <footer className="bg-[#f8fcf9] px-4 pb-10 sm:px-5 md:px-8">
      <div className="mx-auto max-w-5xl rounded-[24px] border border-[#dfece4] bg-white px-5 py-5 shadow-[0_8px_22px_rgba(31,83,53,0.035)] sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-black text-[#17372a]">有問題、發現錯題或想聯絡我？</div>
            <div className="mt-1 text-xs font-bold leading-5 text-[#789083]">
              回報時如果能附上頁面、操作步驟與截圖，我會更容易找到問題。
            </div>
          </div>

          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("MedSlime 問題回報")}`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#eefaf2] px-4 py-3 text-sm font-black text-[#237849] transition hover:bg-[#e3f7eb]"
          >
            ✉️ 回報問題
          </a>
        </div>

        <div className="mt-4 border-t border-[#edf2ef] pt-4">
          <div className="text-xs font-bold text-[#789083]">{CONTACT_EMAIL}</div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-black text-[#557768]">
            <Link href="/about" className="hover:text-[#2a9d5e]">資料來源與 AI 說明</Link>
            <Link href="/privacy" className="hover:text-[#2a9d5e]">隱私權政策</Link>
            <Link href="/terms" className="hover:text-[#2a9d5e]">服務條款與著作權</Link>
          </div>
          <div className="mt-3 text-[11px] font-bold leading-5 text-[#9aa9a1]">
            MedSlime 為獨立製作的學習工具，非考選部或其他政府機關官方網站。
          </div>
        </div>
      </div>
    </footer>
  );
}
