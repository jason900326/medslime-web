"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SubjectStat = {
  subject: string;
  attempts: number;
  average: number;
  latest: number;
  delta: number | null;
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
  code?: string;
  error?: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "locked" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ProAnalysisPayload };

export default function ProAnalysisPanel() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
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
  }, []);

  if (state.status === "loading") {
    return (
      <section className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-5 text-sm font-black text-[#789083]">
        正在確認 Pro 學習分析…
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
          {state.message}
        </div>
      </section>
    );
  }

  const data = state.data;

  if (data.attemptCount === 0) {
    return (
      <section className="mt-5 rounded-[24px] border border-[#cfe7d8] bg-[#f3fbf6] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
              PRO ANALYSIS 2.0
            </div>
            <div className="mt-1 text-lg font-black text-[#237849]">Pro 分析已開通</div>
          </div>
          <ExpiryBadge value={data.proExpiresAt} />
        </div>
        <div className="mt-3 text-sm font-bold leading-6 text-[#668276]">
          先完成幾份國考，系統就會開始整理跨考卷趨勢、反覆弱點與複習優先順序。
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-[26px] border border-[#bfe1cb] bg-gradient-to-br from-[#eefaf2] via-white to-[#fffaf0] p-5 shadow-[0_10px_28px_rgba(31,83,53,0.04)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            PRO ANALYSIS 2.0
          </div>
          <h2 className="mt-1 text-xl font-black">你的備考趨勢</h2>
        </div>
        <ExpiryBadge value={data.proExpiresAt} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <InsightCard label="最近 5 次平均" value={`${data.recentAverage.toFixed(1)} 分`} />
        <InsightCard
          label="最近一次變化"
          value={
            data.overallDelta === null
              ? "資料累積中"
              : `${data.overallDelta >= 0 ? "+" : ""}${data.overallDelta.toFixed(1)} 分`
          }
        />
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
      </div>

      <div className="mt-5 rounded-2xl border border-[#dce9e1] bg-white/80 p-4">
        <div className="text-sm font-black text-[#315b45]">今天建議先做什麼</div>
        <p className="mt-2 text-sm font-bold leading-7 text-[#668276]">
          {data.recommendation}
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dce9e1] bg-white/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-[#315b45]">反覆弱點</div>
              <div className="mt-1 text-xs font-bold text-[#8a9c92]">
                同一題在不同作答紀錄中重複出現
              </div>
            </div>
            <span className="rounded-full bg-[#fff4d6] px-2.5 py-1 text-[11px] font-black text-[#94660f]">
              {data.repeatWeaknesses.length} 項
            </span>
          </div>

          {data.repeatWeaknesses.length === 0 ? (
            <div className="mt-4 rounded-xl bg-[#f7faf8] px-3 py-3 text-xs font-bold leading-5 text-[#789083]">
              目前還沒有明顯的重複錯題；多完成幾次考卷後會開始抓出反覆弱點。
            </div>
          ) : (
            <div className="mt-4 space-y-2">
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
        </div>

        <div className="rounded-2xl border border-[#dce9e1] bg-white/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-[#315b45]">今日複習優先清單</div>
              <div className="mt-1 text-xs font-bold text-[#8a9c92]">
                依弱科、不確定標記與未複習錯題排序
              </div>
            </div>
            <Link
              href="/study/records?tab=mistakes"
              className="shrink-0 text-xs font-black text-[#237849]"
            >
              看全部 →
            </Link>
          </div>

          {data.reviewPriorities.length === 0 ? (
            <div className="mt-4 rounded-xl bg-[#f3fbf6] px-3 py-3 text-xs font-bold leading-5 text-[#668276]">
              目前沒有待複習錯題，可以做下一份考卷確認弱點是否改善。
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {data.reviewPriorities.map((item, index) => (
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
                    <div className="mt-1 line-clamp-1 text-xs font-bold text-[#789083]">
                      {item.stem}
                    </div>
                    <div className="mt-1 text-[11px] font-black text-[#2ba962]">
                      {item.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.subjectStats.length > 0 && (
        <div className="mt-5 space-y-2">
          <div className="text-sm font-black text-[#315b45]">科目表現</div>
          {data.subjectStats.map((stat) => (
            <div
              key={stat.subject}
              className="flex items-center gap-3 rounded-xl bg-white/75 px-3 py-3"
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
      )}
    </section>
  );
}

function LockedPanel() {
  return (
    <section className="mt-5 rounded-[24px] border border-[#eadba9] bg-gradient-to-br from-[#fffaf0] to-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black tracking-[0.1em] text-[#b77b1f]">
            PRO ANALYSIS
          </div>
          <h2 className="mt-1 text-xl font-black">把多次作答整理成真正的弱點趨勢</h2>
        </div>
        <span className="rounded-full bg-[#fff0bd] px-3 py-1 text-xs font-black text-[#94660f]">
          Pro
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm font-bold text-[#617a6e] sm:grid-cols-3">
        <MiniFeature>跨考卷弱科與改善趨勢</MiniFeature>
        <MiniFeature>反覆出錯題目偵測</MiniFeature>
        <MiniFeature>今日複習優先清單</MiniFeature>
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

function ExpiryBadge({ value }: { value: string | null }) {
  return (
    <div className="shrink-0 text-right">
      <span className="rounded-full bg-[#eaf9f0] px-3 py-1 text-xs font-black text-[#237849]">
        已開通
      </span>
      {value && (
        <div className="mt-2 text-[10px] font-bold text-[#8a9c92]">
          有效至 {new Date(value).toLocaleDateString("zh-TW")}
        </div>
      )}
    </div>
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
