"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import TopBar from "@/components/top-bar";
import ExamExplanationPurchaseButton from "@/components/exam-explanation-purchase-button";
import AIExplanationButton from "@/components/ai-explanation-button";
import OfficialQuestionCrop from "@/components/official-question-crop";
import QuestionSlimeMap from "@/components/question-slime-map";
import {
  formatAttemptDate,
  formatAttemptDuration,
  readExamAttempt,
  type ExamAttempt,
  type ExamAttemptQuestionItem,
  type ExamAttemptReviewItem,
} from "@/lib/exam-attempt-store";
import { readMistakes } from "@/lib/mistake-store";
import {
  readQuestionLearningStates,
  saveQuestionLearningState,
  type QuestionLearningState,
} from "@/lib/question-learning-state";
import {
  getCachedExamExplanationAccess,
  loadExamExplanationAccessKeys,
} from "@/lib/exam-explanation-access-cache";

type Filter = "all" | "wrong" | "uncertain" | "unfamiliar";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      attempt: ExamAttempt;
      questions: ExamAttemptQuestionItem[];
      legacyPartial: boolean;
    };

type NationalExamQuestion = {
  id: string;
  questionNumber: number;
  stem: string;
  options: string[];
  correctIndex: number | null;
  questionPdfUrl: string | null;
};

