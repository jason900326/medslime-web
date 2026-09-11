"use client";

import { useEffect, useState } from "react";

type ScrollState = {
  scrollable: boolean;
  atTop: boolean;
  atBottom: boolean;
};

export default function ScrollJumpButtons() {
  const [state, setState] = useState<ScrollState>({
    scrollable: false,
    atTop: true,
    atBottom: false,
  });

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

      setState({
        scrollable: maxScroll >= 120,
        atTop: scrollTop <= 80,
        atBottom: maxScroll - scrollTop <= 80,
      });
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

  if (!state.scrollable) return null;

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBottom = () => {
    window.scrollTo({
      top: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      behavior: "smooth",
    });
  };

  const buttonClass =
    "flex h-12 w-12 items-center justify-center rounded-full border border-[#d5e5dc] bg-white/95 text-xl font-black text-[#315b45] shadow-[0_10px_28px_rgba(31,83,53,0.16)] backdrop-blur transition enabled:hover:-translate-y-0.5 enabled:hover:bg-[#f5faf7] disabled:cursor-default disabled:opacity-35";

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col gap-2 md:bottom-7 md:right-7">
      <button
        type="button"
        onClick={goTop}
        disabled={state.atTop}
        aria-label="一鍵到頂部"
        title="一鍵到頂部"
        className={buttonClass}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={goBottom}
        disabled={state.atBottom}
        aria-label="一鍵到底部"
        title="一鍵到底部"
        className={buttonClass}
      >
        ↓
      </button>
    </div>
  );
}
