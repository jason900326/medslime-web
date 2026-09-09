"use client";

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

type GenerateResponse = {
  cached: boolean;
  explanation?: ExplanationResult;
  code?: string;
  error?: string;
};

type EntitlementResponse = {
  aiDetailFreeRemaining?: number;
  aiDetailFreeDailyLimit?: number;
  error?: string;
};

type FeedbackValue = "helpful" | "not_helpful";

type DailyUsage = {
  remaining: number;
  limit: number;
};

export default function AIExplanationButton({
  payload,
}: {
  payload: AIExplanationPayload;
}) {
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailResult, setDetailResult] = useState<ExplanationResult | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDailyLimitReached, setShowDailyLimitReached] = useState(false);
  const [usage, setUsage] = useState<DailyUsage | null>(null);
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

  const loadUsage = async () => {
    const response = await fetch("/api/entitlements", { cache: "no-store" });
    const data = (await response.json()) as EntitlementResponse;
    if (!response.ok) {
      throw new Error(data.error ?? "無法讀取今日完整詳解使用狀態。");
    }

    const nextUsage = {
      remaining: Math.max(0, Number(data.aiDetailFreeRemaining ?? 0)),
      limit: Math.max(0, Number(data.aiDetailFreeDailyLimit ?? 5)),
    };
    setUsage(nextUsage);
    return nextUsage;
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
    setShowDailyLimitReached(false);

    try {
      const current = await loadUsage();
      if (current.remaining <= 0) {
        setShowDailyLimitReached(true);
        return;
      }

      setShowConfirm(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "完整詳解發生未知錯誤。",
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
    setShowDailyLimitReached(false);

    try {
      const response = await fetch("/api/ai-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.explanation) {
        if (
          response.status === 402 ||
          data.code === "AI_DETAIL_CREDIT_REQUIRED" ||
          data.code === "AI_DETAIL_DAILY_LIMIT_REACHED"
        ) {
          setShowDailyLimitReached(true);
          return;
        }
        throw new Error(data.error ?? "完整詳解產生失敗，請稍後再試。");
      }

      const current = await loadUsage();
      setDetailResult(data.explanation);
      setDetailOpen(true);
      setNoticeMessage(
        `今日完整詳解還可使用 ${current.remaining} / ${current.limit} 次。`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "完整詳解發生未知錯誤。",
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
      <button
        type="button"
        onClick={requestDetailedExplanation}
        disabled={detailLoading}
        className="rounded-xl border border-[#cfd9e7] bg-white px-4 py-2 text-sm font-black text-[#3f607e] transition hover:bg-[#f5f8fb] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {detailLoading
          ? "正在整理完整詳解..."
          : detailResult && detailOpen
            ? "收起完整詳解"
            : "📚 查看完整詳解"}
      </button>

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

      {detailResult && detailOpen && (
        <div className="mt-4 space-y-4 rounded-[20px] border border-[#dfece4] bg-[#f8fcf9] p-5 text-left">
          <div className="flex items-center justify-between gap-3 border-b border-[#dfece4] pb-3">
            <div className="text-sm font-black text-[#315b45]">完整詳解</div>
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

      {showConfirm && usage && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-md rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-2xl">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              MEDSLIME DETAIL
            </div>
            <div className="mt-2 text-2xl font-black text-[#17372a]">
              查看這題的完整詳解？
            </div>
            <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
              系統會直接整理並顯示這題的完整解析。這次會計入今天的完整詳解使用次數。
            </p>
            <div className="mt-4 rounded-2xl bg-[#f3fbf6] px-4 py-3 text-sm font-black leading-6 text-[#315b45]">
              今日目前還可使用 {usage.remaining} / {usage.limit} 次
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
                查看完整詳解
              </button>
            </div>
          </div>
        </div>
      )}

      {showDailyLimitReached && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-md rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-2xl">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              MEDSLIME DETAIL
            </div>
            <div className="mt-2 text-2xl font-black text-[#17372a]">
              今日完整詳解已達上限
            </div>
            <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
              免費帳號每天可查看 5 題完整詳解，每日重新計算，未使用次數不累積，也不提供額外次數購買。
            </p>
            <button
              type="button"
              onClick={() => setShowDailyLimitReached(false)}
              className="mt-6 w-full rounded-xl bg-[#31c978] px-4 py-3 font-black text-white transition hover:bg-[#2dbc70]"
            >
              知道了
            </button>
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
