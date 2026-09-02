"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import TopBar from "@/components/top-bar";

const rocYears = Array.from({ length: 10 }, (_, index) => 115 - index);

const subjects = [
  "臨床血液學與血庫學",
  "臨床生化學",
  "臨床微生物學",
  "臨床免疫學與病毒學",
  "醫學分子檢驗學與鏡檢學",
  "臨床生理學與病理學",
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

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-[#dce9e1] bg-white p-6 shadow-[0_12px_28px_rgba(30,78,50,0.055)]">
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

            <Link
              href={quizHref}
              className="mt-6 block w-full rounded-2xl bg-[#31c978] px-5 py-4 text-center font-black text-white transition hover:bg-[#2dbc70]"
            >
              開始作答 →
            </Link>
          </div>

          <div className="rounded-[28px] border border-[#dce9e1] bg-gradient-to-br from-[#eefaf2] via-white to-[#eef8fb] p-6 shadow-[0_12px_28px_rgba(30,78,50,0.055)]">
            <div className="text-lg font-black">本次考卷</div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoCard label="年度" value={`民國 ${rocYear} 年`} />
              <InfoCard label="梯次" value={`第 ${session} 次`} />
              <InfoCard label="題數" value="80 題" />
              <InfoCard label="每題分數" value="1.25 分" />
            </div>

            <div className="mt-5 rounded-[20px] border border-[#dfece4] bg-white/80 p-5">
              <div className="text-sm font-black text-[#315b45]">
                科目
              </div>
              <div className="mt-2 text-xl font-black">{subject}</div>
            </div>

            <div className="mt-5 rounded-[20px] bg-white/80 p-5 text-sm leading-7 text-[#6f887b]">
              正式接回 Supabase 後，這裡會直接讀你已經匯入的國考題庫。
              目前先把正式前端選卷流程做起來。
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#dfece4] bg-white p-5">
      <div className="text-sm font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
