"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuthUser } from "@/hooks/use-auth-user";

type FeedbackType = "bug" | "confusing" | "suggestion" | "other";

const feedbackOptions: Array<{
  value: FeedbackType;
  label: string;
}> = [
  { value: "bug", label: "🐛 遇到問題" },
  { value: "confusing", label: "😵 哪裡看不懂" },
  { value: "suggestion", label: "💡 功能建議" },
  { value: "other", label: "✍️ 其他" },
];

export default function BetaFeedbackButton() {
  const pathname = usePathname();
  const auth = useAuthUser();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!auth.isLoggedIn) {
    return null;
  }

  const submit = async () => {
    const trimmed = message.trim();

    if (!trimmed || sending) return;

    setSending(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/beta-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          message: trimmed,
          pathname,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ?? "回饋送出失敗，請稍後再試。",
        );
      }

      setSent(true);
      setMessage("");

      window.setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 1200);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "回饋送出失敗，請稍後再試。",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSent(false);
          setErrorMessage("");
        }}
        className="fixed bottom-5 left-5 z-[120] rounded-full border border-[#cfe7d8] bg-white px-4 py-3 text-sm font-black text-[#237849] shadow-[0_10px_28px_rgba(31,83,53,0.15)] transition hover:bg-[#f3fbf6]"
        aria-label="提供 Beta 測試回饋"
      >
        💬 測試回饋
      </button>

      {open && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/35 px-5 py-8">
          <div className="w-full max-w-lg rounded-[28px] border border-[#d8e9df] bg-white p-6 shadow-2xl">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              BETA FEEDBACK
            </div>

            <h2 className="mt-2 text-2xl font-black text-[#17372a]">
              跟我說哪裡怪怪的。
            </h2>

            <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
              你現在所在頁面會自動一起記錄，不用另外描述網址。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {feedbackOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-black transition",
                    type === option.value
                      ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                      : "border-[#dbe9e1] bg-white text-[#466a58] hover:bg-[#f5faf7]",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="例如：我按 AI 詳解之後不知道要等多久、這顆按鈕我看不懂是做什麼的..."
              rows={6}
              className="mt-4 w-full resize-none rounded-2xl border border-[#d7e7de] bg-white px-4 py-3 text-sm font-bold leading-6 text-[#17372a] outline-none placeholder:text-[#a2b2a8] focus:border-[#65d795]"
            />

            {errorMessage && (
              <div className="mt-3 rounded-xl border border-[#f0dddd] bg-[#fff8f8] px-4 py-3 text-sm font-bold text-[#9b5050]">
                {errorMessage}
              </div>
            )}

            {sent && (
              <div className="mt-3 rounded-xl border border-[#cfe7d8] bg-[#eefaf2] px-4 py-3 text-sm font-black text-[#237849]">
                ✓ 收到，謝謝你幫忙測試。
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-black text-[#315b45]"
              >
                關閉
              </button>

              <button
                type="button"
                disabled={!message.trim() || sending}
                onClick={submit}
                className="rounded-xl bg-[#31c978] px-4 py-3 font-black text-white transition hover:bg-[#2dbc70] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "送出中..." : "送出回饋"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
