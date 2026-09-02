"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  const [rocYear, setRocYear] = useState(115);
  const [session, setSession] = useState<1 | 2>(1);
  const [subject, setSubject] = useState(subjects[0]);

  const quizHref = useMemo(() => {
    const params = new URLSearchParams({
      year: String(rocYear),
      session: String(session),
      subject,
    });

    return `/study/exam/quiz?${params.toString()}`;
  }, [rocYear, session, subject]);

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            NATIONAL EXAM
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            我要刷國考
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-[#70877a]">
            選擇年度、梯次與科目後開始作答。
          </p>
        </section>

        <section className="mt-8 rounded-[30px] border border-[#dce9e1] bg-white p-6 shadow-[0_14px_34px_rgba(30,78,50,0.06)] md:p-8">
          <div className="text-lg font-black">考試設定</div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-black text-[#557768]">
              年度
            </div>

            <select
              value={rocYear}
              onChange={(event) => setRocYear(Number(event.target.value))}
              className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-bold text-[#17372a] outline-none focus:border-[#65d795]"
            >
              {rocYears.map((item) => (
                <option key={item} value={item}>
                  民國 {item} 年
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-sm font-black text-[#557768]">
              梯次
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSession(item as 1 | 2)}
                  className={[
                    "rounded-xl border px-4 py-3 font-black transition",
                    session === item
                      ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                      : "border-[#dbe9e1] bg-white text-[#466a58] hover:bg-[#f5faf7]",
                  ].join(" ")}
                >
                  第 {item} 次
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-sm font-black text-[#557768]">
              科目
            </div>

            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-xl border border-[#d7e7de] bg-white px-4 py-3 font-bold text-[#17372a] outline-none focus:border-[#65d795]"
            >
              {subjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 rounded-[20px] bg-[#f6fbf8] p-4 text-sm font-bold leading-7 text-[#6f887b]">
            民國 {rocYear} 年 · 第 {session} 次 · {subject}
          </div>

          <Link
            href={quizHref}
            className="mt-5 block w-full rounded-2xl bg-[#31c978] px-5 py-4 text-center font-black text-white transition hover:bg-[#2dbc70]"
          >
            ✏️ 開始測驗
          </Link>
        </section>
      </div>
    </main>
  );
}
