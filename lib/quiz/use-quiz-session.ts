"use client";

import { useCallback, useState } from "react";

export type QuizQuestionStatus = "green" | "yellow" | "red" | "gray";

export function useQuizSession() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [uncertain, setUncertain] = useState<Record<string, boolean>>({});
  const [struckOptions, setStruckOptions] = useState<Record<string, number[]>>({});

  const resetSession = useCallback(() => {
    setIndex(0);
    setAnswers({});
    setUncertain({});
    setStruckOptions({});
  }, []);

  const toggleStrike = useCallback((questionId: string, optionIndex: number) => {
    setStruckOptions((current) => {
      const list = current[questionId] ?? [];
      const exists = list.includes(optionIndex);
      return {
        ...current,
        [questionId]: exists
          ? list.filter((item) => item !== optionIndex)
          : [...list, optionIndex],
      };
    });
  }, []);

  const getQuestionStatus = useCallback(
    (questionId: string): QuizQuestionStatus => {
      const hasAnswer = answers[questionId] !== undefined;
      const isUncertain = uncertain[questionId] ?? false;

      if (hasAnswer && isUncertain) return "yellow";
      if (hasAnswer) return "green";
      if (isUncertain) return "red";
      return "gray";
    },
    [answers, uncertain],
  );

  return {
    index,
    setIndex,
    answers,
    setAnswers,
    uncertain,
    setUncertain,
    struckOptions,
    resetSession,
    toggleStrike,
    getQuestionStatus,
  };
}
