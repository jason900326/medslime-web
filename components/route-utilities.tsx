"use client";

import { usePathname } from "next/navigation";
import ExamElapsedTimer from "@/components/exam-elapsed-timer";

export default function RouteUtilities() {
  const pathname = usePathname();

  if (pathname === "/study/exam/quiz") {
    return <ExamElapsedTimer />;
  }

  return null;
}
