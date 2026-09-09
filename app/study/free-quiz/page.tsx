"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";

const rocYears = Array.from({ length: 10 }, (_, index) => 115 - index);
const questionCounts = [10, 20, 40, 80] as const;
const subjects = [
  "微生物學與臨床微生物學（包括細菌與黴菌）",
  "生物化學與臨床生化學",
  "臨床生理學與病理學",
  "臨床血液學與血庫學",
  "臨床血清免疫學與臨床病毒學",
  "醫學分子檢驗學與臨床鏡檢學（包括寄生蟲學）",
];

export default function FreeQuizPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f8fcf9]" />}>
      <FreeQuizConfigurator />
    </Suspense>
  );
}

function FreeQuizConfigurator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFrom = clampYear(Number(searchParams.get("from") ?? 110));
  const initialTo = clampYear(Number(searchParams.get("to") ?? 115));
  const initialSubject = searchParams.get("subject") ?? subjects[1];

  const [fromYear, setFromYear] = useState(Math.min(initialFrom, initialTo));
  const [toYear, setToYear] = useState(Math.max(initialFrom, initialTo));
  const [subject, setSubject] = useState(subjects.includes(initialSubject) ? initialSubject : subjects[1]);
  const [count, setCount] = useState<(typeof questionCounts)[number]>(20);

  const rangeYears = useMemo(
    () => rocYears.filter((year) => year >= fromYear && year <= toYear).length,
    [fromYear, toYear],
  );

  const startQuiz = () => {
    const params = new URLSearchParams({
      from: String(fromYear),
      to: String(toYear),
      subject,
      count: String(count),
    });
    router.push(`/study/free-quiz/quiz?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">FREE QUIZ</div>
          <h1 className="ms-page-title mt-2">自由測驗</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#70877a]">
            自己決定年份範圍、科目與題數。系統會從歷屆國考中隨機組一份練習，答錯或標記不確定的題目一樣會進錯題紀錄。
          </p>
        </section>

        <section className="mt-6 rounded-[28px] border border-[#dce9e1] bg-white p-5 shadow-[0_12px_30px_rgba(30,78,50,0.05)] sm:p-7">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-black text-[#557768]">起始年份</div>
              <select
                value={fromYear}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setFromYear(next);
                  if (next > toYear) setToYear(next);
                }}
                className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#65d795]"
              >
                {[...rocYears].reverse().map((year) => (
                  <option key={year} value={year}>{year} 年</option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 text-sm font-black text-[#557768]">結束年份</div>
              <select
                value={toYear}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setToYear(next);
                  if (next < fromYear) setFromYear(next);
                }}
                className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#65d795]"
              >
                {[...rocYears].reverse().map((year) => (
                  <option key={year} value={year}>{year} 年</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-black text-[#557768]">科目</div>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 text-base font-bold leading-6 outline-none focus:border-[#65d795]"
            >
              {subjects.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-black text-[#557768]">題數</div>
            <div className="grid grid-cols-4 gap-2">
              {questionCounts.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCount(item)}
                  className={[
                    "rounded-xl border px-2 py-3 text-sm font-black transition",
                    count === item
                      ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                      : "border-[#dbe9e1] bg-white text-[#466a58]",
                  ].join(" ")}
                >
                  {item} 題
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[#f6faf7] px-4 py-4">
            <div className="text-xs font-black text-[#2ba962]">本次設定</div>
            <div className="mt-1 text-sm font-black leading-6 text-[#315b45]">
              {fromYear}–{toYear} 年 · {rangeYears} 個年度 · {count} 題
            </div>
            <div className="mt-1 text-xs font-bold leading-5 text-[#789083]">{subject}</div>
          </div>

          <button
            type="button"
            onClick={startQuiz}
            className="mt-6 w-full rounded-2xl bg-[#31c978] px-5 py-4 text-base font-black text-white transition hover:bg-[#2dbc70]"
          >
            開始自由測驗 →
          </button>
        </section>

        <section className="mt-5 rounded-[22px] border border-[#dce9e1] bg-white/70 px-5 py-4 text-sm font-bold leading-6 text-[#789083]">
          自由測驗目前採隨機抽題；交卷後會保存作答紀錄與當次錯題快照。
        </section>
      </div>
    </main>
  );
}

function clampYear(value: number) {
  if (!Number.isFinite(value)) return 115;
  return Math.max(106, Math.min(115, Math.floor(value)));
}
