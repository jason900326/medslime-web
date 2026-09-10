"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import MistakeRecordsTab from "@/components/records/mistake-records-tab";
import { readMistakes, type MistakeRecord } from "@/lib/mistake-store";

export default function IndividualMistakesPage() {
  return (
    <Suspense fallback={<LoadingMistakes />}>
      <IndividualMistakesContent />
    </Suspense>
  );
}

function IndividualMistakesContent() {
  const searchParams = useSearchParams();
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const filterYear = searchParams.get("year")?.trim() ?? "";
  const filterSession = searchParams.get("session")?.trim() ?? "";
  const filterSubject = searchParams.get("subject")?.trim() ?? "";

  useEffect(() => {
    let cancelled = false;

    void readMistakes()
      .then((items) => {
        if (!cancelled) setMistakes(items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study/mistakes" backLabel="返回錯題複習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">INDIVIDUAL MISTAKES</div>
          <h1 className="ms-page-title mt-2">個別錯題管理</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            這裡保留逐題的標記、移除、官方原題與 AI 詳解功能；一般複習建議從上一頁按測驗進入。
          </p>
        </section>

        {loading ? (
          <div className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-8 text-center font-black text-[#789083]">
            正在整理錯題...
          </div>
        ) : (
          <MistakeRecordsTab
            mistakes={mistakes}
            setMistakes={setMistakes}
            filterYear={filterYear}
            filterSession={filterSession}
            filterSubject={filterSubject}
          />
        )}
      </div>
    </main>
  );
}

function LoadingMistakes() {
  return <main className="min-h-screen bg-[#f8fcf9]" />;
}
