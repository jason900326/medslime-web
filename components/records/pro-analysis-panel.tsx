"use client";

import Link from "next/link";
import type { ExamAttempt } from "@/lib/exam-attempt-store";
import type { MistakeRecord } from "@/lib/mistake-store";

type SubjectStat = {
  subject: string;
  attempts: number;
  average: number;
  latest: number;
  delta: number | null;
};

export default function ProAnalysisPanel({
  isPro,
  proExpiresAt,
  attempts,
  pendingMistakes,
}: {
  isPro: boolean;
  proExpiresAt: string | null;
  attempts: ExamAttempt[];
  pendingMistakes: MistakeRecord[];
}) {
  const subjectStats = buildSubjectStats(attempts);

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
    pendingMistakes
      .map((item) => item.subject)
      .filter((item): item is string => Boolean(item)),
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
          value={
            overallDelta === null
              ? "資料累積中"
              : `${overallDelta >= 0 ? "+" : ""}${overallDelta.toFixed(1)} 分`
          }
        />
        <InsightCard
          label="目前最弱科"
          value={
            weakest
              ? `${shortSubject(weakest.subject)} ${weakest.average.toFixed(1)}`
              : "資料累積中"
          }
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
            <div
              key={stat.subject}
              className="flex items-center gap-3 rounded-xl bg-white/75 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-black text-[#315b45]">{stat.subject}</div>
                <div className="mt-1 text-[11px] font-bold text-[#8a9c92]">{stat.attempts} 次作答</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-[#237849]">平均 {stat.average.toFixed(1)}</div>
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

function buildRecommendation(
  weakest: SubjectStat | null,
  pendingCount: number,
  mistakeSubject: string | null,
) {
  if (!weakest) {
    return "先累積 2–3 份作答紀錄，MedSlime 才能開始比較你的科目趨勢。";
  }
  const mistakePart =
    pendingCount > 0
      ? `目前還有 ${pendingCount} 題待複習${
          mistakeSubject ? `，其中可先從「${shortSubject(mistakeSubject)}」開始` : ""
        }。`
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

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dce9e1] bg-white/80 p-4">
      <div className="text-xs font-bold text-[#8a9c92]">{label}</div>
      <div className="mt-1 text-base font-black text-[#17372a]">{value}</div>
    </div>
  );
}

function MiniFeature({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#eadba9] bg-white/80 px-3 py-3">
      ✓ {children}
    </div>
  );
}
