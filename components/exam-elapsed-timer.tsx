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
  // Date.now() 不能在 Client Component render 階段執行，
  // 否則 Next.js prerender 會把它視為 unstable value。
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);

  useEffect(() => {
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }

    const update = () => {
      if (paused || startedAtRef.current === null) return;

      const seconds = Math.max(
        0,
        Math.floor(
          (Date.now() - startedAtRef.current - pausedTotalRef.current) / 1000,
        ),
      );
      setElapsed(seconds);
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [paused]);

  const togglePause = () => {
    if (paused) {
      if (pausedAtRef.current !== null) {
        pausedTotalRef.current += Date.now() - pausedAtRef.current;
      }
      pausedAtRef.current = null;
      setPaused(false);
      return;
    }

    pausedAtRef.current = Date.now();
    setPaused(true);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-2xl border border-[#d7e7de] bg-white/95 px-3 py-2 shadow-[0_10px_28px_rgba(31,83,53,0.14)] backdrop-blur">
      <div>
        <div className="text-[10px] font-black tracking-[0.08em] text-[#789083]">
          作答時間
        </div>
        <div className="font-mono text-base font-black tabular-nums text-[#245a3e]">
          {formatElapsed(elapsed)}
        </div>
      </div>

      <button
        type="button"
        onClick={togglePause}
        className="rounded-xl border border-[#d7e7de] bg-[#f8fcf9] px-3 py-2 text-xs font-black text-[#315b45]"
        aria-label={paused ? "繼續測驗計時" : "暫停測驗計時"}
      >
        {paused ? "繼續" : "暫停"}
      </button>
    </div>
  );
}
