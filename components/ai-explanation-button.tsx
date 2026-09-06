"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type AIExplanationPayload = {
  questionKey: string;
  source: "national-exam" | "material";
  sourceLabel: string;
  stem: string;
  options: string[];
  correctIndex: number | null;
  userAnswer: number | null;
  uncertain: boolean;
  existingExplanation?: string | null;
};

type ExplanationResult = {
  whatItTests: string;
  correctAnswer: string;
  whyCorrect: string;
  optionAnalysis: Array<{
    label: string;
    explanation: string;
  }>;
  quickSummary: string[];
  memoryPoint: string;
  commonTrap: string;
};

type PreviewResponse = {
  cached: boolean;
  explanation?: ExplanationResult;
  error?: string;
};

type GenerateResponse = {
  cached: boolean;
  explanation?: ExplanationResult;
  aiDetailCredits?: number;
  aiDetailCreditSource?: "free" | "paid";
  code?: string;
  error?: string;
};

type QuickResponse = {
  cached: boolean;
  quick?: string;
  error?: string;
};

type EntitlementResponse = {
  aiDetailCredits?: number;
  aiDetailPaidCredits?: number;
  aiDetailFreeRemaining?: number;
  aiDetailFreeDailyLimit?: number;
  error?: string;
};

type FeedbackValue = "helpful" | "not_helpful";

type Balance = {
  total: number;
  free: number;
  paid: number;
  freeLimit: number;
};

