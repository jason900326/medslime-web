"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function InfoDialogButton({
  title,
  children,
  label = "說明",
}: {
  title: string;
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-[#cfe2d6] bg-white px-4 text-sm font-black text-[#315b45] shadow-sm transition hover:bg-[#f7fbf8]"
      >
        ⓘ {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/35 px-5 py-8"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="w-full max-w-md rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
                  INFORMATION
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#17372a]">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="關閉說明"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce9e1] bg-[#f8fcf9] text-lg font-black text-[#60786c]"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm font-bold leading-7 text-[#668276]">
              {children}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-xl bg-[#31c978] px-4 py-3 font-black text-white"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
