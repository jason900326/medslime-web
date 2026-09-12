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
import {
  readAllQuestionLearningStates,
  readQuestionLearningMemory,
  type QuestionLearningMemoryItem,
  type QuestionLearningState,
} from "@/lib/question-learning-state";
import { loadExamExplanationAccessKeys } from "@/lib/exam-explanation-access-cache";

type RecordsTab = "attempts" | "unfamiliar" | "notes" | "pro";

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
  const [learningStates, setLearningStates] = useState<QuestionLearningState[]>([]);
  const [memoryItems, setMemoryItems] = useState<QuestionLearningMemoryItem[] | null>(null);
  const [unlockedExamKeys, setUnlockedExamKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);

  const filterYear = searchParams.get("year")?.trim() ?? "";
  const filterSession = searchParams.get("session")?.trim() ?? "";
  const filterSubject = searchParams.get("subject")?.trim() ?? "";
  const hasExamFilter = Boolean(filterYear && filterSession && filterSubject);
  const rawTab = searchParams.get("tab")?.trim() ?? "attempts";
  const legacyMistakeRoute = rawTab === "mistakes";
  const tab: RecordsTab =
    rawTab === "unfamiliar" || rawTab === "notes" || rawTab === "pro"
      ? rawTab
      : "attempts";

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

    void Promise.all([
      readExamAttempts(),
      readMistakes(),
      readAllQuestionLearningStates(),
      loadExamExplanationAccessKeys({ force: true }).catch(() => new Set<string>()),
    ])
      .then(([nextAttempts, nextMistakes, nextLearningStates, nextUnlockedKeys]) => {
        if (cancelled) return;
        setAttempts(nextAttempts);
        setMistakes(nextMistakes);
        setLearningStates(nextLearningStates);
        setUnlockedExamKeys(nextUnlockedKeys);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if ((tab !== "unfamiliar" && tab !== "notes") || memoryItems !== null) return;
    let cancelled = false;
    setMemoryLoading(true);
    void readQuestionLearningMemory()
      .then((items) => {
        if (!cancelled) setMemoryItems(items);
      })
      .finally(() => {
        if (!cancelled) setMemoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, memoryItems]);

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
  const noteCount = learningStates.filter((item) => item.note.trim().length > 0).length;
  const recentAverage = attempts.length
    ? average(attempts.slice(0, 5).map((item) => item.score)).toFixed(1)
    : "—";

  if (legacyMistakeRoute) return <LoadingRecords />;

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6">
          <h1 className="ms-page-title">學習紀錄</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            看看最近讀得怎麼樣，下一步該補哪裡。
          </p>
        </section>

        {loading ? (
          <LoadingCard />
        ) : (
          <>
            <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="作答次數" value={`${attempts.length} 次`} />
              <SummaryCard label="待複習錯題" value={`${pendingMistakes.length} 題`} />
              <SummaryCard label="我的筆記" value={`${noteCount} 題`} />
              <SummaryCard label="最近平均" value={recentAverage === "—" ? "—" : `${recentAverage} 分`} />
            </section>

            <ProAnalysisCta active={tab === "pro"} attemptCount={attempts.length} />

            <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <RecordTab href="/study/records?tab=attempts" active={tab === "attempts"}>
                作答紀錄
              </RecordTab>
              <RecordTab href="/study/records?tab=notes" active={tab === "notes"}>
                我的筆記 {noteCount}
              </RecordTab>
            </nav>

            {tab === "attempts" && (
              <>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs font-bold text-[#8a9c92]">
                    已記錄 {subjectCount} 科 · 最近 5 次平均 {recentAverage}
                  </div>
                  <Link
                    href="/study/mistakes"
                    className="shrink-0 text-xs font-black text-[#237849] underline decoration-[#cfe7d8] underline-offset-4"
                  >
                    前往錯題複習 →
                  </Link>
                </div>

                {hasExamFilter && (
                  <section className="mt-5 flex items-center justify-between gap-3 rounded-[20px] border border-[#cfe7d8] bg-[#f3fbf6] px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-[#2ba962]">目前只看這份考卷</div>
                      <div className="mt-1 truncate text-sm font-black text-[#315b45]">
                        {filterYear} 年・第 {filterSession} 次・{filterSubject}
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
                        explanationUnlocked={unlockedExamKeys.has(attempt.examKey)}
                      />
                    ))
                  )}
                </section>
              </>
            )}

            {tab === "unfamiliar" && (
              <LearningMemorySection
                mode="unfamiliar"
                loading={memoryLoading}
                items={(memoryItems ?? []).filter((item) => item.conceptUnfamiliar)}
                attempts={attempts}
              />
            )}

            {tab === "notes" && (
              <LearningMemorySection
                mode="notes"
                loading={memoryLoading}
                items={(memoryItems ?? []).filter((item) => item.note.trim().length > 0)}
                attempts={attempts}
              />
            )}

            {tab === "pro" && (
              <section id="pro-analysis" className="mt-1 scroll-mt-4">
                <ProAnalysisPanel />
                <WeakTopicPracticeCard />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ProAnalysisCta({
  active,
  attemptCount,
}: {
  active: boolean;
  attemptCount: number;
}) {
  return (
    <Link
      href="/study/records?tab=pro#pro-analysis"
      className={[
        "group mt-5 block overflow-hidden rounded-[24px] border p-5 shadow-[0_10px_28px_rgba(31,83,53,0.045)] transition hover:-translate-y-0.5 sm:p-6",
        active
          ? "border-[#65d795] bg-gradient-to-br from-[#e9f9ef] via-white to-[#fff8e8]"
          : "border-[#cfe7d8] bg-gradient-to-br from-[#f1fbf5] via-white to-[#fffaf0] hover:border-[#9ed9b5]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black text-[#237849]">
            <span aria-hidden="true">✨</span>
            <span>Pro 學習分析</span>
          </div>
          <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-[#17372a] sm:text-2xl">
            找出弱科、弱主題與複習優先順序
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#70877a]">
            {attemptCount > 0
              ? `你已累積 ${attemptCount} 次作答，讓 MedSlime 幫你把分散的紀錄整理成下一步。`
              : "完成幾次國考或自由測驗後，這裡會開始整理你的學習弱點與趨勢。"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[#cfe7d8] bg-white/85 px-3 py-1.5 text-xs font-black text-[#237849]">
          {active ? "分析中" : "Pro"}
        </span>
      </div>

      <div className="mt-4 text-sm font-black text-[#237849] group-hover:underline group-hover:decoration-[#9ed9b5] group-hover:underline-offset-4">
        {active ? "繼續看分析 ↓" : "查看我的分析 →"}
      </div>
    </Link>
  );
}

function LearningMemorySection({
  mode,
  loading,
  items,
  attempts,
}: {
  mode: "unfamiliar" | "notes";
  loading: boolean;
  items: QuestionLearningMemoryItem[];
  attempts: ExamAttempt[];
}) {
  if (loading) return <LoadingCard copy="正在整理你的題目記憶…" />;

  if (items.length === 0) {
    return (
      <div className="mt-5">
        <EmptyState
          icon={mode === "unfamiliar" ? "✓" : "📝"}
          title={mode === "unfamiliar" ? "目前沒有觀念不熟的題目" : "目前還沒有私人筆記"}
          copy={
            mode === "unfamiliar"
              ? "你在考卷檢討時標記的「觀念不熟」會集中在這裡；連續 3 次有把握答對後會自動移除。"
              : "在考卷檢討頁留下的筆記，會依題目永久保留並集中在這裡。"
          }
          href="/study/exam"
          action="去寫一份考卷"
        />
      </div>
    );
  }

  const groups = groupMemoryItems(items);
  return (
    <section className="mt-5 space-y-6">
      {mode === "unfamiliar" && (
        <div className="rounded-[20px] border border-[#d9cff6] bg-[#f7f4ff] px-4 py-3 text-sm font-bold leading-6 text-[#6952a5]">
          「觀念不熟」是跨考卷保留的題目狀態。每次重新遇到這題，只要答對且沒有標記不確定，連勝就 +1；答錯、未作答或仍不確定會歸零。連續 3 次後自動視為已掌握。
        </div>
      )}

      {Array.from(groups.entries()).map(([subject, subjectItems]) => (
        <div key={subject}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[#17372a]">{subject}</h2>
            <span className="text-xs font-black text-[#789083]">{subjectItems.length} 題</span>
          </div>
          <div className="space-y-3">
            {subjectItems.map((item) => {
              const attempt = findLatestAttemptForQuestion(attempts, item.questionKey);
              return (
                <article
                  key={item.questionKey}
                  className="rounded-[22px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.035)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-black text-[#2ba962]">
                      {item.year && item.session
                        ? `${item.year} 年・第 ${item.session} 次・第 ${item.questionNumber ?? "?"} 題`
                        : "題目記憶"}
                    </div>
                    {mode === "unfamiliar" && (
                      <span className="rounded-full bg-[#f0ebff] px-3 py-1 text-xs font-black text-[#6952a5]">
                        連續答對 {item.masteryStreak} / 3
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-sm font-black leading-6 text-[#315b45]">
                    {item.stem ?? item.questionKey}
                  </div>

                  {item.note.trim() && (
                    <div className="mt-3 whitespace-pre-wrap rounded-xl bg-[#f8fbf9] px-4 py-3 text-sm font-medium leading-6 text-[#60786c]">
                      {item.note}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2ef] pt-3">
                    <div className="text-[11px] font-bold text-[#8a9c92]">
                      {item.lastPracticedAt
                        ? `最近練習 ${formatMemoryDate(item.lastPracticedAt)}`
                        : item.updatedAt
                          ? `最近更新 ${formatMemoryDate(item.updatedAt)}`
                          : ""}
                    </div>
                    {attempt ? (
                      <Link
                        href={`/study/records/attempt/${attempt.id}`}
                        className="text-xs font-black text-[#237849]"
                      >
                        回到相關作答 →
                      </Link>
                    ) : item.year && item.session && item.subject ? (
                      <Link
                        href={`/study/exam/quiz?${new URLSearchParams({ year: item.year, session: item.session, subject: item.subject }).toString()}`}
                        className="text-xs font-black text-[#237849]"
                      >
                        再做這份考卷 →
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function groupMemoryItems(items: QuestionLearningMemoryItem[]) {
  const groups = new Map<string, QuestionLearningMemoryItem[]>();
  for (const item of items) {
    const key = item.subject?.trim() || "其他";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

function findLatestAttemptForQuestion(attempts: ExamAttempt[], questionKey: string) {
  return (
    attempts.find(
      (attempt) =>
        attempt.questionOutcomes.some((item) => item.questionKey === questionKey) ||
        attempt.questionItems.some((item) => item.questionKey === questionKey),
    ) ?? null
  );
}

function formatMemoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function RecordTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "shrink-0 rounded-full border px-4 py-2.5 text-sm font-black transition",
        active
          ? "border-[#31c978] bg-[#eaf9f0] text-[#237849]"
          : "border-[#dce9e1] bg-white text-[#60786c] hover:bg-[#f5faf7]",
      ].join(" ")}
    >
      {children}
    </Link>
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

function LoadingCard({ copy = "正在整理學習紀錄..." }: { copy?: string }) {
  return (
    <div className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-8 text-center font-black text-[#789083]">
      {copy}
    </div>
  );
}

function LoadingRecords() {
  return <main className="min-h-screen bg-[#f8fcf9]" />;
}
