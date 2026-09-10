"use client";

import { Suspense, useState } from "react";
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
  const targetTopic = searchParams.get("topic")?.trim() ?? "";
  const targetSubtopic = targetTopic ? searchParams.get("subtopic")?.trim() ?? "" : "";
  const targeted = Boolean(targetTopic);
  const requestedCount = Number(searchParams.get("count") ?? 20);
  const initialCount = questionCounts.includes(requestedCount as (typeof questionCounts)[number])
    ? (requestedCount as (typeof questionCounts)[number])
    : 20;

  const [fromYear, setFromYear] = useState(Math.min(initialFrom, initialTo));
  const [toYear, setToYear] = useState(Math.max(initialFrom, initialTo));
  const [subject, setSubject] = useState(subjects.includes(initialSubject) ? initialSubject : subjects[1]);
  const [count, setCount] = useState<(typeof questionCounts)[number]>(initialCount);

  const startQuiz = () => {
    const params = new URLSearchParams({
      from: String(fromYear),
      to: String(toYear),
      subject,
      count: String(count),
    });
    if (targetTopic) params.set("topic", targetTopic);
    if (targetSubtopic) params.set("subtopic", targetSubtopic);
    router.push(`/study/free-quiz/quiz?${params.toString()}`);
  };

  const clearTarget = () => {
    const params = new URLSearchParams({
      from: String(fromYear),
      to: String(toYear),
      subject,
      count: String(count),
    });
    router.replace(`/study/free-quiz?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            {targeted ? "WEAK TOPIC PRACTICE" : "FREE QUIZ"}
          </div>
          <h1 className="ms-page-title mt-2">{targeted ? "弱主題練習" : "自由測驗"}</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#70877a]">
            {targeted
              ? "這份練習會鎖定 Pro 分析找到的弱主題，優先抽出同 Subtopic 題目；細分題量不足時，只會用同一 Topic 的相關題補足。完成後的新作答也會回到弱點分析。"
              : "自己決定年份範圍、科目與題數。系統會從歷屆國考中隨機組一份練習，答錯或標記不確定的題目一樣會進錯題紀錄。"}
          </p>
        </section>

        {targeted && (
          <section className="mt-5 rounded-[22px] border border-[#bfe1cb] bg-[#eefaf2] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-black text-[#2ba962]">本次鎖定弱點</div>
                <div className="mt-1 text-lg font-black text-[#237849]">{targetSubtopic || targetTopic}</div>
                {targetSubtopic && (
                  <div className="mt-1 text-xs font-bold text-[#668276]">上層主題：{targetTopic}</div>
                )}
              </div>
              <button
                type="button"
                onClick={clearTarget}
                className="shrink-0 rounded-xl border border-[#cfe7d8] bg-white px-3 py-2 text-xs font-black text-[#557768]"
              >
                改回隨機
              </button>
            </div>
          </section>
        )}

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
              disabled={targeted}
              className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 text-base font-bold leading-6 outline-none focus:border-[#65d795] disabled:cursor-not-allowed disabled:bg-[#f4f8f5] disabled:text-[#789083]"
            >
              {subjects.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            {targeted && (
              <div className="mt-2 text-xs font-bold leading-5 text-[#8a9c92]">
                弱主題隸屬這個科目，因此此模式下不切換科目；要換科請先改回隨機模式。
              </div>
            )}
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

          <button
            type="button"
            onClick={startQuiz}
            className="mt-6 w-full rounded-2xl bg-[#31c978] px-5 py-4 text-base font-black text-white transition hover:bg-[#2dbc70]"
          >
            {targeted ? "開始弱主題練習 →" : "開始自由測驗 →"}
          </button>
        </section>

        <section className="mt-5 rounded-[22px] border border-[#dce9e1] bg-white/70 px-5 py-4 text-sm font-bold leading-6 text-[#789083]">
          {targeted
            ? "弱主題模式只使用已確認 taxonomy 的題目。若指定 Subtopic 題量不足，會先保留所有精準弱點題，再從同一 Topic 補足；只有整個 Topic 題量也不足時，實際題數才會少於設定。"
            : "自由測驗目前採隨機抽題；交卷後會保存作答紀錄與當次錯題快照。"}
        </section>
      </div>
    </main>
  );
}

function clampYear(value: number) {
  if (!Number.isFinite(value)) return 115;
  return Math.max(106, Math.min(115, Math.floor(value)));
}
