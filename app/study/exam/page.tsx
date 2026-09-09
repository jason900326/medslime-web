"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";

const rocYears = Array.from({ length: 10 }, (_, index) => 115 - index);

const subjects = [
  "微生物學與臨床微生物學（包括細菌與黴菌）",
  "生物化學與臨床生化學",
  "臨床生理學與病理學",
  "臨床血液學與血庫學",
  "臨床血清免疫學與臨床病毒學",
  "醫學分子檢驗學與臨床鏡檢學（包括寄生蟲學）",
];

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
  const explanationMode = searchParams.get("mode") === "explanation";

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            NATIONAL EXAM
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">
            歷屆國考
          </h1>

          <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            選年度與梯次，再從下面直接挑一份考卷開始作答。
          </p>
        </section>

        {explanationMode && (
          <section className="mt-5 rounded-[22px] border border-[#cfe7d8] bg-[#f3fbf6] px-5 py-4">
            <div className="text-sm font-black text-[#237849]">
              想解鎖 NT$59 單份完整詳解？
            </div>
            <p className="mt-1 text-sm font-bold leading-6 text-[#668276]">
              先選一份考卷並完成作答；交卷後會依這一份考卷顯示完整詳解的解鎖入口。
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
                  <option key={item} value={item}>
                    民國 {item} 年
                  </option>
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
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">
                民國 {rocYear} 年 · 第 {session} 次
              </div>
              <h2 className="mt-1 text-xl font-black">選擇科目考卷</h2>
            </div>
            <div className="text-xs font-bold text-[#8a9c92]">每份約 80 題</div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {subjects.map((subject, index) => (
              <ExamCard
                key={subject}
                index={index}
                year={rocYear}
                session={session}
                subject={subject}
              />
            ))}
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
}: {
  index: number;
  year: number;
  session: 1 | 2;
  subject: string;
}) {
  const quizHref = useMemo(() => {
    const params = new URLSearchParams({
      year: String(year),
      session: String(session),
      subject,
    });
    return `/study/exam/quiz?${params.toString()}`;
  }, [year, session, subject]);

  return (
    <article className="flex min-h-[190px] flex-col rounded-[22px] border border-[#dce9e1] bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eefaf2] text-sm font-black text-[#237849]">
          {index + 1}
        </div>
        <span className="rounded-full bg-[#f7faf8] px-3 py-1 text-[11px] font-black text-[#789083]">
          完整詳解 NT$59／份
        </span>
      </div>

      <h3 className="mt-4 text-base font-black leading-7 text-[#17372a]">{subject}</h3>
      <p className="mt-1 text-xs font-bold leading-5 text-[#789083]">
        先免費作答；交卷後可選擇是否永久解鎖這份考卷的完整詳解。
      </p>

      <Link
        href={quizHref}
        className="mt-auto block w-full rounded-xl bg-[#31c978] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-[#2dbc70]"
      >
        ✏️ 開始作答
      </Link>
    </article>
  );
}

function LoadingExamPicker() {
  return <main className="min-h-screen bg-[#f8fcf9]" />;
}
