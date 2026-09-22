"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import MistakeRecordsTab from "@/components/records/mistake-records-tab";
import { readMistakes, type MistakeRecord } from "@/lib/mistake-store";

export default function ReviewRecords() {
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
    <>
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
      </>
  );
}

function LoadingMistakes() {
  return <main className="min-h-screen bg-[#f8fcf9]" />;
}
