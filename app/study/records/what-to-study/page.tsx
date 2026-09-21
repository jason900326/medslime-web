"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppNavigation from "@/components/app-navigation";
import TopBar from "@/components/top-bar";
import { readExamAttempts, type ExamAttempt } from "@/lib/exam-attempt-store";

export default function WhatToStudyPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void readExamAttempts()
      .then((items) => {
        if (!cancelled) setAttempts(items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = useMemo(() => summarizeSubjects(attempts), [attempts]);
  const weakest = subjects[0] ?? null;

  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study/records" backLabel="返回學習紀錄" />
        <AppNavigation />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            STUDY DIRECTION
          </div>
          <h1 className="ms-page-title mt-2">我該讀什麼？</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--brand-text-muted)]">
            先看整體科目狀況，再決定下一步要補哪一科。
          </p>
        </section>

        {loading ? (
          <div className="mt-6 rounded-[24px] border border-[#dce9e1] bg-white p-8 text-center text-sm font-black text-[#789083]">
            正在整理你的作答紀錄⋯
          </div>
        ) : attempts.length === 0 ? (
          <EmptyDirectionState />
        ) : (
          <>
            {weakest && (
              <section className="mt-6 rounded-[24px] border border-[#cfe7d8] bg-gradient-to-br from-[#eefaf2] via-white to-[#fffaf0] p-5 shadow-[0_10px_28px_rgba(31,83,53,0.045)] sm:p-6">
                <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">
                  目前先補
                </div>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black tracking-[-0.03em] text-[#17372a]">
                      {shortSubject(weakest.subject)}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-[#70877a]">
                      目前平均 {weakest.average.toFixed(1)} 分，先從這一科開始檢討。
                    </p>
                  </div>
                  <Link
                    href={`/study/records?tab=attempts&subject=${encodeURIComponent(weakest.subject)}`}
                    className="rounded-xl bg-[#31c978] px-4 py-3 text-sm font-black text-white transition hover:bg-[#2dbc70]"
                  >
                    查看這科紀錄 →
                  </Link>
                </div>
              </section>
            )}

            <section className="mt-8">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-[-0.03em]">各科狀況</h2>
                  <p className="mt-1 text-xs font-bold text-[#8a9c92]">
                    目前已完成 {attempts.length} 份作答
                  </p>
                </div>
                <Link
                  href="/study/records?tab=pro"
                  className="text-xs font-black text-[#237849]"
                >
                  查看完整分析 →
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject, index) => (
                  <Link
                    key={subject.subject}
                    href={`/study/records?tab=attempts&subject=${encodeURIComponent(subject.subject)}`}
                    className="group rounded-[22px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.035)] transition hover:-translate-y-0.5 hover:border-[#bfe1cb] hover:shadow-[0_12px_28px_rgba(31,83,53,0.07)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f8ed] text-sm font-black text-[#279255]">
                        {index + 1}
                      </span>
                      <span className="text-xs font-black text-[#237849] group-hover:translate-x-0.5">
                        查看 →
                      </span>
                    </div>
                    <h3 className="mt-4 line-clamp-2 min-h-12 text-base font-black leading-6 text-[#315b45]">
                      {shortSubject(subject.subject)}
                    </h3>
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#edf2ef] pt-3">
                      <Metric label="平均" value={`${subject.average.toFixed(1)} 分`} />
                      <Metric label="作答" value={`${subject.attempts} 份`} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function summarizeSubjects(attempts: ExamAttempt[]) {
  const groups = new Map<string, ExamAttempt[]>();
  for (const attempt of attempts) {
    const list = groups.get(attempt.subject) ?? [];
    list.push(attempt);
    groups.set(attempt.subject, list);
  }

  return [...groups.entries()]
    .map(([subject, items]) => ({
      subject,
      attempts: items.length,
      average: average(items.map((item) => item.score)),
      latest: items[0]?.score ?? 0,
      completedAt: items[0]?.completedAt ?? "",
    }))
    .sort((a, b) => a.average - b.average || a.subject.localeCompare(b.subject));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function shortSubject(subject: string) {
  return subject
    .replace("（包括細菌與黴菌）", "")
    .replace("（包括細菌與真菌）", "")
    .replace("學與臨床", "／臨床")
    .trim();
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-[#8a9c92]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#237849]">{value}</div>
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
