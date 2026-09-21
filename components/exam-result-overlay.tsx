"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  formatAttemptDuration,
  readExamAttempts,
  type ExamAttempt,
} from "@/lib/exam-attempt-store";
import {
  readGuestExamAttempt,
  type SaveExamAttemptInput,
} from "@/lib/guest-exam-attempt-store";

const FINISHED_EVENT = "medslime:exam-finished";

type OverlayState =
  | { status: "hidden" }
  | { status: "saving"; eventAt: number }
  | { status: "ready"; attempt: ExamAttempt }
  | { status: "guest"; input: SaveExamAttemptInput };

export default function ExamResultOverlay() {
  const [state, setState] = useState<OverlayState>({ status: "hidden" });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleFinished = () => {
      clearTimer();
      const eventAt = Date.now();
      setState({ status: "saving", eventAt });

      let tries = 0;
      const poll = async () => {
        tries += 1;
        try {
          const attempts = await readExamAttempts(1);
          const latest = attempts[0];
          if (latest) {
            const completedAt = new Date(latest.completedAt).getTime();
            if (
              Number.isFinite(completedAt) &&
              completedAt >= eventAt - 5000
            ) {
              setState({ status: "ready", attempt: latest });
              return;
            }
          }

          const guestAttempt = readGuestExamAttempt();
          if (guestAttempt) {
            setState({ status: "guest", input: guestAttempt });
            return;
          }
        } catch {
          // The quiz page is still saving. Retry below.
        }

        if (tries < 20) {
          timerRef.current = window.setTimeout(poll, 350);
        }
      };

      timerRef.current = window.setTimeout(poll, 180);
    };

    window.addEventListener(FINISHED_EVENT, handleFinished);
    return () => {
      clearTimer();
      window.removeEventListener(FINISHED_EVENT, handleFinished);
    };
  }, []);

  if (state.status === "hidden") return null;

  const ready = state.status === "ready" ? state.attempt : null;

  return (
    <div className="fixed inset-0 z-[135] overflow-y-auto bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full rounded-[30px] border border-[#dce9e1] bg-white p-6 text-center shadow-[0_18px_50px_rgba(30,78,50,0.08)] sm:p-9">
          <div className="text-xs font-black tracking-[0.12em] text-[#2ba962]">RESULT</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">作答完成</h1>

          {state.status === "guest" ? (
            <GuestAttemptResult input={state.input} />
          ) : ready ? (
            <>
              <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4">
                <ResultStat label="成績" value={formatScore(ready)} />
                <ResultStat label="作答時間" value={formatAttemptDuration(ready.durationSeconds)} />
                <ResultStat label="答對" value={`${ready.correctCount} 題`} />
                <ResultStat label="需要再看" value={`${ready.reviewCount} 題`} />
              </div>

              <div className="mt-5 rounded-2xl bg-[#f3fbf6] px-4 py-3 text-sm font-bold leading-6 text-[#557768]">
                作答內容已存進學習紀錄。完整考卷、你的答案、正解、觀念不熟與筆記都在這次作答裡處理。
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href={`/study/records/attempt/${ready.id}`}
                  className="rounded-xl bg-[#31c978] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#2dbc70]"
                >
                  查看這次作答紀錄 →
                </Link>
                <Link
                  href="/study/records?tab=attempts"
                  className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3.5 text-sm font-black text-[#315b45]"
                >
                  返回作答紀錄
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-7 rounded-2xl border border-[#dce9e1] bg-[#f8fcf9] px-5 py-6">
              <div className="mx-auto h-10 w-12 animate-bounce rounded-[50%_50%_42%_42%/56%_56%_42%_42%] border-2 border-[#8fd0a9] bg-[#d9f3e4]" />
              <div className="mt-4 text-sm font-black text-[#557768]">正在保存這次作答…</div>
              <div className="mt-1 text-xs font-bold text-[#8a9c92]">完成後會直接帶你到可檢討的作答紀錄</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function GuestAttemptResult({ input }: { input: SaveExamAttemptInput }) {
  return (
    <>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4">
        <ResultStat label="成績" value={input.score.toFixed(2) + " 分"} />
        <ResultStat label="需要再看" value={input.reviewCount + " 題"} />
      </div>

      <div className="mt-5 rounded-2xl border border-[#cfe7d8] bg-[#f3fbf6] px-4 py-4 text-left">
        <div className="text-sm font-black text-[#237849]">這份成果先幫你留住了</div>
        <p className="mt-2 text-sm font-bold leading-6 text-[#557768]">
          註冊或登入後，這次作答會加入你的學習紀錄，之後才能累積弱點並看到下一步該讀什麼。
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/auth/sign-up?redirect=%2Fstudy%2Frecords"
          className="rounded-xl bg-[#31c978] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#2dbc70]"
        >
          註冊並保存紀錄
        </Link>
        <Link
          href="/auth/login?redirect=%2Fstudy%2Frecords"
          className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3.5 text-sm font-black text-[#315b45]"
        >
          已有帳號，登入
        </Link>
      </div>
    </>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#dfece4] bg-[#f8fcf9] px-3 py-4 sm:p-5">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-xl font-black leading-tight sm:text-2xl">{value}</div>
    </div>
  );
}

function formatScore(attempt: ExamAttempt) {
  return attempt.session === "自由測驗"
    ? `${attempt.score.toFixed(1)}%`
    : `${attempt.score.toFixed(2)} 分`;
}
