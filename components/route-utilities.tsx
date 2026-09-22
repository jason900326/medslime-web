"use client";

import { usePathname } from "next/navigation";
import ExamElapsedTimer from "@/components/exam-elapsed-timer";

export default function RouteUtilities() {
  const pathname = usePathname();
  const nationalExam = pathname === "/study/exam/quiz";
  const freeQuiz = pathname === "/study/free-quiz/quiz";

  if (!nationalExam && !freeQuiz) return null;

  return nationalExam ? <ExamElapsedTimer /> : null;
}
