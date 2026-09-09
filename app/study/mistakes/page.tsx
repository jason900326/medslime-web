"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import MistakeRecordsTab from "@/components/records/mistake-records-tab";
import { readMistakes, type MistakeRecord } from "@/lib/mistake-store";

export default function MistakesPage() {
  return (
    <Suspense fallback={<LoadingMistakes />}>
      <MistakesContent />
    </Suspense>
  );
}

function MistakesContent() {
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
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">
            MISTAKE REVIEW
          </div>
          <h1 className="ms-page-title mt-2">錯題複習</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            這裡只放需要重新複習的題目；作答歷史與成績分析則留在學習紀錄。
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