export default function AttemptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [purchased, setPurchased] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [learningStates, setLearningStates] = useState<
    Map<string, QuestionLearningState>
  >(new Map());
  const [learningStateError, setLearningStateError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (!id) throw new Error("找不到這筆作答紀錄。");
        const attempt = await readExamAttempt(id);
        if (!attempt) throw new Error("找不到這筆作答紀錄，或這筆紀錄不屬於目前帳號。");

        const hydrated = await hydrateAttemptQuestions(attempt);
        if (!cancelled) {
          setState({
            status: "ready",
            attempt,
            questions: hydrated.questions,
            legacyPartial: hydrated.legacyPartial,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "讀取作答紀錄失敗。",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const attempt = state.status === "ready" ? state.attempt : null;
  const questions = state.status === "ready" ? state.questions : [];

  useEffect(() => {
    if (!attempt || attempt.session === "自由測驗") {
      setPurchased(false);
      return;
    }

    const cached = getCachedExamExplanationAccess(attempt.examKey);
    if (cached !== null) {
      setPurchased(cached);
      return;
    }

    let cancelled = false;
    void loadExamExplanationAccessKeys()
      .then((keys) => {
        if (!cancelled) setPurchased(keys.has(attempt.examKey));
      })
      .catch(() => {
        if (!cancelled) setPurchased(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    let cancelled = false;
    const keys = questions.map((item) => item.questionKey).filter(Boolean);
    if (keys.length === 0) {
      setLearningStates(new Map());
      return;
    }

    void readQuestionLearningStates(keys)
      .then((items) => {
        if (!cancelled) {
          setLearningStates(items);
          setLearningStateError("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLearningStateError(
            error instanceof Error ? error.message : "讀取題目筆記失敗。",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [questions]);

  const updateLearningState = async (
    questionKey: string,
    next: { conceptUnfamiliar: boolean; note: string; resetMastery?: boolean },
  ) => {
    const previous = learningStates.get(questionKey);
    const optimistic: QuestionLearningState = {
      questionKey,
      conceptUnfamiliar: next.conceptUnfamiliar,
      note: next.note,
      masteryStreak: next.resetMastery ? 0 : previous?.masteryStreak ?? 0,
      masteredAt: next.resetMastery ? null : previous?.masteredAt ?? null,
      lastPracticedAt: previous?.lastPracticedAt ?? null,
      updatedAt: new Date().toISOString(),
    };
    setLearningStates((current) => {
      const copy = new Map(current);
      copy.set(questionKey, optimistic);
      return copy;
    });

    try {
      const saved = await saveQuestionLearningState({ questionKey, ...next });
      setLearningStates((current) => {
        const copy = new Map(current);
        copy.set(questionKey, saved);
        return copy;
      });
      setLearningStateError("");
    } catch (error) {
      setLearningStates((current) => {
        const copy = new Map(current);
        if (previous) copy.set(questionKey, previous);
        else copy.delete(questionKey);
        return copy;
      });
      setLearningStateError(
        error instanceof Error ? error.message : "儲存題目筆記失敗。",
      );
      throw error;
    }
  };

  if (state.status === "loading") {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center font-black text-[#789083]">
          正在還原這次考卷...
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <TopBar showBack backHref="/study/records?tab=attempts" backLabel="返回作答紀錄" />
          <div className="mt-8 rounded-[24px] border border-[#f0dddd] bg-white p-6">
            <div className="text-xl font-black text-[#9b5050]">無法開啟作答紀錄</div>
            <div className="mt-2 text-sm font-bold leading-6 text-[#70877a]">{state.message}</div>
          </div>
        </div>
      </main>
    );
  }

  const { attempt: readyAttempt, legacyPartial } = state;
  const freeQuiz = readyAttempt.session === "自由測驗";
  const quizParams = new URLSearchParams({
    year: readyAttempt.year,
    session: readyAttempt.session,
    subject: readyAttempt.subject,
  });
  const range = parseYearRange(readyAttempt.year);
  const freeQuizParams = new URLSearchParams({
    from: range?.from ?? "110",
    to: range?.to ?? "115",
    subject: readyAttempt.subject,
  });

  const wrongCount = questions.filter((item) => item.correct === false).length;
  const uncertainCount = questions.filter((item) => item.uncertain).length;
  const unfamiliarCount = questions.filter(
    (item) => learningStates.get(item.questionKey)?.conceptUnfamiliar,
  ).length;

  const visibleQuestions = questions.filter((item) => {
    if (filter === "wrong") return item.correct === false;
    if (filter === "uncertain") return item.uncertain;
    if (filter === "unfamiliar") {
      return learningStates.get(item.questionKey)?.conceptUnfamiliar === true;
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <TopBar showBack backHref="/study/records?tab=attempts" backLabel="返回作答紀錄" />

        <section className="mt-6">
          <div className="text-xs font-black tracking-[0.1em] text-[#2ba962]">EXAM REVIEW</div>
          <h1 className="ms-page-title mt-2">這次作答</h1>
          <div className="mt-2 text-sm font-bold leading-6 text-[#70877a]">
            {freeQuiz
              ? `自由測驗 · ${readyAttempt.year.replace("-", "–")} 年 · ${readyAttempt.subject}`
              : `${readyAttempt.year} 年・第 ${readyAttempt.session} 次・${readyAttempt.subject}`}
          </div>
          <div className="mt-1 text-xs font-bold text-[#8a9c92]">
            {formatAttemptDate(readyAttempt.completedAt)}
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="分數" value={readyAttempt.score.toFixed(2)} />
          <Stat label="答對" value={`${readyAttempt.correctCount} 題`} />
          <Stat label="答錯" value={`${wrongCount} 題`} />
          <Stat label="作答時間" value={formatAttemptDuration(readyAttempt.durationSeconds)} />
        </section>

        {legacyPartial && (
          <div className="mt-5 rounded-2xl border border-[#f0dfaa] bg-[#fff9e8] px-4 py-3 text-sm font-bold leading-6 text-[#80651e]">
            這是新版完整考卷快照上線前的舊作答紀錄，因此只能還原當時有保存的題目。從下一次作答開始，整份考卷都會完整保留。
          </div>
        )}

        {!freeQuiz && (
          <section className="mt-5 rounded-[22px] border border-[#dce9e1] bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-black text-[#315b45]">這份考卷的解析權限</div>
                  {purchased && (
                    <span className="rounded-full bg-[#eaf9f0] px-2.5 py-1 text-[11px] font-black text-[#237849]">
                      ✓ 已永久解鎖
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs font-bold leading-5 text-[#789083]">
                  解鎖後可查看本卷全部題目解析
                </div>
              </div>
              {!purchased && (
                <ExamExplanationPurchaseButton
                  year={readyAttempt.year}
                  session={readyAttempt.session}
                  subject={readyAttempt.subject}
                  compact
                />
              )}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-[24px] border border-[#dce9e1] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold text-[#789083]">
            <Legend className="bg-[#eaf9f0] border-[#9ed9b5]" label="答對" />
            <Legend className="bg-[#fff1f1] border-[#e6a2a2]" label="答錯" />
            <Legend className="bg-[#fff8df] border-[#e7d083]" label="不確定" />
            <Legend className="bg-[#f3f4f3] border-[#d8dfdb]" label="未作答" />
            <Legend className="bg-[#f0ebff] border-[#cbbdf5]" label="觀念不熟" />
          </div>

          <QuestionSlimeMap
            questions={questions}
            learningStates={learningStates}
            onJump={jumpToQuestion}
          />
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
              全部 {questions.length}
            </FilterButton>
            <FilterButton active={filter === "wrong"} onClick={() => setFilter("wrong")}>
              答錯 {wrongCount}
            </FilterButton>
            <FilterButton active={filter === "uncertain"} onClick={() => setFilter("uncertain")}>
              不確定 {uncertainCount}
            </FilterButton>
            <FilterButton active={filter === "unfamiliar"} onClick={() => setFilter("unfamiliar")}>
              觀念不熟 {unfamiliarCount}
            </FilterButton>
          </div>

          {learningStateError && (
            <div className="mt-3 rounded-xl border border-[#f0dddd] bg-[#fff8f8] px-4 py-3 text-xs font-bold leading-5 text-[#9b5050]">
              {learningStateError}
            </div>
          )}

          {visibleQuestions.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-[#dce9e1] bg-white p-6 text-sm font-bold text-[#70877a]">
              目前沒有符合這個篩選條件的題目。
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {visibleQuestions.map((item, index) => {
                const learning = learningStates.get(item.questionKey) ?? {
                  questionKey: item.questionKey,
                  conceptUnfamiliar: false,
                  note: "",
                  masteryStreak: 0,
                  masteredAt: null,
                  lastPracticedAt: null,
                  updatedAt: null,
                };
                return (
                  <QuestionReviewCard
                    key={`${item.questionKey}-${index}`}
                    item={item}
                    purchased={!freeQuiz && purchased}
                    learning={learning}
                    onSaveLearning={(next) => updateLearningState(item.questionKey, next)}
                  />
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href={
              freeQuiz
                ? `/study/free-quiz?${freeQuizParams.toString()}`
                : `/study/exam/quiz?${quizParams.toString()}`
            }
            className="rounded-xl bg-[#31c978] px-5 py-3 text-center text-sm font-black text-white"
          >
            {freeQuiz ? "再組一份自由測驗" : "再次作答這份考卷"}
          </Link>
          <Link
            href="/study/records?tab=attempts"
            className="rounded-xl border border-[#d7e7de] bg-white px-5 py-3 text-center text-sm font-black text-[#315b45]"
          >
            返回作答紀錄
          </Link>
        </div>
      </div>
    </main>
  );
}

function QuestionReviewCard({
  item,
  purchased,
  learning,
  onSaveLearning,
}: {
  item: ExamAttemptQuestionItem;
  purchased: boolean;
  learning: QuestionLearningState;
  onSaveLearning: (next: {
    conceptUnfamiliar: boolean;
    note: string;
    resetMastery?: boolean;
  }) => Promise<void>;
}) {
  const [showOfficial, setShowOfficial] = useState(false);
  const [note, setNote] = useState(learning.note);
  const [saving, setSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState("");
  const noteTimer = useRef<number | null>(null);

  useEffect(() => {
    setNote(learning.note);
  }, [learning.note]);

  useEffect(() => {
    return () => {
      if (noteTimer.current !== null) window.clearTimeout(noteTimer.current);
    };
  }, []);

  const saveNote = (value: string) => {
    setNote(value);
    setSavedLabel("");
    if (noteTimer.current !== null) window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        await onSaveLearning({
          conceptUnfamiliar: learning.conceptUnfamiliar,
          note: value,
        });
        setSavedLabel("已儲存");
      } catch {
        setSavedLabel("儲存失敗");
      } finally {
        setSaving(false);
      }
    }, 650);
  };

  const appendToNote = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const next = note.trim() ? `${note.trim()}\n• ${clean}` : `• ${clean}`;
    saveNote(next);
  };

  const toggleUnfamiliar = async () => {
    setSaving(true);
    try {
      await onSaveLearning({
        conceptUnfamiliar: !learning.conceptUnfamiliar,
        note,
        resetMastery: true,
      });
      setSavedLabel("已儲存");
    } catch {
      setSavedLabel("儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const sourceYear = item.sourceYear ?? parseSourceId(item.questionKey)?.year ?? "";
  const sourceSession = item.sourceSession ?? parseSourceId(item.questionKey)?.session ?? "";
  const sourceSubject = item.sourceSubject ?? parseSourceId(item.questionKey)?.subject ?? "";
  const isWrong = item.correct === false;
  const isCorrect = item.correct === true;

  return (
    <article
      id={questionAnchorId(item.questionKey)}
      className="scroll-mt-5 rounded-[26px] border border-[#dce9e1] bg-white p-5 shadow-[0_10px_26px_rgba(31,83,53,0.045)] sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-black text-[#2ba962]">
          {sourceYear && sourceSession
            ? `${sourceYear} 年・第 ${sourceSession} 次・第 ${item.questionNumber ?? "?"} 題`
            : `第 ${item.questionNumber ?? "?"} 題`}
        </div>
        {isCorrect && <StatusBadge tone="green">答對</StatusBadge>}
        {isWrong && <StatusBadge tone="red">答錯</StatusBadge>}
        {!item.answered && <StatusBadge tone="gray">未作答</StatusBadge>}
        {item.uncertain && <StatusBadge tone="yellow">不確定</StatusBadge>}
        {learning.conceptUnfamiliar && <StatusBadge tone="purple">觀念不熟</StatusBadge>}
        {learning.conceptUnfamiliar && (
          <span className="rounded-full bg-[#f7f4ff] px-3 py-1 text-xs font-black text-[#806db1]">
            連續答對 {learning.masteryStreak} / 3
          </span>
        )}
      </div>

      <div className="ms-question-stem mt-4">{item.stem}</div>

      <div className="mt-4 space-y-2">
        {item.options.map((option, index) => {
          const correct = item.correctIndex === index;
          const chosen = item.userAnswer === index;
          return (
            <div
              key={`${item.questionKey}-${index}`}
              className={[
                "ms-question-option rounded-xl border px-4 py-3",
                correct
                  ? "border-[#9ed9b5] bg-[#edf9f1] text-[#315b45]"
                  : chosen
                    ? "border-[#e6a2a2] bg-[#fff1f1] text-[#8b4747]"
                    : "border-[#e1e9e4] bg-white text-[#60786c]",
              ].join(" ")}
            >
              <span className="font-black">{String.fromCharCode(65 + index)}.</span>{" "}
              {option}
              {correct && chosen && "  ← 你的答案 · 正確答案 ✓"}
              {correct && !chosen && "  ← 正確答案 ✓"}
              {chosen && !correct && "  ← 你的答案"}
            </div>
          );
        })}
      </div>

      {!item.answered && (
        <div className="mt-3 rounded-xl bg-[#f5f7f6] px-4 py-3 text-sm font-bold text-[#70877a]">
          這題當時沒有作答。
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#edf2ef] pt-4">
        <button
          type="button"
          onClick={toggleUnfamiliar}
          disabled={saving}
          className={[
            "rounded-xl border px-4 py-2.5 text-sm font-black transition",
            learning.conceptUnfamiliar
              ? "border-[#cbbdf5] bg-[#f0ebff] text-[#6952a5]"
              : "border-[#d7e7de] bg-white text-[#315b45] hover:bg-[#f5faf7]",
          ].join(" ")}
        >
          {learning.conceptUnfamiliar ? "✓ 觀念不熟" : "＋ 觀念不熟"}
        </button>
        {item.officialPdfUrl && item.questionNumber !== null && (
          <button
            type="button"
            onClick={() => setShowOfficial((current) => !current)}
            className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2.5 text-sm font-black text-[#315b45] hover:bg-[#f5faf7]"
          >
            {showOfficial ? "收起官方原題" : "📄 官方原題"}
          </button>
        )}
      </div>

      {showOfficial && item.questionNumber !== null && (
        <div className="mt-4">
          <OfficialQuestionCrop
            pdfUrl={item.officialPdfUrl}
            questionNumber={item.questionNumber}
            largePreview
          />
        </div>
      )}

      {item.correctIndex !== null && item.options.length === 4 && (
        <AIExplanationButton
          directPurchasedAccess={purchased}
          buttonLabel="查看完整解析"
          onAddToNote={appendToNote}
          payload={{
            questionKey: item.questionKey,
            source: "national-exam",
            sourceLabel:
              sourceYear && sourceSession
                ? `${sourceYear} 年 · 第 ${sourceSession} 次 · ${sourceSubject}`
                : sourceSubject || "國考",
            stem: item.stem,
            options: item.options,
            correctIndex: item.correctIndex,
            userAnswer: item.userAnswer,
            uncertain: item.uncertain,
          }}
        />
      )}

      <div className="mt-5 rounded-2xl border border-[#dfece4] bg-[#fbfefc] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-black text-[#315b45]">📝 我的筆記</div>
          <div className="shrink-0 text-[11px] font-black text-[#789083]">
            {saving ? "儲存中…" : savedLabel}
          </div>
        </div>
        <textarea
          value={note}
          onChange={(event) => saveNote(event.target.value)}
          placeholder="只記你真正容易忘的觀念、口訣或混淆點…"
          rows={4}
          className="mt-3 w-full resize-y rounded-xl border border-[#d7e7de] bg-white px-4 py-3 text-base font-medium leading-7 text-[#315b45] outline-none focus:border-[#65d795]"
        />
      </div>
    </article>
  );
}

async function hydrateAttemptQuestions(attempt: ExamAttempt): Promise<{
  questions: ExamAttemptQuestionItem[];
  legacyPartial: boolean;
}> {
  if (attempt.questionItems.length > 0) {
    return { questions: attempt.questionItems, legacyPartial: false };
  }

  if (attempt.session !== "自由測驗" && attempt.questionOutcomes.length > 0) {
    try {
      const params = new URLSearchParams({
        year: attempt.year,
        session: attempt.session,
        subject: attempt.subject,
      });
      const response = await fetch(`/api/national-exam?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (response.ok && Array.isArray(payload?.questions)) {
        const outcomeByNumber = new Map(
          attempt.questionOutcomes.map((item) => [item.questionNumber, item]),
        );
        const questions = (payload.questions as NationalExamQuestion[]).map((item) => {
          const outcome = outcomeByNumber.get(item.questionNumber);
          return {
            id: item.id,
            questionKey:
              outcome?.questionKey ??
              `national-exam:${attempt.year}:${attempt.session}:${attempt.subject}:${item.questionNumber}`,
            questionNumber: item.questionNumber,
            sourceYear: attempt.year,
            sourceSession: attempt.session,
            sourceSubject: attempt.subject,
            stem: item.stem,
            options: item.options,
            correctIndex: item.correctIndex,
            userAnswer: outcome?.userAnswer ?? null,
            answered: outcome?.answered ?? false,
            correct: outcome?.correct ?? null,
            uncertain: outcome?.uncertain ?? false,
            officialPdfUrl: item.questionPdfUrl,
          } satisfies ExamAttemptQuestionItem;
        });
        return { questions, legacyPartial: false };
      }
    } catch {
      // Fall through to the old review snapshot below.
    }
  }

  let reviewItems = attempt.reviewItems;
  if (reviewItems.length === 0 && attempt.session !== "自由測驗") {
    try {
      const mistakes = await readMistakes();
      reviewItems = mistakes
        .filter(
          (item) =>
            item.source === "national-exam" &&
            item.year === attempt.year &&
            item.session === attempt.session &&
            item.subject === attempt.subject,
        )
        .map((item) => ({
          id: item.id,
          questionNumber: item.questionNumber ?? null,
          stem: item.stem,
          options: item.options,
          correctIndex: item.correctIndex,
          userAnswer: item.userAnswer,
          uncertain: item.uncertain,
          officialPdfUrl: item.officialPdfUrl ?? null,
        }));
    } catch {
      reviewItems = [];
    }
  }

  return {
    questions: reviewItems.map((item) => reviewItemToQuestion(attempt, item)),
    legacyPartial: true,
  };
}

function reviewItemToQuestion(
  attempt: ExamAttempt,
  item: ExamAttemptReviewItem,
): ExamAttemptQuestionItem {
  const parsed = parseSourceId(item.id);
  const year = parsed?.year ?? attempt.year;
  const session = parsed?.session ?? attempt.session;
  const subject = parsed?.subject ?? attempt.subject;
  const questionNumber = parsed?.questionNumber ?? item.questionNumber;
  const questionKey =
    parsed && questionNumber !== null
      ? `national-exam:${year}:${session}:${subject}:${questionNumber}`
      : item.id;
  const answered = item.userAnswer !== null;
  const correct =
    answered && item.correctIndex !== null ? item.userAnswer === item.correctIndex : null;

  return {
    id: item.id,
    questionKey,
    questionNumber,
    sourceYear: year,
    sourceSession: session,
    sourceSubject: subject,
    stem: item.stem,
    options: item.options,
    correctIndex: item.correctIndex,
    userAnswer: item.userAnswer,
    answered,
    correct,
    uncertain: item.uncertain,
    officialPdfUrl: item.officialPdfUrl,
  };
}

function jumpToQuestion(questionKey: string) {
  document
    .getElementById(questionAnchorId(questionKey))
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function questionAnchorId(questionKey: string) {
  return `review-${encodeURIComponent(questionKey).replaceAll("%", "-")}`;
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm font-black transition",
        active
          ? "border-[#31c978] bg-[#eaf9f0] text-[#237849]"
          : "border-[#dce9e1] bg-white text-[#60786c] hover:bg-[#f5faf7]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "green" | "red" | "yellow" | "gray" | "purple";
  children: React.ReactNode;
}) {
  const tones = {
    green: "bg-[#eaf9f0] text-[#237849]",
    red: "bg-[#fff1f1] text-[#9b5050]",
    yellow: "bg-[#fff8df] text-[#80651e]",
    gray: "bg-[#f3f4f3] text-[#789083]",
    purple: "bg-[#f0ebff] text-[#6952a5]",
  } as const;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded border ${className}`} />
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-4 py-3">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#17372a]">{value}</div>
    </div>
  );
}

function parseYearRange(value: string) {
  const match = value.match(/^(\d{2,3})-(\d{2,3})$/);
  return match ? { from: match[1], to: match[2] } : null;
}

function parseSourceId(value: string) {
  const parts = value.split(":");
  if (parts.length < 5 || parts[0] !== "national-exam") return null;
  const questionNumber = Number(parts[parts.length - 1]);
  if (!Number.isFinite(questionNumber)) return null;
  return {
    year: parts[1],
    session: parts[2],
    subject: parts.slice(3, -1).join(":"),
    questionNumber,
  };
}
