"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProStatus } from "@/hooks/use-pro-status";
import TopBar from "@/components/top-bar";
import StudyShell from "@/components/study-shell";
import {
  formatAttemptDate,
  latestAttemptMap,
  readExamAttempts,
  type ExamAttempt,
} from "@/lib/exam-attempt-store";

const rocYears = Array.from({ length: 10 }, (_, index) => 115 - index);

const subjects = [
  "微生物學與臨床微生物學（包括細菌與黴菌）",
  "生物化學與臨床生化學",
  "臨床生理學與病理學",
  "臨床血液學與血庫學",
  "臨床血清免疫學與臨床病毒學",
  "醫學分子檢驗學與臨床鏡檢學（包括寄生蟲學）",
];

type PurchasedExam = {
  exam_key: string;
  year: string;
  session: string;
  subject: string;
  purchased_at: string | null;
};

export default function ExamPage() {
  return (
    <Suspense fallback={<LoadingExamPicker />}>
      <ExamPicker />
    </Suspense>
  );
}

function ExamPicker() {
  const searchParams = useSearchParams();
  const auth = useProStatus();
  const [rocYear, setRocYear] = useState(115);
  const [session, setSession] = useState<1 | 2>(1);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [purchases, setPurchases] = useState<PurchasedExam[]>([]);
  const explanationMode = searchParams.get("mode") === "explanation";

  useEffect(() => {
    if (auth.loading || !auth.isLoggedIn) return;

    let cancelled = false;
    void readExamAttempts()
      .then((items) => {
        if (!cancelled) setAttempts(items);
      })
      .catch(() => {
        if (!cancelled) setAttempts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.loading, auth.isLoggedIn]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPurchases() {
      try {
        const response = await fetch("/api/exam-explanation-access", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error ?? "讀取詳解權限失敗。");
        setPurchases(Array.isArray(payload?.purchases) ? payload.purchases : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPurchases([]);
      }
    }

    void loadPurchases();
    return () => controller.abort();
  }, []);

  const latestMap = useMemo(() => latestAttemptMap(attempts), [attempts]);
  const purchaseMap = useMemo(
    () => new Map(purchases.map((item) => [item.exam_key, item])),
    [purchases],
  );

  if (auth.loading) return <LoadingExamPicker />;
  if (!auth.isLoggedIn) return <LoginRequired />;

  return (
    <StudyShell>

        <section className="mt-6">

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">歷屆國考</h1>

        </section>

        {explanationMode && (
          <section className="mt-5 rounded-[22px] border border-[#cfe7d8] bg-[#f3fbf6] px-5 py-4">
            <div className="text-sm font-black text-[#237849]">單份考卷詳解怎麼用？</div>
            <p className="mt-1 text-sm font-bold leading-6 text-[#668276]">
              完成考卷後可一次解鎖該份考卷的詳解權限；之後從作答紀錄查看自己的錯題，需要哪題再展開哪題，不會自動產生整份解析。
            </p>
          </section>
        )}

        <section className="mt-7 border-y border-[#dfe7e0] py-5">
          <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
            <div>
              <label htmlFor="exam-year" className="study-field-label">01　選擇年度</label>
              <select
                id="exam-year"
                value={rocYear}
                onChange={(event) => setRocYear(Number(event.target.value))}
                className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 text-base font-bold text-[#17372a] outline-none focus:border-[#65d795]"
              >
                {rocYears.map((item) => (
                  <option key={item} value={item}>{item} 年</option>
                ))}
              </select>
            </div>

            <div>
              <div className="study-field-label">02　選擇梯次</div>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSession(item as 1 | 2)}
                    aria-pressed={session === item}
                    className="study-choice"
                  >
                    第 {item} 次
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div>
            <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">
              {rocYear} 年 · 第 {session} 次
            </div>
            <h2 className="mt-1 text-xl font-black">03　選擇科目考卷</h2>
          </div>

          <div className="study-list mt-4">
            {subjects.map((subject, index) => {
              const examKey = `${rocYear}-${session}-${subject}`;
              return (
                <ExamCard
                  key={subject}
                  index={index}
                  year={rocYear}
                  session={session}
                  subject={subject}
                  latestAttempt={latestMap.get(examKey) ?? null}
                  purchased={purchaseMap.has(examKey)}
                />
              );
            })}
          </div>
        </section>
      </StudyShell>
  );
}

function ExamCard({
  index,
  year,
  session,
  subject,
  latestAttempt,
  purchased,
}: {
  index: number;
  year: number;
  session: 1 | 2;
  subject: string;
  latestAttempt: ExamAttempt | null;
  purchased: boolean;
}) {
  const quizHref = useMemo(() => {
    const params = new URLSearchParams({
      year: String(year),
      session: String(session),
      subject,
    });
    return "/study/exam/quiz?" + params.toString();
  }, [year, session, subject]);

  const historyHref = useMemo(() => {
    const params = new URLSearchParams({
      tab: "attempts",
      year: String(year),
      session: String(session),
      subject,
    });
    return `/study/records?${params.toString()}`;
  }, [year, session, subject]);

  return (
    <article className="study-list-row grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-7 shrink-0 items-center justify-center text-sm font-semibold text-[#64816e]">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="min-w-0 flex-1 text-base font-black leading-7 text-[#17372a]">{subject}</h3>
            {purchased && (
              <span className="shrink-0 rounded-full bg-[#eaf9f0] px-2.5 py-1 text-[11px] font-black text-[#237849]">
                ✓ 詳解權限已解鎖
              </span>
            )}
          </div>
          {latestAttempt ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#789083]">
              <span className="font-black text-[#237849]">最近 {latestAttempt.score.toFixed(2)} 分</span>
              <span>{formatAttemptDate(latestAttempt.completedAt)}</span>
              <span>{latestAttempt.reviewCount} 題需複習</span>
            </div>
          ) : (
            <div className="mt-2 text-xs font-bold text-[#9aa9a1]">尚無作答紀錄</div>
          )}
          {purchased && latestAttempt && (
            <div className="mt-2 text-xs font-bold text-[#668276]">到作答紀錄查看這次錯題，需要哪題再開哪題詳解。</div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pl-10 md:flex-col md:items-end md:pl-0">
        <Link
          href={quizHref}
          className="study-text-action"
        >
          {latestAttempt ? "再次作答" : "開始作答"} →
        </Link>
        {latestAttempt ? (
          <Link
            href={historyHref}
            className="inline-flex min-h-11 items-center text-xs text-[#657b6d] hover:underline"
          >
            {purchased ? "查看錯題與詳解" : "歷史作答"}
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>
    </article>
  );
}

function LoginRequired() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-2xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/" backLabel="返回首頁" />
        <section className="mt-10 rounded-[28px] border border-[#dce9e1] bg-white p-7 text-center shadow-[0_12px_30px_rgba(30,78,50,0.05)]">
          <div className="text-3xl font-black">登入後開始刷題</div>
          <p className="mt-3 text-sm font-bold leading-6 text-[#70877a]">
            登入後，作答紀錄、錯題與學習方向都會自動保存。
          </p>
          <Link
            href="/auth/login?redirect=%2Fstudy%2Fexam"
            className="mt-6 inline-flex rounded-2xl bg-[#31c978] px-6 py-4 font-black text-white"
          >
            登入並開始刷題
          </Link>
        </section>
      </div>
    </main>
  );
}

function LoadingExamPicker() {
  return <main className="min-h-screen bg-[#f8fcf9]" />;
}
