"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import AttemptCard from "@/components/records/attempt-card";
import ProAnalysisPanel from "@/components/records/pro-analysis-panel";
import WeakTopicPracticeCard from "@/components/records/weak-topic-practice-card";
import {
  readExamAttempts,
  type ExamAttempt,
} from "@/lib/exam-attempt-store";
import { readMistakes, type MistakeRecord } from "@/lib/mistake-store";

export default function RecordsPage() {
  return (
    <Suspense fallback={<LoadingRecords />}>
      <RecordsContent />
    </Suspense>
  );
}

function RecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const filterYear = searchParams.get("year")?.trim() ?? "";
  const filterSession = searchParams.get("session")?.trim() ?? "";
  const filterSubject = searchParams.get("subject")?.trim() ?? "";
  const hasExamFilter = Boolean(filterYear && filterSession && filterSubject);
  const legacyMistakeRoute = searchParams.get("tab") === "mistakes";

  useEffect(() => {
    if (!legacyMistakeRoute) return;

    const params = new URLSearchParams();
    if (filterYear) params.set("year", filterYear);
    if (filterSession) params.set("session", filterSession);
    if (filterSubject) params.set("subject", filterSubject);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/study/mistakes${suffix}`);
  }, [legacyMistakeRoute, filterYear, filterSession, filterSubject, router]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([readExamAttempts(), readMistakes()])
      .then(([nextAttempts, nextMistakes]) => {
        if (cancelled) return;
        setAttempts(nextAttempts);
        setMistakes(nextMistakes);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleAttempts = useMemo(() => {
    if (!hasExamFilter) return attempts;
    return attempts.filter(
      (attempt) =>
        attempt.year === filterYear &&
        attempt.session === filterSession &&
        attempt.subject === filterSubject,
    );
  }, [attempts, filterYear, filterSession, filterSubject, hasExamFilter]);

  const pendingMistakes = mistakes.filter((item) => !item.reviewed);
  const subjectCount = new Set(attempts.map((item) => item.subject)).size;

  if (legacyMistakeRoute) return <LoadingRecords />;

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            LEARNING RECORDS
          </div>
          <h1 className="ms-page-title mt-2">學習紀錄</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            這裡專門保留每次作答、成績趨勢與 Pro 備考分析；錯題複習已獨立成另一個功能。
          </p>
        </section>

        {loading ? (
          <LoadingCard />
        ) : (
          <>
            <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="作答次數" value={`${attempts.length} 次`} />
              <SummaryCard
                label="最近 5 次平均"
                value={
                  attempts.length
                    ? `${average(attempts.slice(0, 5).map((item) => item.score)).toFixed(1)}`
                    : "—"
                }
              />
              <SummaryCard label="待複習錯題" value={`${pendingMistakes.length} 題`} />
              <SummaryCard label="有紀錄科目" value={`${subjectCount} 科`} />
            </section>

            <div className="mt-3 flex justify-end">
              <Link
                href="/study/mistakes"
                className="text-xs font-black text-[#237849] underline decoration-[#cfe7d8] underline-offset-4"
              >
                前往錯題複習 →
              </Link>
            </div>

            <ProAnalysisPanel />
            <WeakTopicPracticeCard />

            {hasExamFilter && (
              <section className="mt-5 flex items-center justify-between gap-3 rounded-[20px] border border-[#cfe7d8] bg-[#f3fbf6] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-black text-[#2ba962]">目前只看這份考卷</div>
                  <div className="mt-1 truncate text-sm font-black text-[#315b45]">
                    {filterYear} 年・第 {filterSession} 次・{filterSubject}
                  </div>
                </div>
                <Link
                  href="/study/records"
                  className="shrink-0 rounded-xl border border-[#cfe7d8] bg-white px-3 py-2 text-xs font-black text-[#315b45]"
                >
                  看全部
                </Link>
              </section>
            )}

            <section className="mt-5 space-y-3">
              {visibleAttempts.length === 0 ? (
                <EmptyState
                  icon="📝"
                  title="還沒有作答紀錄"
                  copy="完成一份歷屆國考或自由測驗後，成績與作答摘要會出現在這裡。"
                  href="/study/exam"
                  action="去寫一份考卷"
                />
              ) : (
                visibleAttempts.map((attempt, index) => (
                  <AttemptCard
                    key={attempt.id}
                    attempt={attempt}
                    previous={visibleAttempts[index + 1] ?? null}
                  />
                ))
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-4 py-3">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#17372a]">{value}</div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  copy,
  href,
  action,
}: {
  icon: string;
  title: string;
  copy: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#dce9e1] bg-white p-7 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="mt-3 text-xl font-black">{title}</div>
      <div className="mt-2 text-sm font-bold leading-6 text-[#789083]">{copy}</div>
      <Link
        href={href}
        className="mt-5 inline-block rounded-xl bg-[#31c978] px-5 py-3 text-sm font-black text-white"
      >
        {action}
      </Link>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-8 text-center font-black text-[#789083]">
      正在整理學習紀錄...
    </div>
  );
}

function LoadingRecords() {
  return <main className="min-h-screen bg-[#f8fcf9]" />;
}
