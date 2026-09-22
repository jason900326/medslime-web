"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudyDirectionView, { type DirectionPayload } from "@/components/records/study-direction-view";
import StudyShell from "@/components/study-shell";

type DirectionState =
  | { status: "loading" }
  | { status: "ready"; data: DirectionPayload }
  | { status: "error"; message: string };

export default function WhatToStudyPage() {
  const [direction, setDirection] = useState<DirectionState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/learning-direction", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as DirectionPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "學習方向讀取失敗。");
        setDirection({ status: "ready", data: payload });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDirection({
          status: "error",
          message: error instanceof Error ? error.message : "學習方向讀取失敗。",
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <StudyShell>

        <section className="mt-6">

          <h1 className="ms-page-title mt-2">學習分析</h1>

        </section>

        {direction.status === "loading" && <DirectionLoading />}
        {direction.status === "error" && <DirectionError message={direction.message} />}
        {direction.status === "ready" && <StudyDirectionView data={direction.data} />}
      </StudyShell>
  );
}

function DirectionLoading() {
  return (
    <div className="mt-6 rounded-[24px] border border-[#dce9e1] bg-white p-8 text-center text-sm font-black text-[#789083]">
      正在整理你的作答紀錄⋯
    </div>
  );
}

function DirectionError({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-[24px] border border-[#f0dddd] bg-[#fff8f8] p-6 text-sm font-bold text-[#9b5050]">
      <h2 className="font-bold">暫時無法載入學習分析</h2>
      <p className="mt-2 font-normal">你的作答紀錄仍然保留，可以先回顧錯題，稍後再試。</p>
      <Link href="/study/records?tab=mistakes" className="study-text-action mt-3">查看待複習題目 →</Link>
      <details className="mt-3 text-xs font-normal"><summary className="cursor-pointer">錯誤資訊</summary><p className="mt-2">{message}</p></details>
    </div>
  );
}
