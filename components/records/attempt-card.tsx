"use client";

import Link from "next/link";
import {
  formatAttemptDate,
  formatAttemptDuration,
  type ExamAttempt,
} from "@/lib/exam-attempt-store";

function isFreeQuizAttempt(attempt: ExamAttempt) {
  return attempt.session === "自由測驗";
}

function splitYearRange(value: string) {
  const match = value.match(/^(\d{2,3})-(\d{2,3})$/);
  return match ? { from: match[1], to: match[2] } : null;
}

export default function AttemptCard({
  attempt,
  previous,
  explanationUnlocked = false,
}: {
  attempt: ExamAttempt;
  previous: ExamAttempt | null;
  explanationUnlocked?: boolean;
}) {
  const freeQuiz = isFreeQuizAttempt(attempt);
  const yearRange = freeQuiz ? splitYearRange(attempt.year) : null;
  const quizParams = new URLSearchParams({
    year: attempt.year,
    session: attempt.session,
    subject: attempt.subject,
  });
  const freeQuizParams = new URLSearchParams({
    from: yearRange?.from ?? "110",
    to: yearRange?.to ?? "115",
    subject: attempt.subject,
  });
  const sameExamPrevious = previous?.examKey === attempt.examKey ? previous : null;
  const delta = sameExamPrevious ? attempt.score - sameExamPrevious.score : null;
  return (
    <article className="study-list-row">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black tracking-[0.02em] text-[#2ba962]">
            {freeQuiz
              ? `自由測驗 · ${attempt.year.replace("-", "–")} 年`
              : `${attempt.year} 年・第 ${attempt.session} 次`}
          </div>
          <h3 className="mt-1 text-base font-semibold leading-7 text-[#17372a]">
            {attempt.subject}
          </h3>
          <div className="mt-1 text-xs font-bold text-[#8a9c92]">
            {formatAttemptDate(attempt.completedAt)}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold tracking-[-0.05em] text-[#17372a]">
            {attempt.score.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[11px] font-bold text-[#8a9c92]">分</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-[#6f8679]">
        <span>
          答對 <strong className="font-black text-[#315b45]">{attempt.correctCount} 題</strong>
        </span>
        <span className="text-[#c9d4ce]">•</span>
        <span>
          需複習 <strong className="font-black text-[#315b45]">{attempt.reviewCount} 題</strong>
        </span>
        <span className="text-[#c9d4ce]">•</span>
        <span>{formatAttemptDuration(attempt.durationSeconds)}</span>
        {delta !== null && (
          <>
            <span className="text-[#c9d4ce]">•</span>
            <span className={delta >= 0 ? "font-black text-[#237849]" : "font-black text-[#a15a5a]"}>
              前次 {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
            </span>
          </>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/study/records/attempt/${attempt.id}`}
          className="study-text-action"
        >
          檢討這次作答 →
        </Link>

        <Link
          href={
            freeQuiz
              ? `/study/free-quiz?${freeQuizParams.toString()}`
              : `/study/exam/quiz?${quizParams.toString()}`
          }
          className="inline-flex min-h-11 items-center text-xs font-black text-[#6d8578] underline decoration-[#d8e7de] underline-offset-4"
        >
          {freeQuiz ? "再組一份" : "再次作答"}
        </Link>
      </div>

      {!freeQuiz && explanationUnlocked && <p className="text-xs text-[#547a60]">✓ 本卷詳解已解鎖</p>}
    </article>
  );
}
