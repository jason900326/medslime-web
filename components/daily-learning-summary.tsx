"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProStatus } from "@/hooks/use-pro-status";

type DirectionPayload = {
  isPro: boolean;
  dailySummary: {
    date: string;
    attemptCount: number;
    answeredCount: number;
    mainWeakness: { subject: string; topic: string } | null;
    improvement: { subject: string; topic: string; delta: number } | null;
    recommended: { subject: string; topic: string } | null;
  } | null;
};

type SummaryState =
  | { status: "idle" | "loading" }
  | { status: "ready"; direction: DirectionPayload }
  | { status: "hidden" };

const SEEN_KEY_PREFIX = "medslime_daily_learning_summary_seen_v2";

function taipeiDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function seenKey(userId: string, dayKey: string) {
  return `${SEEN_KEY_PREFIX}:${userId}:${dayKey}`;
}

function shortSubject(subject: string) {
  return subject
    .replace("（包括細菌與黴菌）", "")
    .replace("（包括細菌與真菌）", "")
    .replace("學與臨床", "／臨床")
    .trim();
}

export default function DailyLearningSummary() {
  const auth = useProStatus();
  const todayKey = useMemo(() => taipeiDayKey(new Date()), []);
  const [state, setState] = useState<SummaryState>({ status: "idle" });

  useEffect(() => {
    if (auth.loading || !auth.userId || !auth.isPro) return;

    const key = seenKey(auth.userId, todayKey);
    try {
      if (window.localStorage.getItem(key) === "1") {
        setState({ status: "hidden" });
        return;
      }
    } catch {
      // localStorage unavailable should not block the card.
    }

    let cancelled = false;
    setState({ status: "loading" });

    void fetch("/api/learning-direction", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("學習統整讀取失敗。");
        return (await response.json()) as DirectionPayload;
      })
      .then((direction) => {
        if (cancelled) return;
        setState({ status: "ready", direction });
        try {
          window.localStorage.setItem(key, "1");
        } catch {
          // Seeing the card is still useful even if persistence is unavailable.
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "hidden" });
      });

    return () => {
      cancelled = true;
    };
  }, [auth.isPro, auth.loading, auth.userId, todayKey]);

  if (auth.loading || !auth.isPro || state.status !== "ready") return null;

  const daily = state.direction.dailySummary;
  if (!daily) return null;

  const yesterdayCopy =
    daily.attemptCount > 0
      ? `昨天完成 ${daily.attemptCount} 次作答，共作答 ${daily.answeredCount} 題。`
      : "昨天沒有新的作答紀錄。";

  const weaknessCopy = daily.mainWeakness
    ? `昨天最容易失分的是 ${shortSubject(daily.mainWeakness.subject)}的「${daily.mainWeakness.topic}」。`
    : daily.attemptCount > 0
      ? "昨天的題目還沒有足夠 taxonomy 資料可以判定主要弱點。"
      : "今天可以先從長期優先補強項目開始。";

  const improvementCopy = daily.improvement
    ? `最近改善：${shortSubject(daily.improvement.subject)}的「${daily.improvement.topic}」有上升。`
    : "目前還看不到明顯的長期改善趨勢，先維持練習節奏。";

  const practiceHref = daily.recommended
    ? "/study/free-quiz/quiz?" +
      new URLSearchParams({
        from: "106",
        to: "115",
        subject: daily.recommended.subject,
        topic: daily.recommended.topic,
        count: "10",
      }).toString()
    : "/study/exam";

  const dismiss = () => setState({ status: "hidden" });

  return (
    <section className="mt-5 rounded-[22px] border border-[#eadba9] bg-[#fffaf0] px-5 py-4 shadow-[0_8px_22px_rgba(128,101,30,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-black tracking-[0.1em] text-[#9a7a2b]">
            昨日學習統整 · PRO
          </div>
          <div className="mt-2 text-sm font-black leading-6 text-[#5f4d1d]">
            {yesterdayCopy}
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-[#806a35]">
            {weaknessCopy}
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-[#8f7b49]">
            {improvementCopy}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="關閉昨日學習統整"
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-black text-[#9a8655] transition hover:bg-white/70"
        >
          ×
        </button>
      </div>

      <Link
        href={practiceHref}
        className="mt-4 inline-flex rounded-xl bg-[#2f7a4f] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#286b45]"
      >
        {daily.recommended
          ? `今天先補：${daily.recommended.topic} →`
          : "今天開始刷一份考卷 →"}
      </Link>
    </section>
  );
}
