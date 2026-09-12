"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProStatus } from "@/hooks/use-pro-status";

type SubjectStat = {
  subject: string;
  attempts: number;
  average: number;
  latest: number;
  delta: number | null;
};

type TopicStat = {
  key: string;
  subject: string;
  topic: string;
  subtopic: string | null;
  attempts: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
  uncertainCount: number;
  uncertainRate: number;
  latestAccuracy: number | null;
  delta: number | null;
  priorityScore: number;
};

type RepeatWeakness = {
  key: string;
  subject: string;
  questionNumber: number | null;
  stem: string;
  count: number;
};

type ReviewPriority = {
  id: string;
  subject: string;
  questionNumber: number | null;
  stem: string;
  reason: string;
  score: number;
  topic: string | null;
  subtopic: string | null;
};

type ProAnalysisPayload = {
  proExpiresAt: string | null;
  attemptCount: number;
  recentAverage: number;
  overallDelta: number | null;
  trendDelta: number | null;
  weakest: SubjectStat | null;
  recommendation: string;
  repeatWeaknesses: RepeatWeakness[];
  reviewPriorities: ReviewPriority[];
  subjectStats: SubjectStat[];
  topicAnalyticsAvailable: boolean;
  topicAnalyticsMessage: string | null;
  topicCoverage: {
    attemptsWithOutcomes: number;
    capturedOutcomeCount: number;
    answeredOutcomeCount: number;
    mappedAnsweredCount: number;
    coverageRate: number;
  };
  weakestTopic: TopicStat | null;
  weakestSubtopic: TopicStat | null;
  topicStats: TopicStat[];
  subtopicStats: TopicStat[];
  code?: string;
  error?: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "locked" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ProAnalysisPayload };

const ANALYSIS_CACHE_PREFIX = "medslime_pro_analysis_v2";
const ANALYSIS_CACHE_TTL_MS = 15 * 60 * 1000;
const ANALYSIS_STALE_KEY = "medslime_pro_analysis_stale";

type StoredAnalysis = {
  savedAt: number;
  data: ProAnalysisPayload;
};

function cacheKey(userId: string) {
  return `${ANALYSIS_CACHE_PREFIX}:${userId}`;
}

function readCachedAnalysis(userId: string): ProAnalysisPayload | null {
  if (typeof window === "undefined") return null;
  if (window.sessionStorage.getItem(ANALYSIS_STALE_KEY) === "1") return null;

  try {
    const raw = window.sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAnalysis;
    if (
      !parsed?.data ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > ANALYSIS_CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedAnalysis(userId: string, data: ProAnalysisPayload) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      cacheKey(userId),
      JSON.stringify({ savedAt: Date.now(), data } satisfies StoredAnalysis),
    );
    window.sessionStorage.removeItem(ANALYSIS_STALE_KEY);
  } catch {
    // Cache is only a UX optimization.
  }
}

