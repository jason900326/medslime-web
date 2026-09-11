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

type StudyAidFormat =
  | "none"
  | "bullets"
  | "comparison_table"
  | "steps"
  | "formula"
  | "interpretation";

type ExplanationResult = {
  version: "adaptive-v2";
  whatItTests: string;
  correctAnswer: string;
  whyCorrect: string;
  optionAnalysis: Array<{ label: string; explanation: string }>;
  keyTakeaways: string[];
  memoryPoint: string;
  commonTrap: string;
  studyAid: {
    format: StudyAidFormat;
    title: string;
    bullets: string[];
    tableHeaders: string[];
    tableRows: string[][];
    steps: string[];
    formulaLines: string[];
    interpretationClues: string[];
  };
};

type GenerateResponse = {
  cached: boolean;
  explanation?: ExplanationResult;
  accessSource?: "exam_entitlement" | "daily_limit";
  aiDetailRemaining?: number | null;
  code?: string;
  error?: string;
};

type AvailabilityResponse = {
  available?: boolean;
  purchasedExamAccess?: boolean;
  error?: string;
};

type EntitlementResponse = {
  aiDetailFreeRemaining?: number;
  aiDetailFreeDailyLimit?: number;
  error?: string;
};

type FeedbackValue = "helpful" | "not_helpful";
type DailyUsage = { remaining: number; limit: number };

