"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, BarChart3, Target, Timer, FileUp, LayoutDashboard, Compass, Smile, ArrowLeft } from "lucide-react";
import TopBar from "@/components/top-bar";

const tools = [
  { href: "/study", label: "學習首頁", icon: LayoutDashboard },
  { href: "/study/exam", label: "國考題庫", icon: BookOpen },
  { href: "/study/free-quiz", label: "自由測驗", icon: Target },
  { href: "/study/records", label: "學習紀錄", icon: BarChart3 },
  { href: "/study/records/what-to-study", label: "學習分析", icon: Compass },
  { href: "/study/focus", label: "專心讀書", icon: Timer },
  { href: "/study/material", label: "教材上傳", icon: FileUp },
];

export default function StudyShell({ children }: { children: React.ReactNode }) {
  const currentPathname = usePathname();
  const pathname = currentPathname === "/study/design-preview" ? "/study/records/what-to-study" : currentPathname;
  const router = useRouter();
  const active = pathname === "/slimes" ? "/slimes" : tools.filter(item => pathname === item.href || (item.href !== "/study" && pathname.startsWith(item.href + "/"))).sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/study";
  return (
    <main className="study-app">
      <a href="#study-content" className="study-skip">跳至主要內容</a>
      <aside className="study-sidebar">
        <Link href="/study" className="study-wordmark">MedSlime<span>.</span></Link>
        <p className="mb-7 mt-2 text-xs text-[#648071]">陪你把每一題，變成實力。</p>
        <p className="mb-3 px-3 text-[11px] font-semibold tracking-widest text-[#738779]">我的學習空間</p>
        <nav aria-label="學習工具" className="space-y-1">
          {tools.map(({ icon: Icon, ...item }) => <Link key={item.href} href={item.href} aria-current={active === item.href ? "page" : undefined} className={`study-nav-link ${active === item.href ? "is-active" : ""}`}><Icon size={18} aria-hidden="true" />{item.label}</Link>)}
        </nav>
        <div className="mt-8 space-y-1 border-t border-[#dae6dd] pt-5">
          <Link href="/slimes" aria-current={active === "/slimes" ? "page" : undefined} className={`study-nav-link ${active === "/slimes" ? "is-active" : ""}`}><Smile size={18} aria-hidden="true" />史萊姆圖鑑</Link>
          <Link href="/" className="study-nav-link"><ArrowLeft size={18} aria-hidden="true" />網站首頁</Link>
        </div>
      </aside>
      <div className="study-main">
        <div className="study-topbar"><TopBar /></div>
        <label className="study-mobile-nav">
          <span>學習工具</span>
          <select aria-label="切換學習工具" value={active} onChange={event => router.push(event.target.value)}>
            {tools.map(item => <option key={item.href} value={item.href}>{item.label}</option>)}
            <option value="/slimes">史萊姆圖鑑</option>
          </select>
        </label>
        <div id="study-content" tabIndex={-1} className="study-content">{children}</div>
      </div>
    </main>
  );
}