export default function AIExplanationButton({
  payload,
}: {
  payload: AIExplanationPayload;
}) {
  const [quickLoading, setQuickLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [quickResult, setQuickResult] = useState<string | null>(null);
  const [detailResult, setDetailResult] = useState<ExplanationResult | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState<FeedbackValue | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    if (!noticeMessage) return;

    const timer = window.setTimeout(() => {
      setNoticeMessage("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [noticeMessage]);

  const loadBalance = async () => {
    const response = await fetch("/api/entitlements", { cache: "no-store" });
    const data = (await response.json()) as EntitlementResponse;
    if (!response.ok) {
      throw new Error(data.error ?? "無法讀取 AI 詳解額度。");
    }

    const nextBalance = {
      total: Math.max(0, Number(data.aiDetailCredits ?? 0)),
      free: Math.max(0, Number(data.aiDetailFreeRemaining ?? 0)),
      paid: Math.max(0, Number(data.aiDetailPaidCredits ?? 0)),
      freeLimit: Math.max(0, Number(data.aiDetailFreeDailyLimit ?? 10)),
    };
    setBalance(nextBalance);
    return nextBalance;
  };

  const requestQuickExplanation = async () => {
    if (quickLoading) return;

    if (quickResult) {
      setQuickOpen((current) => !current);
      return;
    }

    setQuickLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams({
        questionKey: payload.questionKey,
        source: payload.source,
      });

      const previewResponse = await fetch(
        `/api/ai-quick-explanation?${params.toString()}`,
        { method: "GET", cache: "no-store" },
      );

      const preview = (await previewResponse.json()) as QuickResponse;
      if (!previewResponse.ok) {
        throw new Error(preview.error ?? "無法讀取 AI 解析。");
      }

      if (preview.cached && preview.quick) {
        setQuickResult(preview.quick);
        setQuickOpen(true);
        return;
      }

      const response = await fetch("/api/ai-quick-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as QuickResponse;

      if (!response.ok || !data.quick) {
        throw new Error(data.error ?? "AI 解析產生失敗，請稍後再試。");
      }

      setQuickResult(data.quick);
      setQuickOpen(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "AI 解析發生未知錯誤。",
      );
    } finally {
      setQuickLoading(false);
    }
  };

  const requestDetailedExplanation = async () => {
    if (detailLoading) return;

    if (detailResult) {
      setDetailOpen((current) => !current);
      return;
    }

    setDetailLoading(true);
    setErrorMessage("");
    setNoticeMessage("");
    setShowOutOfCredits(false);

    try {
      const params = new URLSearchParams({
        questionKey: payload.questionKey,
        source: payload.source,
      });

      const previewResponse = await fetch(
        `/api/ai-explanation?${params.toString()}`,
        { method: "GET", cache: "no-store" },
      );
      const preview = (await previewResponse.json()) as PreviewResponse;

      if (!previewResponse.ok) {
        throw new Error(preview.error ?? "無法讀取 AI 詳解。");
      }

      if (preview.cached && preview.explanation) {
        const current = await loadBalance();
        setDetailResult(preview.explanation);
        setDetailOpen(true);
        setNoticeMessage(
          `這題已有 AI 詳解快取，本次不扣額度。今日免費還有 ${current.free} / ${current.freeLimit} 次。`,
        );
        return;
      }

      const current = await loadBalance();
      if (current.total <= 0) {
        setShowOutOfCredits(true);
        return;
      }

      setShowConfirm(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "AI 詳解發生未知錯誤。",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const generateDetailedExplanation = async () => {
    if (detailLoading) return;

    setShowConfirm(false);
    setDetailLoading(true);
    setErrorMessage("");
    setNoticeMessage("");
    setShowOutOfCredits(false);

    try {
      const response = await fetch("/api/ai-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.explanation) {
        if (response.status === 402 || data.code === "AI_DETAIL_CREDIT_REQUIRED") {
          setShowOutOfCredits(true);
          return;
        }
        throw new Error(data.error ?? "AI 詳解產生失敗，請稍後再試。");
      }

      const current = await loadBalance();
      setDetailResult(data.explanation);
      setDetailOpen(true);

      if (data.cached) {
        setNoticeMessage(
          `這題已有 AI 詳解快取，本次不扣額度。今日免費還有 ${current.free} / ${current.freeLimit} 次。`,
        );
      } else if (data.aiDetailCreditSource === "paid") {
        setNoticeMessage(
          `已使用 1 次購買額度。購買額度還剩 ${current.paid} 次。`,
        );
      } else {
        setNoticeMessage(
          `已使用 1 次今日免費 AI 詳解。今日免費還剩 ${current.free} / ${current.freeLimit} 次。`,
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "AI 詳解發生未知錯誤。",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const sendFeedback = async (value: FeedbackValue) => {
    if (feedbackLoading) return;
    setFeedbackLoading(true);

    try {
      const response = await fetch("/api/ai-explanation-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionKey: payload.questionKey,
          source: payload.source,
          sourceLabel: payload.sourceLabel,
          feedback: value,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "回饋儲存失敗。");
      }
      setFeedback(value);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "回饋儲存失敗。",
      );
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={requestQuickExplanation}
          disabled={quickLoading}
          className="rounded-xl border border-[#cfe7d8] bg-white px-4 py-2 text-sm font-black text-[#237849] transition hover:bg-[#f3fbf6] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {quickLoading
            ? "AI 正在快速解析..."
            : quickResult && quickOpen
              ? "收起 AI 解析"
              : "✨ AI 解析"}
        </button>

        <button
          type="button"
          onClick={requestDetailedExplanation}
          disabled={detailLoading}
          className="rounded-xl border border-[#cfd9e7] bg-white px-4 py-2 text-sm font-black text-[#3f607e] transition hover:bg-[#f5f8fb] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {detailLoading
            ? "AI 正在整理詳解..."
            : detailResult && detailOpen
              ? "收起 AI 詳解"
              : "📚 AI 詳解"}
        </button>
      </div>

      {noticeMessage && (
        <div className="mt-3 rounded-xl border border-[#cfe7d8] bg-[#f3fbf6] px-4 py-3 text-sm font-bold leading-6 text-[#315b45]">
          {noticeMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 rounded-xl border border-[#f0dddd] bg-[#fff8f8] px-4 py-3 text-sm font-bold text-[#9b5050]">
          {errorMessage}
        </div>
      )}

      {quickResult && quickOpen && (
        <div className="mt-4 rounded-[18px] border border-[#dcebe2] bg-[#f8fcf9] p-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-[#2ba962]">一句話解析</div>
            <button
              type="button"
              onClick={() => setQuickOpen(false)}
              className="text-xs font-black text-[#789083] hover:text-[#315b45]"
            >
              收起
            </button>
          </div>
          <div className="mt-2 text-sm font-bold leading-7 text-[#536f60]">
            {quickResult}
          </div>
        </div>
      )}

      {detailResult && detailOpen && (
        <div className="mt-4 space-y-4 rounded-[20px] border border-[#dfece4] bg-[#f8fcf9] p-5 text-left">
          <div className="flex items-center justify-between gap-3 border-b border-[#dfece4] pb-3">
            <div className="text-sm font-black text-[#315b45]">AI 詳解</div>
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="text-xs font-black text-[#789083] hover:text-[#315b45]"
            >
              收起
            </button>
          </div>

          <Section title="這題在考什麼" text={detailResult.whatItTests} />
          <Section title="正確答案" text={detailResult.correctAnswer} />
          <Section title="為什麼" text={detailResult.whyCorrect} />

          <div>
            <div className="text-sm font-black text-[#2ba962]">其他選項為什麼錯</div>
            <div className="mt-2 space-y-2">
              {detailResult.optionAnalysis.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[#dfe8e2] bg-white px-4 py-3 text-sm font-bold leading-6 text-[#60786c]"
                >
                  <span className="font-black text-[#315b45]">{item.label}</span>{" "}
                  {item.explanation}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-black text-[#2ba962]">快速整理</div>
            <ul className="mt-2 space-y-1.5 text-sm font-bold leading-6 text-[#60786c]">
              {detailResult.quickSummary.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="text-[#31c978]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Section title="國考記憶點" text={detailResult.memoryPoint} />
          {detailResult.commonTrap.trim() && (
            <Section title="常見陷阱" text={detailResult.commonTrap} />
          )}

          <div className="border-t border-[#dfece4] pt-4">
            <div className="text-sm font-black text-[#315b45]">
              這份解析對你有幫助嗎？
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={feedbackLoading}
                onClick={() => sendFeedback("helpful")}
                className={[
                  "rounded-xl border px-4 py-2 text-sm font-black transition",
                  feedback === "helpful"
                    ? "border-[#31c978] bg-[#eaf9f0] text-[#237849]"
                    : "border-[#d7e7de] bg-white text-[#315b45] hover:bg-[#f5faf7]",
                ].join(" ")}
              >
                👍 有幫助
              </button>
              <button
                type="button"
                disabled={feedbackLoading}
                onClick={() => sendFeedback("not_helpful")}
                className={[
                  "rounded-xl border px-4 py-2 text-sm font-black transition",
                  feedback === "not_helpful"
                    ? "border-[#e6a2a2] bg-[#fff1f1] text-[#8b4747]"
                    : "border-[#d7e7de] bg-white text-[#315b45] hover:bg-[#f5faf7]",
                ].join(" ")}
              >
                👎 沒有幫助
              </button>
            </div>
            {feedback && (
              <div className="mt-2 text-xs font-bold text-[#789083]">
                收到，謝謝你的回饋。
              </div>
            )}
          </div>
        </div>
      )}

      {showConfirm && balance && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-md rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-2xl">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              MEDSLIME AI
            </div>
            <div className="mt-2 text-2xl font-black text-[#17372a]">
              使用 1 次 AI 詳解？
            </div>
            <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
              這題目前沒有快取，產生成功後會保存，同一題之後再查看不會重複扣除。
            </p>
            <div className="mt-4 rounded-2xl bg-[#f3fbf6] px-4 py-3 text-sm font-black leading-6 text-[#315b45]">
              {balance.free > 0 ? (
                <>
                  本次將使用今日免費額度。<br />
                  今日免費剩餘 {balance.free} / {balance.freeLimit} 次
                </>
              ) : (
                <>
                  今日免費額度已用完，本次將使用購買額度。<br />
                  購買額度剩餘 {balance.paid} 次
                </>
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-black text-[#315b45]"
              >
                先不要
              </button>
              <button
                type="button"
                onClick={generateDetailedExplanation}
                className="whitespace-nowrap rounded-xl bg-[#31c978] px-3 py-3 text-sm font-black text-white transition hover:bg-[#2dbc70] sm:px-4 sm:text-base"
              >
                使用 1 次並產生
              </button>
            </div>
          </div>
        </div>
      )}

      {showOutOfCredits && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-md rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-2xl">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              MEDSLIME AI
            </div>
            <div className="mt-2 text-2xl font-black text-[#17372a]">
              今日免費 AI 詳解已用完
            </div>
            <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
              你今天的 10 次免費新詳解已使用完畢，目前也沒有可用的購買額度。已經產生過的快取詳解仍然可以免費查看。
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowOutOfCredits(false)}
                className="rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-black text-[#315b45]"
              >
                先不要
              </button>
              <Link
                href="/shop"
                className="flex items-center justify-center rounded-xl bg-[#31c978] px-4 py-3 text-center font-black text-white transition hover:bg-[#2dbc70]"
              >
                前往商城購買
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="text-sm font-black text-[#2ba962]">{title}</div>
      <div className="mt-1 text-sm font-bold leading-7 text-[#60786c]">{text}</div>
    </div>
  );
}
