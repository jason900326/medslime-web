import type { ReactNode } from "react";
import ExamElapsedTimer from "@/components/exam-elapsed-timer";

export default function ExamQuizLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ExamElapsedTimer />
    </>
  );
}
