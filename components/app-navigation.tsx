"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/study", label: "學習" },
  { href: "/study/records", label: "學習紀錄" },
  { href: "/slimes", label: "史萊姆" },
];

export default function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主要導覽"
      className="mt-5 grid grid-cols-3 gap-2 rounded-[20px] border border-[#dceae2] bg-white p-1.5 shadow-[0_8px_22px_rgba(30,78,50,0.04)]"
    >
      {navigationItems.map((item) => {
        const active = isActive(item.href, pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex min-h-11 items-center justify-center rounded-2xl px-2 text-xs font-black transition sm:text-sm",
              active
                ? "bg-[#e8f8ed] text-[#237849]"
                : "text-[#789083] hover:bg-[#f5faf7] hover:text-[#315b45]",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function isActive(href: string, pathname: string) {
  if (href === "/study") {
    return pathname === "/study" || (pathname.startsWith("/study/") && !pathname.startsWith("/study/records"));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