export default function AIExplanationButton({
  payload,
  directPurchasedAccess = false,
  buttonLabel,
  onAddToNote,
}: {
  payload: AIExplanationPayload;
  directPurchasedAccess?: boolean;
  buttonLabel?: string;
  onAddToNote?: (text: string) => void;
}) {
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailResult, setDetailResult] = useState<ExplanationResult | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDailyLimitReached, setShowDailyLimitReached] = useState(false);
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [purchasedExamAccess, setPurchasedExamAccess] = useState(directPurchasedAccess);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState<FeedbackValue | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    if (!noticeMessage) return;
    const timer = window.setTimeout(() => setNoticeMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [noticeMessage]);

  const loadUsage = async () => {
    const response = await fetch("/api/entitlements", { cache: "no-store" });
    const data = (await response.json()) as EntitlementResponse;
    if (!response.ok) {
      throw new Error(data.error ?? "無法讀取今日完整詳解使用狀態。");
    }
    const next = {
      remaining: Math.max(0, Number(data.aiDetailFreeRemaining ?? 0)),
      limit: Math.max(0, Number(data.aiDetailFreeDailyLimit ?? 5)),
    };
    setUsage(next);
    return next;
  };

  const loadPurchasedAccess = async () => {
    const params = new URLSearchParams({
      questionKey: payload.questionKey,
      source: payload.source,
    });
    const response = await fetch(`/api/ai-explanation?${params.toString()}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as AvailabilityResponse;
    if (!response.ok) {
      throw new Error(data.error ?? "無法確認完整詳解存取權限。");
    }
    return Boolean(data.purchasedExamAccess);
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
        if (response.status === 402 || data.code === "AI_DETAIL_DAILY_LIMIT_REACHED") {
          setShowDailyLimitReached(true);
          return;
        }
        throw new Error(data.error ?? "完整解析產生失敗，請稍後再試。");
      }

      if (directPurchasedAccess && data.accessSource !== "exam_entitlement") {
        throw new Error("這份考卷的解析權限目前無法確認，請重新整理後再試。");
      }

      setDetailResult(data.explanation);
      setDetailOpen(true);
      if (data.accessSource === "exam_entitlement") {
        setPurchasedExamAccess(true);
        if (!directPurchasedAccess) {
          setNoticeMessage("這份來源考卷已解鎖，本題不計入每日 5 次使用上限。");
        }
      } else {
        const current = await loadUsage();
        setNoticeMessage(`今日完整解析還可使用 ${current.remaining} / ${current.limit} 次。`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "完整解析發生未知錯誤。");
    } finally {
      setDetailLoading(false);
    }
  };

  const requestDetailedExplanation = async () => {
    if (detailLoading) return;
    if (detailResult) {
      setDetailOpen((current) => !current);
      return;
    }
    if (directPurchasedAccess) {
      setPurchasedExamAccess(true);
      await generateDetailedExplanation();
      return;
    }

    setDetailLoading(true);
    setErrorMessage("");
    setNoticeMessage("");
    setShowDailyLimitReached(false);
    try {
      const hasPurchasedAccess = await loadPurchasedAccess();
      setPurchasedExamAccess(hasPurchasedAccess);
      if (hasPurchasedAccess) {
        setDetailLoading(false);
        await generateDetailedExplanation();
        return;
      }
      const current = await loadUsage();
      if (current.remaining <= 0) {
        setShowDailyLimitReached(true);
        return;
      }
      setShowConfirm(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "完整解析發生未知錯誤。");
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
      setErrorMessage(error instanceof Error ? error.message : "回饋儲存失敗。");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const idleLabel = buttonLabel ?? (directPurchasedAccess ? "查看完整解析" : "📚 查看完整解析");

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={requestDetailedExplanation}
        disabled={detailLoading}
        className="rounded-xl border border-[#cfd9e7] bg-white px-4 py-2.5 text-sm font-black text-[#3f607e] transition hover:bg-[#f5f8fb] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {detailLoading
          ? "正在整理解析…"
          : detailResult && detailOpen
            ? "收起完整解析"
            : idleLabel}
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
        <div className="mt-4 space-y-5 rounded-[22px] border border-[#dfece4] bg-[#f8fcf9] p-5 text-left sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-[#dfece4] pb-3">
            <div>
              <div className="text-sm font-black text-[#315b45]">完整解析</div>
              <div className="mt-0.5 text-[11px] font-bold text-[#91a298]">Adaptive V2</div>
            </div>
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="text-xs font-black text-[#789083] hover:text-[#315b45]"
            >
              收起
            </button>
          </div>

          <TextSection title="這題在考什麼" text={detailResult.whatItTests} />
          <TextSection title="正確答案" text={detailResult.correctAnswer} />
          <TextSection title="解題邏輯" text={detailResult.whyCorrect} />

          <section>
            <div className="text-sm font-black text-[#2ba962]">選項解析</div>
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
          </section>

          <AdaptiveStudyAid aid={detailResult.studyAid} onAddToNote={onAddToNote} />

          <section>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-[#2ba962]">帶走這幾點</div>
              {onAddToNote && (
                <AddToNoteButton onClick={() => onAddToNote(detailResult.keyTakeaways.join("；"))} />
              )}
            </div>
            <ul className="mt-2 space-y-1.5 text-sm font-bold leading-6 text-[#60786c]">
              {detailResult.keyTakeaways.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="text-[#31c978]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <TextSection title="國考記憶點" text={detailResult.memoryPoint} onAddToNote={onAddToNote} />
          {detailResult.commonTrap.trim() && (
            <TextSection title="常見陷阱" text={detailResult.commonTrap} onAddToNote={onAddToNote} />
          )}

          <div className="border-t border-[#dfece4] pt-4">
            <div className="text-sm font-black text-[#315b45]">這份解析對你有幫助嗎？</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <FeedbackButton
                active={feedback === "helpful"}
                disabled={feedbackLoading}
                onClick={() => sendFeedback("helpful")}
              >
                👍 有幫助
              </FeedbackButton>
              <FeedbackButton
                active={feedback === "not_helpful"}
                danger
                disabled={feedbackLoading}
                onClick={() => sendFeedback("not_helpful")}
              >
                👎 沒有幫助
              </FeedbackButton>
            </div>
          </div>
        </div>
      )}

      {showConfirm && usage && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-md rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-2xl">
            <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">MEDSLIME DETAIL</div>
            <div className="mt-2 text-2xl font-black text-[#17372a]">查看這題的完整解析？</div>
            <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
              這次會計入今天的免費完整解析使用次數；解析只在你需要時載入。
            </p>
            <div className="mt-4 rounded-2xl bg-[#f3fbf6] px-4 py-3 text-sm font-black text-[#315b45]">
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
                className="rounded-xl bg-[#31c978] px-4 py-3 font-black text-white"
              >
                查看解析
              </button>
            </div>
          </div>
        </div>
      )}

      {showDailyLimitReached && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-md rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-2xl">
            <div className="text-2xl font-black text-[#17372a]">今天的免費解析次數已用完</div>
            <p className="mt-3 text-sm font-bold leading-7 text-[#70877a]">
              免費額度每天重新計算且不累積。若這題屬於你已購買的國考詳解，重新整理後仍會依購買權限開放。
            </p>
            <button
              type="button"
              onClick={() => setShowDailyLimitReached(false)}
              className="mt-5 w-full rounded-xl bg-[#31c978] px-4 py-3 font-black text-white"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdaptiveStudyAid({
  aid,
  onAddToNote,
}: {
  aid: ExplanationResult["studyAid"];
  onAddToNote?: (text: string) => void;
}) {
  if (!aid || aid.format === "none") return null;
  const noteText = studyAidToNote(aid);
  return (
    <section className="rounded-2xl border border-[#d8e7de] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black tracking-[0.08em] text-[#789083]">SMART REVIEW</div>
          <div className="mt-1 text-sm font-black text-[#2ba962]">{aid.title || studyAidDefaultTitle(aid.format)}</div>
        </div>
        {onAddToNote && noteText && <AddToNoteButton onClick={() => onAddToNote(noteText)} />}
      </div>

      {aid.format === "comparison_table" && aid.tableHeaders.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-[#e1e9e4]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#f3fbf6] text-[#315b45]">
              <tr>
                {aid.tableHeaders.map((header, index) => (
                  <th key={`${header}-${index}`} className="border-b border-[#e1e9e4] px-3 py-2.5 font-black">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white text-[#60786c]">
              {aid.tableRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {aid.tableHeaders.map((_, cellIndex) => (
                    <td key={cellIndex} className="border-b border-[#eef2ef] px-3 py-2.5 font-bold align-top">
                      {row[cellIndex] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {aid.format === "bullets" && <BulletList items={aid.bullets} />}
      {aid.format === "steps" && <NumberedList items={aid.steps} />}
      {aid.format === "formula" && <CodeLikeList items={aid.formulaLines} />}
      {aid.format === "interpretation" && <BulletList items={aid.interpretationClues} />}
    </section>
  );
}

function TextSection({
  title,
  text,
  onAddToNote,
}: {
  title: string;
  text: string;
  onAddToNote?: (text: string) => void;
}) {
  if (!text.trim()) return null;
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-[#2ba962]">{title}</div>
        {onAddToNote && <AddToNoteButton onClick={() => onAddToNote(text)} />}
      </div>
      <div className="mt-1.5 text-sm font-bold leading-7 text-[#60786c]">{text}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm font-bold leading-6 text-[#60786c]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2">
          <span className="text-[#31c978]">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="mt-3 space-y-2 text-sm font-bold leading-6 text-[#60786c]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eaf9f0] text-xs font-black text-[#237849]">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function CodeLikeList({ items }: { items: string[] }) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="rounded-xl bg-[#f7faf8] px-4 py-3 font-mono text-sm font-bold leading-6 text-[#315b45]">
          {item}
        </div>
      ))}
    </div>
  );
}

function AddToNoteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-lg border border-[#d7e7de] bg-white px-2.5 py-1.5 text-[11px] font-black text-[#557768] hover:bg-[#f5faf7]"
    >
      ＋ 加到筆記
    </button>
  );
}

function FeedbackButton({
  active,
  danger = false,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-xl border px-4 py-2 text-sm font-black transition",
        active
          ? danger
            ? "border-[#e6a2a2] bg-[#fff1f1] text-[#8b4747]"
            : "border-[#31c978] bg-[#eaf9f0] text-[#237849]"
          : "border-[#d7e7de] bg-white text-[#315b45] hover:bg-[#f5faf7]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function studyAidDefaultTitle(format: StudyAidFormat) {
  if (format === "comparison_table") return "易混淆比較";
  if (format === "steps") return "解題流程";
  if (format === "formula") return "公式與代入";
  if (format === "interpretation") return "判讀線索";
  return "快速整理";
}

function studyAidToNote(aid: ExplanationResult["studyAid"]) {
  if (aid.format === "comparison_table") {
    const rows = aid.tableRows.map((row) => row.join(" / "));
    return [aid.title, aid.tableHeaders.join(" / "), ...rows].filter(Boolean).join("；");
  }
  const items =
    aid.format === "bullets"
      ? aid.bullets
      : aid.format === "steps"
        ? aid.steps
        : aid.format === "formula"
          ? aid.formulaLines
          : aid.format === "interpretation"
            ? aid.interpretationClues
            : [];
  return [aid.title, ...items].filter(Boolean).join("；");
}
