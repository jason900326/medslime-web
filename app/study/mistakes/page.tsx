"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import {
  formatAttemptDate,
  readExamAttempts,
  type ExamAttempt,
} from "@/lib/exam-attempt-store";
import { readMistakes, type MistakeRecord } from "@/lib/mistake-store";

export default function MistakesPage() {
  return (
    <Suspense fallback={<LoadingMistakes />}>
      <MistakesContent />
    </Suspense>
  );
}

function MistakesContent() {
  const searchParams = useSearchParams();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const filterYear = searchParams.get("year")?.trim() ?? "";
  const filterSession = searchParams.get("session")?.trim() ?? "";
  const filterSubject = searchParams.get("subject")?.trim() ?? "";
  const hasExamFilter = Boolean(filterYear && filterSession && filterSubject);

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

  const mistakeAttempts = useMemo(() => {
    return attempts.filter((attempt) => {
      if (attempt.reviewCount <= 0 && attempt.reviewItems.length === 0) return false;
      if (!hasExamFilter) return true;
      return (
        attempt.year === filterYear &&
        attempt.session === filterSession &&
        attempt.subject === filterSubject
      );
    });
  }, [attempts, hasExamFilter, filterYear, filterSession, filterSubject]);

  const pendingMistakes = mistakes.filter((item) => !item.reviewed).length;
  const materialMistakes = mistakes.filter((item) => item.source === "material").length;

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            MISTAKE REVIEW
          </div>
          <h1 className="ms-page-title mt-2">錯題複習</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            先按每次測驗整理錯題。點進一份測驗，就能看到那次答錯或標記不確定的題目。
          </p>
        </section>

        {loading ? (
          <div className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-8 text-center font-black text-[#789083]">
            正在整理錯題...
          </div>
        ) : (
          <>
            <section className="mt-5 grid grid-cols-2 gap-3">
              <SummaryCard label="有錯題的測驗" value={`${mistakeAttempts.length} 份`} />
              <SummaryCard label="目前待複習" value={`${pendingMistakes} 題`} />
            </section>

            {hasExamFilter && (
              <section className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-[#cfe7d8] bg-[#f3fbf6] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-black text-[#2ba962]">目前只看這份考卷</div>
                  <div className="mt-1 truncate text-sm font-black text-[#315b45]">
                    {filterYear} 年・第 {filterSession} 次・{filterSubject}
                  </div>
                </div>
                <Link
                  href="/study/mistakes"
                  className="shrink-0 rounded-xl border border-[#cfe7d8] bg-white px-3 py-2 text-xs font-black text-[#315b45]"
                >
                  看全部
                </Link>
              </section>
            )}

            <section className="mt-5 space-y-3">
              {mistakeAttempts.length === 0 ? (
                <EmptyState />
              ) : (
                mistakeAttempts.map((attempt) => (
                  <MistakeAttemptCard key={attempt.id} attempt={attempt} />
                ))
              )}
            </section>

            {mistakes.length > 0 && (
              <section className="mt-6 rounded-[22px] border border-[#dce9e1] bg-white/80 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-[#315b45]">個別錯題管理</div>
                    <div className="mt-1 text-xs font-bold leading-5 text-[#789083]">
                      需要標記已複習、移除錯題，或查看教材錯題時再進這裡。
                      {materialMistakes > 0 ? ` 目前另有 ${materialMistakes} 題教材錯題。` : ""}
                    </div>
                  </div>
                  <Link
                    href="/study/mistakes/individual"
                    className="shrink-0 rounded-xl border border-[#cfe7d8] bg-white px-3 py-2 text-xs font-black text-[#237849]"
                  >
                    查看 →
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function MistakeAttemptCard({ attempt }: { attempt: ExamAttempt }) {
  const freeQuiz = attempt.session === "自由測驗";
  const title = freeQuiz
    ? `自由測驗 · ${attempt.year.replace("-", "–")} 年`
    : `${attempt.year} 年・第 ${attempt.session} 次國考`;

  return (
    <Link
      href={`/study/mistakes/attempt/${attempt.id}`}
      className="block rounded-[24px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)] transition hover:border-[#bfe1cb] hover:bg-[#fbfefc]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black tracking-[0.06em] text-[#2ba962]">
            {freeQuiz ? "FREE QUIZ" : "NATIONAL EXAM"}
          </div>
          <h2 className="mt-1 text-lg font-black leading-7 text-[#17372a]">{title}</h2>
          <div className="mt-1 text-sm font-bold leading-6 text-[#60786c]">{attempt.subject}</div>
          <div className="mt-2 text-xs font-bold text-[#8a9c92]">{formatAttemptDate(attempt.completedAt)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-black text-[#9b5050]">{attempt.reviewCount}</div>
          <div className="text-[11px] font-black text-[#9b7777]">題需複習</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black">
        <span className="rounded-full bg-[#f4f8f5] px-3 py-1.5 text-[#557768]">
          作答 {attempt.answeredCount} 題
        </span>
        <span className="rounded-full bg-[#f4f8f5] px-3 py-1.5 text-[#557768]">
          答對 {attempt.correctCount} 題
        </span>
        {attempt.uncertainCount > 0 && (
          <span className="rounded-full bg-[#fff8df] px-3 py-1.5 text-[#80651e]">
            ❓ {attempt.uncertainCount} 題不確定
          </span>
        )}
      </div>

      <div className="mt-4 border-t border-[#edf2ef] pt-3 text-right text-sm font-black text-[#237849]">
        查看這份測驗的錯題 →
      </div>
    </Link>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-4 py-3">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#17372a]">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[24px] border border-[#dce9e1] bg-white p-7 text-center">
      <div className="text-4xl">📘</div>
      <div className="mt-3 text-xl font-black">還沒有測驗錯題</div>
      <div className="mt-2 text-sm font-bold leading-6 text-[#789083]">
        完成國考或自由測驗後，只要有答錯或標記不確定，這裡就會以那次測驗為單位整理。
      </div>
      <Link
        href="/study/free-quiz"
        className="mt-5 inline-block rounded-xl bg-[#31c978] px-5 py-3 text-sm font-black text-white"
      >
        去做自由測驗
      </Link>
    </div>
  );
}

function LoadingMistakes() {
  return <main className="min-h-screen bg-[#f8fcf9]" />;
}
