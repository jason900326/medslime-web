"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartNoAxesCombined, Smile } from "lucide-react";

const navigationItems = [
  { href: "/study", label: "學習", icon: BookOpen },
  { href: "/study/records", label: "學習紀錄", icon: ChartNoAxesCombined },
  { href: "/slimes", label: "史萊姆", icon: Smile },
];

export default function AppNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="主要導覽" className="mt-5 flex gap-2 border-b border-[#dce7df] sm:gap-6">
      {navigationItems.map(({ icon: Icon, ...item }) => {
        const active = item.href === "/study"
          ? pathname === "/study" || (pathname.startsWith("/study/") && !pathname.startsWith("/study/records"))
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            className={`-mb-px flex min-h-12 flex-1 items-center justify-center gap-2 border-b-2 px-2 text-sm font-semibold transition sm:flex-none sm:px-4 ${active ? "border-[#27835b] text-[#236c4d]" : "border-transparent text-[#61786b] hover:border-[#b7ccbf] hover:text-[#17372a]"}`}>
            <Icon size={17} aria-hidden="true" />{item.label}
          </Link>
        );
      })}
    </nav>
  );
}
