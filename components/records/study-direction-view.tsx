"use client";

import Link from "next/link";
import { useState } from "react";

type TopicStat = {
  topic: string;
  attempts: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
  uncertainCount: number;
  repeatedWrongQuestions: number;
  recentAccuracy: number | null;
  previousAccuracy: number | null;
  priorityScore: number;
};

type SubjectDirection = {
  subject: string;
  attempts: number;
  average: number;
  topicStats: TopicStat[];
  availableTopicCount: number;
};

export type DirectionPayload = {
  isPro: boolean;
  subjects: SubjectDirection[];
  message: string | null;
};

export default function StudyDirectionView({ data }: { data: DirectionPayload }) {
  const [selectedSubject, setSelectedSubject] = useState("");
  const weakest = data.subjects[0] ?? null;
  const selected = data.subjects.find(item => item.subject === selectedSubject) ?? weakest;
  if (!weakest || !selected) return <EmptyDirectionState />;

  return (
    <>
      <section className="mt-8" aria-labelledby="subject-analysis-heading">
        <h2 id="subject-analysis-heading" className="study-section-heading">優先補強科目{data.isPro ? " · Pro" : ""}</h2>
        <div className="mt-5 grid items-start gap-7 md:grid-cols-[210px_minmax(0,1fr)]">
          <label className="md:hidden"><span className="study-field-label">選擇分析科目</span>
            <select aria-label="選擇分析科目" className="study-field" value={selected.subject} onChange={event => setSelectedSubject(event.target.value)}>
              {data.subjects.map(subject => <option key={subject.subject} value={subject.subject}>{shortSubject(subject.subject)} · 平均 {subject.average.toFixed(1)} 分</option>)}
            </select>
          </label>
          <div className="hidden flex-col gap-1 md:flex" aria-label="科目列表">
            {data.subjects.map((subject, index) => (
              <button key={subject.subject} type="button" aria-pressed={selected.subject === subject.subject} onClick={() => setSelectedSubject(subject.subject)} className="study-subject-button">
                <span className="text-xs text-[#64816e]">{String(index + 1).padStart(2, "0")} · {subject.attempts} 次作答</span>
                <span className="mt-1 block text-sm font-semibold leading-6">{shortSubject(subject.subject)}</span>
                <span className="mt-1 block text-xs text-[#64816e]">平均 {subject.average.toFixed(1)} 分</span>
              </button>
            ))}
          </div>
          <div className="study-panel analysis-panel min-w-0" role="region" aria-label={`${shortSubject(selected.subject)}分析`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e8e2] pb-4">
              <h3 className="text-lg font-bold">{shortSubject(selected.subject)}</h3>
              <span className="text-xs text-[#657c6d]">{selected.topicStats.length} 個補強方向</span>
            </div>
            {selected.topicStats.length > 0 ? selected.topicStats.map((topic, index) => (
              <article key={topic.topic} className="study-topic-row analysis-topic">
                <div className="analysis-topic-heading flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#64816e]">{index === 0 ? "優先補強" : `接著練習 ${index + 1}`}</p>
                    <h4 className="mt-1 break-words text-base font-bold">{topic.topic}</h4>
                  </div>
                  <PracticeLink subject={selected.subject} topic={topic.topic} label="練習 10 題 →" compact />
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edf2ed]" role="meter" aria-label={`${topic.topic}正確率`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, topic.accuracy))}>
                    <div className="h-full rounded-full bg-[#68a47b]" style={{ width: `${Math.max(0, Math.min(100, topic.accuracy))}%` }} />
                  </div>
                  <span className="text-sm font-bold tabular-nums">{topic.accuracy.toFixed(0)}% <span className="text-xs font-normal text-[#667c6d]">正確率</span></span>
                </div>
                <p className="study-muted mt-3">答對 {topic.correctCount} / {topic.answeredCount} 題 · 跨 {topic.attempts} 次作答</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-6 text-[#657b6d]">
                  <span>重複答錯 {topic.repeatedWrongQuestions} 題</span>
                  <span>標記不確定 {topic.uncertainCount} 次</span>
                  <span className={improvementTone(topic)}>{improvementLabel(topic)}</span>
                </div>
              </article>
            )) : <p className="study-muted py-8">完成更多作答後，這裡會整理你的補強方向。</p>}
            {!data.isPro && selected.availableTopicCount > selected.topicStats.length && <p className="study-muted mt-4">Pro 可查看更多補強方向。<Link href="/shop" className="study-text-action ml-2">了解 Pro →</Link></p>}
          </div>
        </div>
        {data.message && <p className="study-muted mt-5">{data.message}</p>}
      </section>
    </>
  );
}

function improvementLabel(topic: TopicStat) {
  if (
    topic.attempts < 2 ||
    topic.answeredCount < 10 ||
    topic.recentAccuracy === null ||
    topic.previousAccuracy === null
  ) {
    return "資料累積中";
  }

  const delta = topic.recentAccuracy - topic.previousAccuracy;
  if (delta >= 5) return "最近有開始改善";
  if (delta <= -5) return "還需要再補強";
  return "持續觀察中";
}

function improvementTone(topic: TopicStat) {
  if (
    topic.attempts >= 2 &&
    topic.answeredCount >= 10 &&
    topic.recentAccuracy !== null &&
    topic.previousAccuracy !== null
  ) {
    const delta = topic.recentAccuracy - topic.previousAccuracy;
    if (delta >= 5) return "text-[#237849]";
    if (delta <= -5) return "text-[#a15a5a]";
  }

  return "text-[#8a9c92]";
}

function PracticeLink({
  subject,
  topic,
  label,
  compact = false,
}: {
  subject: string;
  topic: string;
  label: string;
  compact?: boolean;
}) {
  const params = new URLSearchParams({
    from: "106",
    to: "115",
    subject,
    topic,
    count: "10",
  });
  const href = "/study/free-quiz/quiz?" + params.toString();

  return (
    <Link
      href={href}
      className={
        compact
          ? "study-text-action shrink-0"
          : "ms-primary-action shrink-0"
      }
    >
      {label}
    </Link>
  );
}

function shortSubject(subject: string) {
  return subject
    .replace("（包括細菌與黴菌）", "")
    .replace("（包括細菌與真菌）", "")
    .replace("學與臨床", "／臨床")
    .trim();
}

function EmptyDirectionState() {
  return (
    <section className="mt-6 rounded-[24px] border border-[#dce9e1] bg-white p-7 text-center">
      <div className="text-4xl">📝</div>
      <h2 className="mt-3 text-xl font-black">先完成一份考卷</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-[#789083]">
        有了作答紀錄，MedSlime 才能開始整理你的科目狀況與下一步方向。
      </p>
      <Link
        href="/study/exam"
        className="mt-5 inline-block rounded-xl bg-[#31c978] px-5 py-3 text-sm font-black text-white"
      >
        開始刷題
      </Link>
    </section>
  );
}
