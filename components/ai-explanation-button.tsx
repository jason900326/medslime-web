"use client";

import { useState } from "react";

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
  error?: string;
};

type FeedbackValue = "helpful" | "not_helpful";

export default function AIExplanationButton({
  payload,
}: {
  payload: AIExplanationPayload;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState<FeedbackValue | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const requestExplanation = async () => {
    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams({
        questionKey: payload.questionKey,
        source: payload.source,
      });

      const previewResponse = await fetch(
        `/api/ai-explanation?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const preview = (await previewResponse.json()) as PreviewResponse;

      if (!previewResponse.ok) {
        throw new Error(
          preview.error ?? "無法讀取 AI 詳解。",
        );
      }

      if (preview.cached && preview.explanation) {
        setResult(preview.explanation);
        return;
      }

      setShowConfirm(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "AI 詳解發生未知錯誤。",
      );
    } finally {
      setLoading(false);
    }
  };

  const generateExplanation = async () => {
    if (loading) return;

    setShowConfirm(false);
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/ai-explanation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.explanation) {
        throw new Error(
          data.error ?? "AI 詳解產生失敗，請稍後再試。",
        );
      }

      setResult(data.explanation);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "AI 詳解發生未知錯誤。",
      );
    } finally {
      setLoading(false);
    }
  };

  const sendFeedback = async (value: FeedbackValue) => {
    if (feedbackLoading) return;

    setFeedbackLoading(true);

    try {
      const response = await fetch(
        "/api/ai-explanation-feedback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questionKey: payload.questionKey,
            source: payload.source,
            sourceLabel: payload.sourceLabel,
            feedback: value,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data?.error ?? "回饋儲存失敗。",
        );
      }

      setFeedback(value);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "回饋儲存失敗。",
      );
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={requestExplanation}
        disabled={loading}
        className="rounded-xl border border-[#cfe7d8] bg-white px-4 py-2 text-sm font-black text-[#237849] transition hover:bg-[#f3fbf6] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "AI 正在整理詳解..." : "✨ AI 詳解"}
      </button>

      {errorMessage && (
        <div className="mt-3 rounded-xl border border-[#f0dddd] bg-[#fff8f8] px-4 py-3 text-sm font-bold text-[#9b5050]">
          {errorMessage}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4 rounded-[20px] border border-[#dfece4] bg-[#f8fcf9] p-5 text-left">
          <Section
            title="這題在考什麼"
            text={result.whatItTests}
          />

          <Section
            title="正確答案"
            text={result.correctAnswer}
          />

          <Section
            title="為什麼"
            text={result.whyCorrect}
          />

          <div>
            <div className="text-sm font-black text-[#2ba962]">
              其他選項為什麼錯
            </div>

            <div className="mt-2 space-y-2">
              {result.optionAnalysis.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[#dfe8e2] bg-white px-4 py-3 text-sm font-bold leading-6 text-[#60786c]"
                >
                  <span className="font-black text-[#315b45]">
                    {item.label}
                  </span>{" "}
                  {item.explanation}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-black text-[#2ba962]">
              快速整理
            </div>

            <ul className="mt-2 space-y-1.5 text-sm font-bold leading-6 text-[#60786c]">
              {result.quickSummary.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="flex gap-2"
                >
                  <span className="text-[#31c978]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Section
            title="國考記憶點"
            text={result.memoryPoint}
          />

          {result.commonTrap.trim() && (
            <Section
              title="常見陷阱"
              text={result.commonTrap}
            />
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

      {showConfirm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-md rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-2xl">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
              MEDSLIME AI
            </div>

            <div className="mt-2 text-2xl font-black text-[#17372a]">
              產生 AI 詳解？
            </div>

            <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
              MedSlime 會整理這題的考點、正解理由、其他選項與國考記憶點。
            </p>

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
                onClick={generateExplanation}
                className="rounded-xl bg-[#31c978] px-4 py-3 font-black text-white transition hover:bg-[#2dbc70]"
              >
                產生詳解
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div>
      <div className="text-sm font-black text-[#2ba962]">
        {title}
      </div>
      <div className="mt-1 text-sm font-bold leading-7 text-[#60786c]">
        {text}
      </div>
    </div>
  );
}
