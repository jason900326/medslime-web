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
  recentAccuracy: number | null;
  previousAccuracy: number | null;
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
        <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">下一步</div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.03em] text-[#17372a]">
              {priority?.topic ?? shortSubject(weakest.subject)}
            </h2>
            <p className="mt-1 text-sm font-bold text-[#70877a]">
              {priority
                ? "先從" + shortSubject(weakest.subject) + "補起來"
                : "先從" + shortSubject(weakest.subject) + "開始練習"}
            </p>
          </div>
          {priority && <PracticeLink subject={weakest.subject} topic={priority.topic} label="開始補強 →" />}
        </div>
        <p className="mt-4 text-xs font-bold text-[#789083]">
          完成後再回來，看看下一個需要補強的地方。
        </p>
      </section>

      <section className="mt-8">
        <div>
          <h2 className="text-xl font-black tracking-[-0.03em]">各科狀況</h2>
          <p className="mt-1 text-xs font-bold text-[#8a9c92]">
            展開一科，就能看到目前建議的補強方向。
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {data.subjects.map((subject) => (
            <SubjectDirectionCard
              key={subject.subject}
              subject={subject}
              isPro={data.isPro}
            />
          ))}
        </div>

        {!data.isPro && data.subjects.some((subject) => subject.availableTopicCount > 1) && (
          <div className="mt-4 rounded-xl border border-[#eadba9] bg-[#fffaf0] px-4 py-3 text-xs font-bold leading-5 text-[#80651e]">
            想看更多需要補強的方向？Pro 會幫你整理更完整的學習順序。
          </div>
        )}

        {data.message && <p className="mt-4 text-xs font-bold text-[#789083]">{data.message}</p>}
      </section>
    </>
  );
}

function SubjectDirectionCard({
  subject,
  isPro,
}: {
  subject: SubjectDirection;
  isPro: boolean;
}) {
  const firstTopic = subject.topicStats[0];

  return (
    <details className="group rounded-[22px] border border-[#dce9e1] bg-white shadow-[0_8px_22px_rgba(31,83,53,0.035)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h3 className="text-base font-black leading-6 text-[#315b45]">{shortSubject(subject.subject)}</h3>
          <p className="mt-1 truncate text-xs font-bold text-[#8a9c92]">
            {firstTopic
              ? "建議先補：" + firstTopic.topic
              : "作答紀錄累積後，這裡會整理補強方向。"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#f1f8f3] px-3 py-1.5 text-xs font-black text-[#237849] group-open:bg-[#e8f8ed]">
          查看
        </span>
      </summary>

      <div className="border-t border-[#edf2ef] px-5 pb-5 pt-3">
        {subject.topicStats.length > 0 ? (
          <div className="space-y-2">
            {subject.topicStats.map((topic, index) => (
              <div
                key={topic.topic}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fbf9] px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-black tracking-[0.08em] text-[#789083]">
                    {index === 0 ? "建議先補" : "接著補"}
                  </div>
                  <div className="mt-0.5 truncate text-sm font-black text-[#315b45]">{topic.topic}</div>
                </div>
                <PracticeLink subject={subject.subject} topic={topic.topic} label="開始補強" compact />
              </div>
            ))}
            {!isPro && subject.availableTopicCount > subject.topicStats.length && (
              <p className="pt-1 text-[11px] font-bold text-[#9a7a2b]">
                還有更多補強方向，Pro 會繼續幫你整理。
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs font-bold leading-5 text-[#789083]">
            完成更多作答後，這裡會開始整理你的補強方向。
          </p>
        )}
      </div>
    </details>
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
  const params = new URLSearchParams({
    from: "106",
    to: "115",
    subject,
    topic,
    count: "10",
  });
  const href = "/study/free-quiz/quiz?" + params.toString();

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