export default function ProAnalysisPanel() {
  const pro = useProStatus();
  const initial = useMemo(() => {
    if (!pro.userId) return null;
    return readCachedAnalysis(pro.userId);
  }, [pro.userId]);
  const [state, setState] = useState<LoadState>(
    initial ? { status: "ready", data: initial } : { status: "loading" },
  );
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [recommendationOpen, setRecommendationOpen] = useState(true);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [weaknessOpen, setWeaknessOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [showAllPriorities, setShowAllPriorities] = useState(false);

  useEffect(() => {
    if (pro.loading) return;

    const userId = pro.userId;
    if (!pro.isLoggedIn || !pro.isPro || !userId) {
      setState({ status: "locked" });
      return;
    }
    const activeUserId: string = userId;

    const cached = readCachedAnalysis(activeUserId);
    if (cached) {
      setState({ status: "ready", data: cached });
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/pro-analysis", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as ProAnalysisPayload;

        if (response.status === 403 || payload.code === "PRO_REQUIRED") {
          setState({ status: "locked" });
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Pro 分析讀取失敗。");
        }

        writeCachedAnalysis(activeUserId, payload);
        setState({ status: "ready", data: payload });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Pro 分析讀取失敗。",
        });
      }
    }

    void load();
    return () => controller.abort();
  }, [pro.isLoggedIn, pro.isPro, pro.loading, pro.userId]);

  if (pro.loading) return null;

  if (state.status === "loading") {
    return (
      <section className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-5 text-sm font-bold text-[#789083]">
        正在整理你的 Pro 分析…
      </section>
    );
  }

  if (state.status === "locked") {
    return <LockedPanel />;
  }

  if (state.status === "error") {
    return (
      <section className="mt-5 rounded-[24px] border border-[#f0dddd] bg-[#fff8f8] p-5">
        <div className="text-sm font-black text-[#9b5050]">Pro 分析暫時讀取失敗</div>
        <div className="mt-2 text-sm font-bold leading-6 text-[#8a6868]">
          請稍後再試一次。
        </div>
      </section>
    );
  }

  const data = state.data;

  if (data.attemptCount === 0) {
    return (
      <section className="mt-5 rounded-[24px] border border-[#cfe7d8] bg-[#f3fbf6] p-5">
        <div className="text-lg font-black text-[#237849]">Pro 分析已開通</div>
        <div className="mt-3 text-sm font-bold leading-6 text-[#668276]">
          先完成幾份國考或自由測驗，系統就會開始整理跨考卷趨勢、弱主題與複習優先順序。
        </div>
      </section>
    );
  }

  const visiblePriorities = showAllPriorities
    ? data.reviewPriorities
    : data.reviewPriorities.slice(0, 3);

  return (
    <section className="mt-5 rounded-[26px] border border-[#bfe1cb] bg-gradient-to-br from-[#eefaf2] via-white to-[#fffaf0] p-5 shadow-[0_10px_28px_rgba(31,83,53,0.04)] sm:p-6">
      <h2 className="text-xl font-black">你的備考趨勢</h2>

      <div className="mt-5 space-y-3">
        <Disclosure
          title="數據總覽"
          open={overviewOpen}
          onToggle={() => setOverviewOpen((current) => !current)}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard label="最近 5 次平均" value={`${data.recentAverage.toFixed(1)} 分`} />
            <InsightCard
              label="近期趨勢"
              value={
                data.trendDelta === null
                  ? "需至少 6 次"
                  : `${data.trendDelta >= 0 ? "↑" : "↓"} ${Math.abs(data.trendDelta).toFixed(1)} 分`
              }
            />
            <InsightCard
              label="目前最弱科"
              value={
                data.weakest
                  ? `${shortSubject(data.weakest.subject)} ${data.weakest.average.toFixed(1)}`
                  : "資料累積中"
              }
            />
            <InsightCard
              label="目前最弱主題"
              value={
                data.weakestTopic
                  ? `${data.weakestTopic.topic} ${data.weakestTopic.accuracy.toFixed(0)}%`
                  : "資料累積中"
              }
            />
          </div>
        </Disclosure>

        <Disclosure
          title="今天建議先做什麼"
          open={recommendationOpen}
          onToggle={() => setRecommendationOpen((current) => !current)}
        >
          <p className="text-sm font-bold leading-7 text-[#668276]">
            {data.recommendation}
          </p>
        </Disclosure>

        <Disclosure
          title="弱主題與細分弱點"
          open={topicsOpen}
          onToggle={() => setTopicsOpen((current) => !current)}
        >
          {!data.topicAnalyticsAvailable || data.topicCoverage.mappedAnsweredCount === 0 ? (
            <div className="rounded-xl bg-[#f7faf8] px-3 py-3 text-xs font-bold leading-5 text-[#789083]">
              再完成幾次國考或自由測驗後，這裡會開始整理你的弱主題。
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="mb-2 text-xs font-black text-[#315b45]">優先補強主題</div>
                <div className="space-y-2">
                  {data.topicStats.slice(0, 6).map((stat) => (
                    <TopicStatRow key={stat.key} stat={stat} />
                  ))}
                </div>
              </div>

              {data.subtopicStats.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-black text-[#315b45]">細分弱點</div>
                  <div className="space-y-2">
                    {data.subtopicStats.slice(0, 5).map((stat) => (
                      <TopicStatRow key={stat.key} stat={stat} showSubtopic />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Disclosure>

        <div className="grid gap-3 lg:grid-cols-2">
          <Disclosure
            title="反覆弱點"
            subtitle="同一題在不同作答紀錄中重複出現"
            badge={`${data.repeatWeaknesses.length} 項`}
            open={weaknessOpen}
            onToggle={() => setWeaknessOpen((current) => !current)}
          >
            {data.repeatWeaknesses.length === 0 ? (
              <div className="rounded-xl bg-[#f7faf8] px-3 py-3 text-xs font-bold leading-5 text-[#789083]">
                目前還沒有明顯的重複錯題；多完成幾次考卷後會開始抓出反覆弱點。
              </div>
            ) : (
              <div className="space-y-2">
                {data.repeatWeaknesses.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-[#eee4c7] bg-[#fffdf7] px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-black text-[#80651e]">
                        {shortSubject(item.subject)}
                        {item.questionNumber ? ` · 第 ${item.questionNumber} 題` : ""}
                      </div>
                      <span className="shrink-0 text-[11px] font-black text-[#b77b1f]">
                        出現 {item.count} 次
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-[#6f746f]">
                      {item.stem}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Disclosure>

          <Disclosure
            title="今日複習優先清單"
            subtitle="今天最值得先回頭看的題目"
            badge={`${data.reviewPriorities.length} 題`}
            open={priorityOpen}
            onToggle={() => setPriorityOpen((current) => !current)}
            action={
              data.reviewPriorities.length > 3
                ? {
                    label: showAllPriorities ? "收起" : "看全部",
                    onClick: () => setShowAllPriorities((current) => !current),
                  }
                : undefined
            }
          >
            {data.reviewPriorities.length === 0 ? (
              <div className="rounded-xl bg-[#f3fbf6] px-3 py-3 text-xs font-bold leading-5 text-[#668276]">
                目前沒有待複習錯題，可以做下一份考卷確認弱點是否改善。
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {visiblePriorities.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex gap-3 rounded-xl border border-[#dfece4] bg-white px-3 py-3"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf9f0] text-xs font-black text-[#237849]">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-[#315b45]">
                          {shortSubject(item.subject)}
                          {item.questionNumber ? ` · 第 ${item.questionNumber} 題` : ""}
                        </div>
                        {item.topic && (
                          <div className="mt-1 text-[11px] font-black text-[#557768]">
                            {item.topic}
                            {item.subtopic && item.subtopic !== "其他" ? ` · ${item.subtopic}` : ""}
                          </div>
                        )}
                        <div className="mt-1 text-xs font-bold leading-5 text-[#789083]">
                          {item.stem}
                        </div>
                        <div className="mt-1 text-[11px] font-black text-[#2ba962]">
                          {item.reason}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/study/mistakes"
                  className="mt-3 inline-block text-xs font-black text-[#237849]"
                >
                  前往錯題複習 →
                </Link>
              </>
            )}
          </Disclosure>
        </div>

        {data.subjectStats.length > 0 && (
          <Disclosure
            title="科目表現"
            open={subjectsOpen}
            onToggle={() => setSubjectsOpen((current) => !current)}
          >
            <div className="space-y-2">
              {data.subjectStats.map((stat) => (
                <div
                  key={stat.subject}
                  className="flex items-center gap-3 rounded-xl bg-white px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-black text-[#315b45]">
                      {stat.subject}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-[#8a9c92]">
                      {stat.attempts} 次作答
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#237849]">
                      平均 {stat.average.toFixed(1)}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-[#8a9c92]">
                      {stat.delta === null
                        ? "尚無前次比較"
                        : `最近 ${stat.delta >= 0 ? "+" : ""}${stat.delta.toFixed(1)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Disclosure>
        )}
      </div>
    </section>
  );
}

function TopicStatRow({ stat, showSubtopic = false }: { stat: TopicStat; showSubtopic?: boolean }) {
  const title = showSubtopic && stat.subtopic ? stat.subtopic : stat.topic;
  const width = Math.max(3, Math.min(100, stat.accuracy));

  return (
    <div className="rounded-xl border border-[#e1ebe5] bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black text-[#789083]">
            {shortSubject(stat.subject)}
            {showSubtopic ? ` · ${stat.topic}` : ""}
          </div>
          <div className="mt-1 truncate text-sm font-black text-[#315b45]">{title}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-black text-[#237849]">{stat.accuracy.toFixed(1)}%</div>
          <div className="text-[10px] font-bold text-[#8a9c92]">
            {stat.correctCount}/{stat.answeredCount} 題
          </div>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf3ef]">
        <div className="h-full rounded-full bg-[#79d7a3]" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-[#8a9c92]">
        <span>{stat.attempts} 次作答</span>
        {stat.uncertainCount > 0 && <span>不確定 {stat.uncertainCount} 題</span>}
        {stat.delta !== null && (
          <span className={stat.delta >= 0 ? "text-[#2b9b60]" : "text-[#b86b6b]"}>
            最近 {stat.delta >= 0 ? "+" : ""}
            {stat.delta.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function Disclosure({
  title,
  subtitle,
  badge,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#dce9e1] bg-white/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <div className="text-sm font-black text-[#315b45]">{title}</div>
            {badge && (
              <span className="rounded-full bg-[#fff4d6] px-2.5 py-1 text-[11px] font-black text-[#94660f]">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="mt-1 text-xs font-bold text-[#8a9c92]">{subtitle}</div>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {action && open && (
            <button
              type="button"
              onClick={action.onClick}
              className="text-xs font-black text-[#237849]"
            >
              {action.label}
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-[#e1e9e4] bg-white px-2.5 py-1 text-xs font-black text-[#789083]"
            aria-expanded={open}
          >
            {open ? "−" : "+"}
          </button>
        </div>
      </div>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

function LockedPanel() {
  return (
    <section className="mt-5 rounded-[24px] border border-[#eadba9] bg-gradient-to-br from-[#fffaf0] to-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-black">把多次作答整理成真正的弱點趨勢</h2>
        <span className="rounded-full bg-[#fff0bd] px-3 py-1 text-xs font-black text-[#94660f]">
          Pro
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm font-bold text-[#617a6e] sm:grid-cols-3">
        <MiniFeature>跨考卷弱科與改善趨勢</MiniFeature>
        <MiniFeature>逐題主題與細分弱點分析</MiniFeature>
        <MiniFeature>弱主題驅動的複習優先清單</MiniFeature>
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

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dfece4] bg-white/85 p-4">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-2 text-lg font-black text-[#17372a]">{value}</div>
    </div>
  );
}

function MiniFeature({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#eee4c7] bg-white/70 px-3 py-2.5">
      ✓ {children}
    </div>
  );
}

function shortSubject(subject: string) {
  return subject
    .replace("（包括細菌與黴菌）", "")
    .replace("（包括細菌與真菌）", "")
    .replace("學與臨床", "／臨床")
    .trim();
}
