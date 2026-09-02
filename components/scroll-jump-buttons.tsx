"use client";

import { useEffect, useState } from "react";

type VisibleButton = "top" | "bottom" | null;

export default function ScrollJumpButtons() {
  const [visibleButton, setVisibleButton] = useState<VisibleButton>(null);

  useEffect(() => {
    const update = () => {
      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      const viewportHeight = window.innerHeight;
      const pageHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );

      const maxScroll = Math.max(0, pageHeight - viewportHeight);

      // 頁面短到根本不需要捲動時，兩顆都不顯示。
      if (maxScroll < 120) {
        setVisibleButton(null);
        return;
      }

      // 邏輯：
      // - 靠近頁面頂部：只顯示「到底部」
      // - 離開頂部後：只顯示「到頂部」
      // - 永遠不會同時出現
      if (scrollTop <= 120) {
        setVisibleButton("bottom");
      } else {
        setVisibleButton("top");
      }
    };

    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, []);

  if (!visibleButton) return null;

  const goTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const goBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <button
      type="button"
      onClick={visibleButton === "top" ? goTop : goBottom}
      aria-label={
        visibleButton === "top"
          ? "一鍵到頂部"
          : "一鍵到底部"
      }
      title={
        visibleButton === "top"
          ? "一鍵到頂部"
          : "一鍵到底部"
      }
      className="fixed bottom-5 right-5 z-[90] flex h-12 w-12 items-center justify-center rounded-full border border-[#d5e5dc] bg-white/95 text-xl font-black text-[#315b45] shadow-[0_10px_28px_rgba(31,83,53,0.16)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-[#f5faf7] md:bottom-7 md:right-7"
    >
      {visibleButton === "top" ? "↑" : "↓"}
    </button>
  );
}
