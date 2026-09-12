"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProStatus } from "@/hooks/use-pro-status";

type TopicStat = {
  subject: string;
  topic: string;
  subtopic: string | null;
  answeredCount: number;
  accuracy: number;
};

type ProAnalysisPayload = {
  weakestTopic?: TopicStat | null;
  weakestSubtopic?: TopicStat | null;
};

const ANALYSIS_CACHE_PREFIX = "medslime_pro_analysis_v2";
const ANALYSIS_CACHE_TTL_MS = 15 * 60 * 1000;
const ANALYSIS_STALE_KEY = "medslime_pro_analysis_stale";

function readCachedTarget(userId: string): TopicStat | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.sessionStorage.getItem(ANALYSIS_STALE_KEY) === "1") return null;
    const raw = window.sessionStorage.getItem(`${ANALYSIS_CACHE_PREFIX}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; data?: ProAnalysisPayload };
    if (
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > ANALYSIS_CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed.data?.weakestSubtopic ?? parsed.data?.weakestTopic ?? null;
  } catch {
    return null;
  }
}

function practiceHref(target: TopicStat) {
  const params = new URLSearchParams({
    from: "106",
    to: "115",
    subject: target.subject,
    topic: target.topic,
    count: "20",
  });
  if (target.subtopic && target.subtopic !== "其他") {
    params.set("subtopic", target.subtopic);
  }
  return `/study/free-quiz?${params.toString()}`;
}

export default function WeakTopicPracticeCard() {
  const pro = useProStatus();
  const cached = useMemo(
    () => (pro.userId ? readCachedTarget(pro.userId) : null),
    [pro.userId],
  );
  const [target, setTarget] = useState<TopicStat | null>(cached);

  useEffect(() => {
    if (pro.loading || !pro.isLoggedIn || !pro.isPro || !pro.userId) {
      if (!pro.loading && (!pro.isLoggedIn || !pro.isPro)) setTarget(null);
      return;
    }

    const cachedTarget = readCachedTarget(pro.userId);
    if (cachedTarget) {
      setTarget(cachedTarget);
      return;
    }

    const controller = new AbortController();
    void fetch("/api/pro-analysis", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as ProAnalysisPayload;
      })
      .then((payload) => {
        if (!payload) return;
        setTarget(payload.weakestSubtopic ?? payload.weakestTopic ?? null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });

    return () => controller.abort();
  }, [pro.isLoggedIn, pro.isPro, pro.loading, pro.userId]);

  if (!pro.isPro || !target) return null;

  const label = target.subtopic && target.subtopic !== "其他" ? target.subtopic : target.topic;

  return (
    <section className="mt-3 flex flex-col gap-3 rounded-[22px] border border-[#bfe1cb] bg-[#eefaf2] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-xs font-black text-[#2ba962]">下一步：針對弱點練習</div>
        <div className="mt-1 text-base font-black text-[#237849]">{label}</div>
        <div className="mt-1 text-xs font-bold leading-5 text-[#668276]">
          {target.topic}{target.subtopic && target.subtopic !== "其他" ? ` · ${target.subtopic}` : ""} · 目前正確率 {target.accuracy.toFixed(1)}% · 已作答 {target.answeredCount} 題
        </div>
      </div>
      <Link
        href={practiceHref(target)}
        className="shrink-0 rounded-xl bg-[#17372a] px-4 py-3 text-center text-sm font-black text-white"
      >
        用這個弱點出題 →
      </Link>
    </section>
  );
}
