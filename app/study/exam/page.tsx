"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";
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
  const [rocYear, setRocYear] = useState(115);
  const [session, setSession] = useState<1 | 2>(1);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [purchases, setPurchases] = useState<PurchasedExam[]>([]);
  const explanationMode = searchParams.get("mode") === "explanation";

  useEffect(() => {
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
  }, []);

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

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">NATIONAL EXAM</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">歷屆國考</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            選年度與梯次，再挑一份考卷開始作答；寫過的考卷會留下成績與錯題紀錄。
          </p>
        </section>

        {explanationMode && (
          <section className="mt-5 rounded-[22px] border border-[#cfe7d8] bg-[#f3fbf6] px-5 py-4">
            <div className="text-sm font-black text-[#237849]">單份考卷詳解怎麼用？</div>
            <p className="mt-1 text-sm font-bold leading-6 text-[#668276]">
              完成考卷後可一次解鎖該份考卷的詳解權限；之後從作答紀錄查看自己的錯題，需要哪題再展開哪題，不會自動產生整份解析。
            </p>
          </section>
        )}

        <section className="mt-5 rounded-[26px] border border-[#dce9e1] bg-white p-5 shadow-[0_12px_30px_rgba(30,78,50,0.05)] md:p-7">
          <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
            <div>
              <div className="mb-2 text-sm font-black text-[#557768]">年度</div>
              <select
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
              <div className="mb-2 text-sm font-black text-[#557768]">梯次</div>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSession(item as 1 | 2)}
                    className={[
                      "rounded-xl border px-4 py-3 text-base font-black transition",
                      session === item
                        ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                        : "border-[#dbe9e1] bg-white text-[#466a58]",
                    ].join(" ")}
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
            <h2 className="mt-1 text-xl font-black">選擇科目考卷</h2>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
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
      </div>
    </main>
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
    const params = new URLSearchParams({ year: String(year), session: String(session), subject });
    return `/study/exam/quiz?${params.toString()}`;
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
    <article className="flex min-h-[180px] flex-col rounded-[22px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eefaf2] text-sm font-black text-[#237849]">
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

      <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
        <Link
          href={quizHref}
          className="block w-full rounded-xl bg-[#31c978] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-[#2dbc70]"
        >
          ✏️ {latestAttempt ? "再次作答" : "開始作答"}
        </Link>
        {latestAttempt ? (
          <Link
            href={historyHref}
            className="block w-full rounded-xl border border-[#cfe7d8] bg-white px-4 py-3 text-center text-sm font-black text-[#315b45] transition hover:bg-[#f3fbf6]"
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

function LoadingExamPicker() {
  return <main className="min-h-screen bg-[#f8fcf9]" />;
}
