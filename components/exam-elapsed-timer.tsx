"use client";

import { useEffect, useRef, useState } from "react";

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours <= 0) return `${mm}:${ss}`;
  return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
}

export default function ExamElapsedTimer() {
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }

    const update = () => {
      if (startedAtRef.current === null) return;

      setElapsed(
        Math.max(
          0,
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        ),
      );
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-[90] rounded-2xl border border-[#d7e7de] bg-white/95 px-4 py-2.5 text-right shadow-[0_10px_28px_rgba(31,83,53,0.12)] backdrop-blur sm:right-6 sm:top-6">
      <div className="text-[10px] font-black tracking-[0.08em] text-[#789083]">
        作答時間
      </div>
      <div className="mt-0.5 font-mono text-base font-black tabular-nums text-[#245a3e]">
        {formatElapsed(elapsed)}
      </div>
    </div>
  );
}
