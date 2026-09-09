"use client";

import Link from "next/link";
import ExamExplanationPurchaseButton from "@/components/exam-explanation-purchase-button";
import {
  formatAttemptDate,
  formatAttemptDuration,
  type ExamAttempt,
} from "@/lib/exam-attempt-store";

export default function AttemptCard({
  attempt,
  previous,
}: {
  attempt: ExamAttempt;
  previous: ExamAttempt | null;
}) {
  const quizParams = new URLSearchParams({
    year: attempt.year,
    session: attempt.session,
    subject: attempt.subject,
  });
  const sameExamPrevious = previous?.examKey === attempt.examKey ? previous : null;
  const delta = sameExamPrevious ? attempt.score - sameExamPrevious.score : null;

  return (
    <article className="rounded-[22px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-black text-[#2ba962]">
            民國 {attempt.year} 年・第 {attempt.session} 次
          </div>
          <h3 className="mt-1 text-base font-black leading-7">{attempt.subject}</h3>
          <div className="mt-1 text-xs font-bold text-[#8a9c92]">
            {formatAttemptDate(attempt.completedAt)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-3xl font-black tracking-[-0.04em] text-[#17372a]">
            {attempt.score.toFixed(2)}
          </div>
          <div className="text-[11px] font-bold text-[#8a9c92]">分</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SmallStat label="答對" value={`${attempt.correctCount} 題`} />
        <SmallStat label="需複習" value={`${attempt.reviewCount} 題`} />
        <SmallStat label="時間" value={formatAttemptDuration(attempt.durationSeconds)} />
      </div>

      {delta !== null && (
        <div className="mt-3 text-xs font-black text-[#557768]">
          相較這份考卷前一次：
          <span className={delta >= 0 ? "text-[#237849]" : "text-[#a15a5a]"}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(2)} 分
          </span>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href={`/study/records/attempt/${attempt.id}`}
          className="rounded-xl bg-[#31c978] px-4 py-2.5 text-center text-sm font-black text-white"
        >
          查看這次作答{attempt.reviewCount > 0 ? ` · ${attempt.reviewCount} 題需複習` : ""}
        </Link>
        <Link
          href={`/study/exam/quiz?${quizParams.toString()}`}
          className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2.5 text-center text-sm font-black text-[#315b45]"
        >
          再次作答
        </Link>
      </div>

      <div className="mt-3 border-t border-[#edf2ef] pt-3">
        <div className="mb-2 text-xs font-bold text-[#789083]">
          想完整檢討這份考卷？可永久解鎖全部題目詳解。
        </div>
        <ExamExplanationPurchaseButton
          year={attempt.year}
          session={attempt.session}
          subject={attempt.subject}
          compact
        />
      </div>
    </article>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f7faf8] px-3 py-2.5 text-center">
      <div className="text-[10px] font-bold text-[#8a9c92]">{label}</div>
      <div className="mt-1 text-xs font-black text-[#315b45]">{value}</div>
    </div>
  );
}
