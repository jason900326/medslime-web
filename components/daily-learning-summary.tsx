"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProStatus } from "@/hooks/use-pro-status";
import { readExamAttempts, type ExamAttempt } from "@/lib/exam-attempt-store";

type TopicStat = {
  topic: string;
  attempts: number;
  answeredCount: number;
  recentAccuracy: number | null;
  previousAccuracy: number | null;
};

type SubjectDirection = {
  subject: string;
  topicStats: TopicStat[];
};

type DirectionPayload = {
  isPro: boolean;
  subjects: SubjectDirection[];
};

type SummaryState =
  | { status: "idle" | "loading" }
  | {
      status: "ready";
      attempts: ExamAttempt[];
      direction: DirectionPayload | null;
    }
  | { status: "hidden" };

const DAY_MS = 24 * 60 * 60 * 1000;
const SEEN_KEY_PREFIX = "medslime_daily_learning_summary_seen_v1";

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

function improvementLabel(topic: TopicStat | null) {
  if (
    !topic ||
    topic.attempts < 2 ||
    topic.answeredCount < 10 ||
    topic.recentAccuracy === null ||
    topic.previousAccuracy === null
  ) {
    return "持續累積作答後，會開始顯示改善狀態。";
  }

  const delta = topic.recentAccuracy - topic.previousAccuracy;
  if (delta >= 5) return "最近表現有開始改善。";
  if (delta <= -5) return "最近仍需要優先補強。";
  return "最近表現大致持平，繼續觀察。";
}

export default function DailyLearningSummary() {
  const auth = useProStatus();
  const todayKey = useMemo(() => taipeiDayKey(new Date()), []);
  const yesterdayKey = useMemo(
    () => taipeiDayKey(new Date(Date.now() - DAY_MS)),
    [],
  );
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

    void Promise.all([
      readExamAttempts(120),
      fetch("/api/learning-direction", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return null;
          return (await response.json()) as DirectionPayload;
        })
        .catch(() => null),
    ])
      .then(([attempts, direction]) => {
        if (cancelled) return;
        setState({ status: "ready", attempts, direction });
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

  const yesterdayAttempts = state.attempts.filter(
    (attempt) => taipeiDayKey(new Date(attempt.completedAt)) === yesterdayKey,
  );
  const answeredYesterday = yesterdayAttempts.reduce(
    (sum, attempt) => sum + attempt.answeredCount,
    0,
  );
  const prioritySubject = state.direction?.subjects[0] ?? null;
  const priorityTopic = prioritySubject?.topicStats[0] ?? null;

  const practiceHref =
    prioritySubject && priorityTopic
      ? "/study/free-quiz/quiz?" +
        new URLSearchParams({
          from: "106",
          to: "115",
          subject: prioritySubject.subject,
          topic: priorityTopic.topic,
          count: "10",
        }).toString()
      : "/study/exam";

  const yesterdayCopy =
    yesterdayAttempts.length > 0
      ? `昨天完成 ${yesterdayAttempts.length} 次作答，共作答 ${answeredYesterday} 題。`
      : "昨天沒有新的作答紀錄。";

  const weaknessCopy =
    prioritySubject && priorityTopic
      ? `目前最需要補的是 ${shortSubject(prioritySubject.subject)}的「${priorityTopic.topic}」。`
      : "再完成一些題目後，這裡會整理你最需要補的方向。";

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
            {improvementLabel(priorityTopic)}
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
        {priorityTopic ? `今天先補：${priorityTopic.topic} →` : "今天開始刷一份考卷 →"}
      </Link>
    </section>
  );
}
