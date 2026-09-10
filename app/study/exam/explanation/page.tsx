"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ExamExplanationPage() {
  return (
    <Suspense fallback={<Redirecting />}>
      <LegacyExplanationRedirect />
    </Suspense>
  );
}

function LegacyExplanationRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = searchParams.get("year") ?? "";
  const session = searchParams.get("session") ?? "";
  const subject = searchParams.get("subject") ?? "";

  useEffect(() => {
    const params = new URLSearchParams({ tab: "attempts" });
    if (year) params.set("year", year);
    if (session) params.set("session", session);
    if (subject) params.set("subject", subject);
    router.replace(`/study/records?${params.toString()}`);
  }, [router, session, subject, year]);

  return <Redirecting />;
}

function Redirecting() {
  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-12 w-16 animate-bounce rounded-[50%_50%_42%_42%/56%_56%_42%_42%] border-2 border-[#8fd0a9] bg-[#d9f3e4]" />
          <div className="mt-4 text-sm font-black text-[#557768]">正在前往這份考卷的錯題回顧…</div>
          <div className="mt-2 text-xs font-bold leading-5 text-[#8a9c92]">
            詳解已改為錯題優先模式：先看自己需要複習的題目，再按需要展開解析。
          </div>
        </div>
      </div>
    </main>
  );
}
