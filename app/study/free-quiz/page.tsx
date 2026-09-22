"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StudyShell from "@/components/study-shell";

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
    <StudyShell>

        <section className="mt-6">

          <h1 className="ms-page-title mt-2">{targeted ? "弱主題練習" : "自由測驗"}</h1>

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

        <div className="study-form-layout">
          <div>
            <section className="study-form-section">
              <label htmlFor="quiz-subject" className="study-field-label">01　選擇科目</label>
              <select id="quiz-subject" value={subject} onChange={event => setSubject(event.target.value)} disabled={targeted} className="study-field disabled:bg-[#edf2ee]">
                {subjects.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
              {targeted && <p className="study-muted mt-2">科目已依弱點鎖定。要換科目，可先切回隨機模式。</p>}
            </section>
            <section className="study-form-section">
              <h2 className="study-field-label">02　決定練習份量</h2>
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="測驗題數">
                {questionCounts.map(item => <button key={item} type="button" onClick={() => setCount(item)} aria-pressed={count === item} className="study-choice">{item} 題</button>)}
              </div>
              <p className="study-muted mt-2">少量練習或完整挑戰，依今天的時間安排。</p>
            </section>
            <section className="study-form-section">
              <h2 className="study-field-label">03　設定題庫年份</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="quiz-from" className="study-muted mb-2 block">起始年份</label>
                  <select id="quiz-from" value={fromYear} onChange={event => { const next = Number(event.target.value); setFromYear(next); if (next > toYear) setToYear(next); }} className="study-field">
                    {[...rocYears].reverse().map(year => <option key={year} value={year}>{year} 年</option>)}
                  </select>
                </div>
                <div><label htmlFor="quiz-to" className="study-muted mb-2 block">結束年份</label>
                  <select id="quiz-to" value={toYear} onChange={event => { const next = Number(event.target.value); setToYear(next); if (next < fromYear) setFromYear(next); }} className="study-field">
                    {[...rocYears].reverse().map(year => <option key={year} value={year}>{year} 年</option>)}
                  </select>
                </div>
              </div>
            </section>
          </div>
          <aside className="study-form-summary" aria-label="本次練習摘要">
            <h2 className="study-section-heading">這次練習</h2>
            <p className="mt-5 text-4xl font-bold tabular-nums">{count}<span className="ml-2 text-sm font-normal">題</span></p>
            <p className="mt-4 text-sm font-semibold leading-7">{subject}</p>
            <p className="study-muted mt-2">{fromYear}–{toYear} 年歷屆題</p>
            {targeted && <p className="study-muted mt-2">鎖定：{targetSubtopic || targetTopic}</p>}
            <button type="button" onClick={startQuiz} className="ms-primary-action mt-6 w-full">{targeted ? "開始補強練習 →" : "開始自由測驗 →"}</button>
            <p className="study-muted mt-4 text-xs">交卷後保存作答紀錄，錯題與不確定的題目可再複習。</p>
          </aside>
        </div>
        {targeted && <p className="study-muted mt-6">若細分主題的題目不足，會從同一主題補足；整個主題的題目不足時，實際題數可能少於設定。</p>}
    </StudyShell>
  );
}

function clampYear(value: number) {
  if (!Number.isFinite(value)) return 115;
  return Math.max(106, Math.min(115, Math.floor(value)));
}
