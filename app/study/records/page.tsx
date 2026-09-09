"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import {
  formatAttemptDate,
  formatAttemptDuration,
  readExamAttempts,
  type ExamAttempt,
} from "@/lib/exam-attempt-store";
import { readMistakes, type MistakeRecord } from "@/lib/mistake-store";

type Tab = "attempts" | "mistakes";

type EntitlementPayload = {
  isPro?: boolean;
  proExpiresAt?: string | null;
};

type SubjectStat = {
  subject: string;
  attempts: number;
  average: number;
  latest: number;
  delta: number | null;
};

export default function RecordsPage() {
  return (
    <Suspense fallback={<LoadingRecords />}>
      <RecordsContent />
    </Suspense>
  );
}

function RecordsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "mistakes" ? "mistakes" : "attempts",
  );
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [proExpiresAt, setProExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const filterYear = searchParams.get("year")?.trim() ?? "";
  const filterSession = searchParams.get("session")?.trim() ?? "";
  const filterSubject = searchParams.get("subject")?.trim() ?? "";
  const hasExamFilter = Boolean(filterYear && filterSession && filterSubject);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      readExamAttempts(),
      readMistakes(),
      fetch("/api/entitlements", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return {} as EntitlementPayload;
          return (await response.json()) as EntitlementPayload;
        })
        .catch(() => ({} as EntitlementPayload)),
    ])
      .then(([nextAttempts, nextMistakes, entitlements]) => {
        if (cancelled) return;
        setAttempts(nextAttempts);
        setMistakes(nextMistakes);
        setIsPro(Boolean(entitlements.isPro));
        setProExpiresAt(entitlements.proExpiresAt ?? null);
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

  const subjectStats = useMemo(() => buildSubjectStats(attempts), [attempts]);
  const pendingMistakes = mistakes.filter((item) => !item.reviewed);

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            LEARNING RECORDS
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">
            學習紀錄
          </h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            考卷看整次表現，錯題看單題需要補強的地方。
          </p>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-[#dce9e1] bg-white p-1.5">
          <button
            type="button"
            onClick={() => setTab("attempts")}
            className={tabClass(tab === "attempts")}
          >
            作答紀錄
          </button>
          <button
            type="button"
            onClick={() => setTab("mistakes")}
            className={tabClass(tab === "mistakes")}
          >
            錯題整理
          </button>
        </section>

        {loading ? (
          <LoadingCard />
        ) : tab === "attempts" ? (
          <>
            <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="作答次數" value={`${attempts.length} 次`} />
              <SummaryCard
                label="最近 5 次平均"
                value={attempts.length ? `${average(attempts.slice(0, 5).map((item) => item.score)).toFixed(1)}` : "—"}
              />
              <SummaryCard label="待複習錯題" value={`${pendingMistakes.length} 題`} />
              <SummaryCard label="有紀錄科目" value={`${subjectStats.length} 科`} />
            </section>

            <ProAnalysisPanel
              isPro={isPro}
              proExpiresAt={proExpiresAt}
              attempts={attempts}
              subjectStats={subjectStats}
              pendingMistakes={pendingMistakes}
            />

            {hasExamFilter && (
              <section className="mt-5 flex items-center justify-between gap-3 rounded-[20px] border border-[#cfe7d8] bg-[#f3fbf6] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-black text-[#2ba962]">目前只看這份考卷</div>
                  <div className="mt-1 truncate text-sm font-black text-[#315b45]">
                    民國 {filterYear} 年・第 {filterSession} 次・{filterSubject}
                  </div>
                </div>
                <Link
                  href="/study/records?tab=attempts"
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
                  copy="完成一份歷屆國考後，成績就會出現在這裡。"
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
        ) : (
          <MistakeTab mistakes={mistakes} />
        )}
      </div>
    </main>
  );
}

function ProAnalysisPanel({
  isPro,
  proExpiresAt,
  attempts,
  subjectStats,
  pendingMistakes,
}: {
  isPro: boolean;
  proExpiresAt: string | null;
  attempts: ExamAttempt[];
  subjectStats: SubjectStat[];
  pendingMistakes: MistakeRecord[];
}) {
  if (!isPro) {
    return (
      <section className="mt-5 rounded-[24px] border border-[#eadba9] bg-gradient-to-br from-[#fffaf0] to-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black tracking-[0.1em] text-[#b77b1f]">PRO ANALYSIS</div>
            <h2 className="mt-1 text-xl font-black">把多次作答整理成真正的弱點趨勢</h2>
          </div>
          <span className="rounded-full bg-[#fff0bd] px-3 py-1 text-xs font-black text-[#94660f]">Pro</span>
        </div>
        <div className="mt-4 grid gap-2 text-sm font-bold text-[#617a6e] sm:grid-cols-3">
          <MiniFeature>跨考卷弱科排序</MiniFeature>
          <MiniFeature>最近成績趨勢比較</MiniFeature>
          <MiniFeature>依錯題安排複習優先順序</MiniFeature>
        </div>
        <Link
          href="/shop"
          className="mt-5 block rounded-xl bg-[#17372a] px-4 py-3 text-center text-sm font-black text-white"
        >
          查看 MedSlime Pro
        </Link>
      </section>
    );
  }

  if (attempts.length === 0) {
    return (
      <section className="mt-5 rounded-[24px] border border-[#cfe7d8] bg-[#f3fbf6] p-5">
        <div className="text-sm font-black text-[#237849]">Pro 分析已開通</div>
        <div className="mt-2 text-sm font-bold leading-6 text-[#668276]">
          先完成幾份國考，這裡就會開始整理跨考卷趨勢與複習優先順序。
        </div>
      </section>
    );
  }

  const weakest = subjectStats[0] ?? null;
  const recentAverage = average(attempts.slice(0, 5).map((item) => item.score));
  const latest = attempts[0];
  const previous = attempts[1] ?? null;
  const overallDelta = previous ? latest.score - previous.score : null;
  const topMistakeSubject = mostCommon(
    pendingMistakes.map((item) => item.subject).filter((item): item is string => Boolean(item)),
  );

  return (
    <section className="mt-5 rounded-[26px] border border-[#bfe1cb] bg-gradient-to-br from-[#eefaf2] via-white to-[#fffaf0] p-5 shadow-[0_10px_28px_rgba(31,83,53,0.04)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">PRO ANALYSIS</div>
          <h2 className="mt-1 text-xl font-black">你的備考趨勢</h2>
          {proExpiresAt && (
            <div className="mt-1 text-xs font-bold text-[#8a9c92]">
              Pro 有效至 {new Date(proExpiresAt).toLocaleDateString("zh-TW")}
            </div>
          )}
        </div>
        <span className="rounded-full bg-[#eaf9f0] px-3 py-1 text-xs font-black text-[#237849]">已開通</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <InsightCard label="最近 5 次平均" value={`${recentAverage.toFixed(1)} 分`} />
        <InsightCard
          label="最近一次變化"
          value={overallDelta === null ? "資料累積中" : `${overallDelta >= 0 ? "+" : ""}${overallDelta.toFixed(1)} 分`}
        />
        <InsightCard
          label="目前最弱科"
          value={weakest ? `${shortSubject(weakest.subject)} ${weakest.average.toFixed(1)}` : "資料累積中"}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#dce9e1] bg-white/80 p-4">
        <div className="text-sm font-black text-[#315b45]">建議先做什麼</div>
        <p className="mt-2 text-sm font-bold leading-7 text-[#668276]">
          {buildRecommendation(weakest, pendingMistakes.length, topMistakeSubject)}
        </p>
      </div>

      {subjectStats.length > 0 && (
        <div className="mt-5 space-y-2">
          <div className="text-sm font-black text-[#315b45]">科目表現</div>
          {subjectStats.map((stat) => (
            <div key={stat.subject} className="flex items-center gap-3 rounded-xl bg-white/75 px-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-black text-[#315b45]">{stat.subject}</div>
                <div className="mt-1 text-[11px] font-bold text-[#8a9c92]">{stat.attempts} 次作答</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-[#237849]">平均 {stat.average.toFixed(1)}</div>
                <div className="mt-1 text-[11px] font-bold text-[#8a9c92]">
                  {stat.delta === null ? "尚無前次比較" : `最近 ${stat.delta >= 0 ? "+" : ""}${stat.delta.toFixed(1)}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AttemptCard({ attempt, previous }: { attempt: ExamAttempt; previous: ExamAttempt | null }) {
  const params = new URLSearchParams({
    year: attempt.year,
    session: attempt.session,
    subject: attempt.subject,
  });
  const sameExamPrevious = previous?.examKey === attempt.examKey ? previous : null;
  const delta = sameExamPrevious ? attempt.score - sameExamPrevious.score : null;

  return (
    <article className="rounded-[22px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-black text-[#2ba962]">
            民國 {attempt.year} 年・第 {attempt.session} 次
          </div>
          <h3 className="mt-1 text-base font-black leading-7">{attempt.subject}</h3>
          <div className="mt-1 text-xs font-bold text-[#8a9c92]">{formatAttemptDate(attempt.completedAt)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-3xl font-black tracking-[-0.04em] text-[#17372a]">{attempt.score.toFixed(2)}</div>
          <div className="text-[11px] font-bold text-[#8a9c92]">分</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SmallStat label="答對" value={`${attempt.correctCount} 題`} />
        <SmallStat label="需複習" value={`${attempt.reviewCount} 題`} />
        <SmallStat label="時間" value={formatAttemptDuration(attempt.durationSeconds)} />
      </div>

      {delta !== null && (
        <div className="mt-3 text-xs font-black text-[#557768]">
          相較這份考卷前一次：<span className={delta >= 0 ? "text-[#237849]" : "text-[#a15a5a]"}>{delta >= 0 ? "+" : ""}{delta.toFixed(2)} 分</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/study/exam/quiz?${params.toString()}`}
          className="rounded-xl bg-[#31c978] px-4 py-2.5 text-sm font-black text-white"
        >
          再次作答
        </Link>
        {attempt.reviewCount > 0 && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2.5 text-sm font-black text-[#315b45]"
          >
            {attempt.reviewCount} 題需複習
          </button>
        )}
      </div>
    </article>
  );
}

function MistakeTab({ mistakes }: { mistakes: MistakeRecord[] }) {
  const pending = mistakes.filter((item) => !item.reviewed);
  return (
    <>
      <section className="mt-5 grid grid-cols-2 gap-3">
        <SummaryCard label="全部錯題" value={`${mistakes.length} 題`} />
        <SummaryCard label="待複習" value={`${pending.length} 題`} />
      </section>

      <section className="mt-5 space-y-3">
        {mistakes.length === 0 ? (
          <EmptyState
            icon="📘"
            title="目前沒有錯題"
            copy="國考或教材測驗中答錯、標記不確定的題目會整理在這裡。"
            href="/study/exam"
            action="去刷國考題"
          />
        ) : (
          mistakes.slice(0, 20).map((item) => (
            <article key={item.id} className="rounded-[20px] border border-[#dce9e1] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-[#2ba962]">{item.source === "national-exam" ? "國考" : "教材"}</div>
                  <div className="mt-1 truncate text-xs font-bold text-[#8a9c92]">{item.sourceLabel}</div>
                </div>
                <span className={item.reviewed ? "text-xs font-black text-[#8a9c92]" : "rounded-full bg-[#fff1f1] px-2.5 py-1 text-[11px] font-black text-[#9b5050]"}>
                  {item.reviewed ? "已複習" : "待複習"}
                </span>
              </div>
              <div className="mt-3 line-clamp-2 text-sm font-black leading-6 text-[#315b45]">
                {item.questionNumber ? `${item.questionNumber}. ` : ""}{item.stem}
              </div>
            </article>
          ))
        )}
      </section>

      {mistakes.length > 0 && (
        <Link
          href="/study/mistakes"
          className="mt-5 block rounded-xl border border-[#cfe7d8] bg-[#f3fbf6] px-4 py-3 text-center text-sm font-black text-[#237849]"
        >
          開啟完整錯題整理與 AI 詳解
        </Link>
      )}
    </>
  );
}

function buildSubjectStats(attempts: ExamAttempt[]): SubjectStat[] {
  const groups = new Map<string, ExamAttempt[]>();
  for (const attempt of attempts) {
    const list = groups.get(attempt.subject) ?? [];
    list.push(attempt);
    groups.set(attempt.subject, list);
  }

  return Array.from(groups.entries())
    .map(([subject, list]) => {
      const latest = list[0];
      const previous = list[1] ?? null;
      return {
        subject,
        attempts: list.length,
        average: average(list.map((item) => item.score)),
        latest: latest.score,
        delta: previous ? latest.score - previous.score : null,
      };
    })
    .sort((a, b) => a.average - b.average);
}

function buildRecommendation(weakest: SubjectStat | null, pendingCount: number, mistakeSubject: string | null) {
  if (!weakest) return "先累積 2–3 份作答紀錄，MedSlime 才能開始比較你的科目趨勢。";
  const mistakePart = pendingCount > 0
    ? `目前還有 ${pendingCount} 題待複習${mistakeSubject ? `，其中可先從「${shortSubject(mistakeSubject)}」開始` : ""}。`
    : "目前沒有待複習錯題，可以用下一份考卷確認弱點是否改善。";
  return `目前平均最低的是「${shortSubject(weakest.subject)}」（${weakest.average.toFixed(1)} 分）。${mistakePart}`;
}

function mostCommon(values: string[]) {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function shortSubject(subject: string) {
  return subject.replace(/（.*$/, "").replace("與臨床", "／臨床");
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function tabClass(active: boolean) {
  return [
    "rounded-xl px-4 py-3 text-sm font-black transition",
    active ? "bg-[#31c978] text-white" : "bg-white text-[#557768]",
  ].join(" ");
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-4 py-3">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#17372a]">{value}</div>
    </div>
  );
}

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dce9e1] bg-white/80 p-4">
      <div className="text-xs font-bold text-[#8a9c92]">{label}</div>
      <div className="mt-1 text-base font-black text-[#17372a]">{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f7faf8] px-3 py-2.5 text-center">
      <div className="text-[10px] font-bold text-[#8a9c92]">{label}</div>
      <div className="mt-1 text-xs font-black text-[#315b45]">{value}</div>
    </div>
  );
}

function MiniFeature({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-[#eadba9] bg-white/80 px-3 py-3">✓ {children}</div>;
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
      <Link href={href} className="mt-5 inline-block rounded-xl bg-[#31c978] px-5 py-3 text-sm font-black text-white">
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
