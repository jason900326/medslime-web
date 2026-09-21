"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppNavigation from "@/components/app-navigation";
import TopBar from "@/components/top-bar";

type TopicStat = {
  topic: string;
  attempts: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
  uncertainCount: number;
  priorityScore: number;
};

type SubjectDirection = {
  subject: string;
  attempts: number;
  average: number;
  topicStats: TopicStat[];
  availableTopicCount: number;
};

type DirectionPayload = {
  isPro: boolean;
  subjects: SubjectDirection[];
  message: string | null;
};

type DirectionState =
  | { status: "loading" }
  | { status: "ready"; data: DirectionPayload }
  | { status: "error"; message: string };

export default function WhatToStudyPage() {
  const [direction, setDirection] = useState<DirectionState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/learning-direction", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as DirectionPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "學習方向讀取失敗。");
        setDirection({ status: "ready", data: payload });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDirection({
          status: "error",
          message: error instanceof Error ? error.message : "學習方向讀取失敗。",
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study/records" backLabel="返回學習紀錄" />
        <AppNavigation />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">STUDY DIRECTION</div>
          <h1 className="ms-page-title mt-2">我該讀什麼？</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[var(--brand-text-muted)]">
            看見目前最需要補的地方，直接開始練習。
          </p>
        </section>

        {direction.status === "loading" && <DirectionLoading />}
        {direction.status === "error" && <DirectionError message={direction.message} />}
        {direction.status === "ready" && <DirectionContent data={direction.data} />}
      </div>
    </main>
  );
}

function DirectionContent({ data }: { data: DirectionPayload }) {
  const weakest = data.subjects[0] ?? null;
  const priority = weakest?.topicStats[0] ?? null;

  if (!weakest) return <EmptyDirectionState />;

  return (
    <>
      <section className="mt-6 rounded-[24px] border border-[#cfe7d8] bg-gradient-to-br from-[#eefaf2] via-white to-[#fffaf0] p-5 shadow-[0_10px_28px_rgba(31,83,53,0.045)] sm:p-6">
        <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">目前先補</div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.03em] text-[#17372a]">
              {priority?.topic ?? shortSubject(weakest.subject)}
            </h2>
            <p className="mt-1 text-sm font-bold text-[#70877a]">
              {priority
                ? `${shortSubject(weakest.subject)}・${priority.accuracy.toFixed(1)}% 正確率`
                : `${shortSubject(weakest.subject)}目前平均 ${weakest.average.toFixed(1)} 分`}
            </p>
          </div>
          {priority && <PracticeLink subject={weakest.subject} topic={priority.topic} label="開始 10 題補強 →" />}
        </div>
        {priority && (
          <p className="mt-4 text-xs font-bold text-[#789083]">
            做過 {priority.answeredCount} 題，答對 {priority.correctCount} 題
          </p>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em]">各科狀況</h2>
            <p className="mt-1 text-xs font-bold text-[#8a9c92]">
              依目前平均分數排列，先處理最需要的地方。
            </p>
          </div>
          <span className="text-xs font-black text-[#789083]">{data.isPro ? "Top 3" : "Top 1"}</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.subjects.map((subject, index) => (
            <SubjectDirectionCard
              key={subject.subject}
              subject={subject}
              rank={index + 1}
              isPro={data.isPro}
            />
          ))}
        </div>

        {!data.isPro && data.subjects.some((subject) => subject.availableTopicCount > 1) && (
          <div className="mt-4 rounded-xl border border-[#eadba9] bg-[#fffaf0] px-4 py-3 text-xs font-bold leading-5 text-[#80651e]">
            目前顯示每科最需要補強的 Top 1。升級 Pro 後可查看各科 Top 3 弱點。
          </div>
        )}

        {data.message && <p className="mt-4 text-xs font-bold text-[#789083]">{data.message}</p>}
      </section>
    </>
  );
}

function SubjectDirectionCard({
  subject,
  rank,
  isPro,
}: {
  subject: SubjectDirection;
  rank: number;
  isPro: boolean;
}) {
  return (
    <article className="rounded-[22px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f8ed] text-sm font-black text-[#279255]">
          {rank}
        </span>
        <div className="text-right">
          <div className="text-sm font-black text-[#237849]">{subject.average.toFixed(1)} 分</div>
          <div className="text-[11px] font-bold text-[#8a9c92]">{subject.attempts} 份作答</div>
        </div>
      </div>

      <h3 className="mt-4 text-base font-black leading-6 text-[#315b45]">{shortSubject(subject.subject)}</h3>

      {subject.topicStats.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-[#edf2ef] pt-3">
          {subject.topicStats.map((topic, index) => (
            <div key={topic.topic} className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f1f8f3] text-[11px] font-black text-[#279255]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-[#315b45]">{topic.topic}</div>
                <div className="text-[11px] font-bold text-[#8a9c92]">
                  {topic.answeredCount} 題・{topic.accuracy.toFixed(1)}%
                </div>
              </div>
              {index === 0 && (
                <PracticeLink subject={subject.subject} topic={topic.topic} label="10 題補強" compact />
              )}
            </div>
          ))}
          {!isPro && subject.availableTopicCount > 1 && (
            <div className="pt-1 text-[11px] font-bold text-[#9a7a2b]">Pro 可查看 Top 3</div>
          )}
        </div>
      ) : (
        <div className="mt-4 border-t border-[#edf2ef] pt-3 text-xs font-bold leading-5 text-[#789083]">
          完成新版考卷後，這裡會開始整理主題弱點。
        </div>
      )}
    </article>
  );
}

function PracticeLink({
  subject,
  topic,
  label,
  compact = false,
}: {
  subject: string;
  topic: string;
  label: string;
  compact?: boolean;
}) {
  const href = `/study/free-quiz/quiz?${new URLSearchParams({
    from: "106",
    to: "115",
    subject,
    topic,
    count: "10",
  }).toString()}`;

  return (
    <Link
      href={href}
      className={
        compact
          ? "shrink-0 rounded-lg bg-[#e8f8ed] px-2.5 py-1.5 text-[11px] font-black text-[#237849]"
          : "shrink-0 rounded-xl bg-[#31c978] px-4 py-3 text-sm font-black text-white transition hover:bg-[#2dbc70]"
      }
    >
      {label}
    </Link>
  );
}

function shortSubject(subject: string) {
  return subject
    .replace("（包括細菌與黴菌）", "")
    .replace("（包括細菌與真菌）", "")
    .replace("學與臨床", "／臨床")
    .trim();
}

function DirectionLoading() {
  return (
    <div className="mt-6 rounded-[24px] border border-[#dce9e1] bg-white p-8 text-center text-sm font-black text-[#789083]">
      正在整理你的作答紀錄⋯
    </div>
  );
}

function DirectionError({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-[24px] border border-[#f0dddd] bg-[#fff8f8] p-6 text-sm font-bold text-[#9b5050]">
      {message}
    </div>
  );
}

function EmptyDirectionState() {
  return (
    <section className="mt-6 rounded-[24px] border border-[#dce9e1] bg-white p-7 text-center">
      <div className="text-4xl">📝</div>
      <h2 className="mt-3 text-xl font-black">先完成一份考卷</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-[#789083]">
        有了作答紀錄，MedSlime 才能開始整理你的科目狀況與下一步方向。
      </p>
      <Link
        href="/study/exam"
        className="mt-5 inline-block rounded-xl bg-[#31c978] px-5 py-3 text-sm font-black text-white"
      >
        開始刷題
      </Link>
    </section>
  );
}
