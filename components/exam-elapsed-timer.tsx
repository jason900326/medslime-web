"use client";

import { useEffect, useRef, useState } from "react";

const EXAM_STARTED_AT_KEY = "medslime_exam_started_at";
const EXAM_FINISHED_EVENT = "medslime:exam-finished";

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
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const storedStartedAt = Number(sessionStorage.getItem(EXAM_STARTED_AT_KEY));
    const startedAt = Number.isFinite(storedStartedAt) && storedStartedAt > 0
      ? storedStartedAt
      : Date.now();

    startedAtRef.current = startedAt;
    sessionStorage.setItem(EXAM_STARTED_AT_KEY, String(startedAt));
    setVisible(true);

    const update = () => {
      if (startedAtRef.current === null) return;

      setElapsed(
        Math.max(
          0,
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        ),
      );
    };

    const handleFinished = () => {
      update();
      setVisible(false);
    };

    update();
    const interval = window.setInterval(update, 1000);
    window.addEventListener(EXAM_FINISHED_EVENT, handleFinished);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(EXAM_FINISHED_EVENT, handleFinished);
      sessionStorage.removeItem(EXAM_STARTED_AT_KEY);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="exam-time fixed inset-x-0 bottom-0 z-[90] flex items-center justify-center gap-3 border-t border-[#d7e7de] bg-white/95 px-4 py-2 backdrop-blur">
      <div className="text-[10px] font-black tracking-[0.08em] text-[#789083]">
        作答時間
      </div>
      <div className="mt-0.5 font-mono text-base font-black tabular-nums text-[#245a3e]">
        {formatElapsed(elapsed)}
      </div>
    </div>
  );
}
