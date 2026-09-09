"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import OfficialQuestionCrop from "@/components/official-question-crop";
import AIExplanationButton from "@/components/ai-explanation-button";
import { useGameState } from "@/components/game-state-provider";
import {
  removeMistake,
  setMistakeReviewed,
  type MistakeRecord,
} from "@/lib/mistake-store";

type MistakeFilter = "全部" | "國考" | "教材" | "已複習";

export default function MistakeRecordsTab({
  mistakes,
  setMistakes,
  filterYear,
  filterSession,
  filterSubject,
}: {
  mistakes: MistakeRecord[];
  setMistakes: (items: MistakeRecord[]) => void;
  filterYear: string;
  filterSession: string;
  filterSubject: string;
}) {
  const [filter, setFilter] = useState<MistakeFilter>("全部");
  const [subjectFilter, setSubjectFilter] = useState("全部科目");
  const hasExamFilter = Boolean(filterYear && filterSession && filterSubject);

  const nationalSubjects = useMemo(
    () =>
      Array.from(
        new Set(
          mistakes
            .filter((item) => item.source === "national-exam")
            .map((item) => item.subject?.trim())
            .filter((item): item is string => Boolean(item)),
        ),
      ).sort((a, b) => a.localeCompare(b, "zh-Hant")),
    [mistakes],
  );

  const filtered = useMemo(() => {
    return mistakes
      .filter((item) => {
        if (
          hasExamFilter &&
          !(
            item.source === "national-exam" &&
            item.year === filterYear &&
            item.session === filterSession &&
            item.subject === filterSubject
          )
        ) {
          return false;
        }
        if (filter === "國考" && item.source !== "national-exam") return false;
        if (filter === "教材" && item.source !== "material") return false;
        if (filter === "已複習" && !item.reviewed) return false;
        if (
          !hasExamFilter &&
          filter === "國考" &&
          subjectFilter !== "全部科目" &&
          item.subject !== subjectFilter
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.reviewed !== b.reviewed) return Number(a.reviewed) - Number(b.reviewed);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    mistakes,
    filter,
    subjectFilter,
    hasExamFilter,
    filterYear,
    filterSession,
    filterSubject,
  ]);

  const pending = mistakes.filter((item) => !item.reviewed);

  return (
    <>
      <section className="mt-5 grid grid-cols-2 gap-3">
        <SummaryCard label="全部錯題" value={`${mistakes.length} 題`} />
        <SummaryCard label="待複習" value={`${pending.length} 題`} />
      </section>

      {hasExamFilter && (
        <section className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-[#cfe7d8] bg-[#f3fbf6] px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-black text-[#2ba962]">目前只看這次考卷</div>
            <div className="mt-1 truncate text-sm font-black text-[#315b45]">
              民國 {filterYear} 年・第 {filterSession} 次・{filterSubject}
            </div>
          </div>
          <Link
            href="/study/records?tab=mistakes"
            className="shrink-0 rounded-xl border border-[#cfe7d8] bg-white px-3 py-2 text-xs font-black text-[#315b45]"
          >
            看全部
          </Link>
        </section>
      )}

      {!hasExamFilter && (
        <>
          <section className="mt-4 flex flex-wrap gap-2">
            {(["全部", "國考", "教材", "已複習"] as MistakeFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setFilter(item);
                  if (item !== "國考") setSubjectFilter("全部科目");
                }}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-black transition",
                  filter === item
                    ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                    : "border-[#dbe9e1] bg-white text-[#466a58]",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </section>

          {filter === "國考" && nationalSubjects.length > 0 && (
            <label className="mt-3 block">
              <span className="mb-2 block text-xs font-black text-[#789083]">科目</span>
              <select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                className="w-full rounded-2xl border border-[#d7e7de] bg-white px-4 py-3 text-sm font-black text-[#315b45] outline-none focus:border-[#65d795]"
              >
                <option value="全部科目">全部科目</option>
                {nationalSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}

      <section className="mt-5 space-y-5">
        {filtered.length === 0 ? (
          <EmptyState
            icon="📘"
            title="目前沒有符合條件的錯題"
            copy="答錯或標記不確定的題目會整理在這裡。"
            href="/study/exam"
            action="去刷國考題"
          />
        ) : (
          filtered.map((item) => (
            <MistakeRecordCard
              key={item.id}
              item={item}
              onItemsChange={setMistakes}
            />
          ))
        )}
      </section>
    </>
  );
}

function MistakeRecordCard({
  item,
  onItemsChange,
}: {
  item: MistakeRecord;
  onItemsChange: (items: MistakeRecord[]) => void;
}) {
  const game = useGameState();
  const [showOfficial, setShowOfficial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const canShowOfficial =
    item.source === "national-exam" &&
    Boolean(item.officialPdfUrl) &&
    Boolean(item.questionNumber);

  const updateReviewed = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage("");
    try {
      const nextReviewed = !item.reviewed;
      if (nextReviewed && !item.reviewed) game.recordMistakesReviewed(1);
      onItemsChange(await setMistakeReviewed(item.id, nextReviewed));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "更新失敗，請再試一次。");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage("");
    try {
      onItemsChange(await removeMistake(item.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "移除失敗，請再試一次。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <article
        className={[
          "rounded-[24px] border bg-white p-5 shadow-[0_8px_22px_rgba(31,83,53,0.04)]",
          item.reviewed ? "border-[#e5ebe7] opacity-80" : "border-[#dce9e1]",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-black tracking-[0.06em] text-[#2ba962]">
              {item.source === "national-exam" ? "NATIONAL EXAM" : "MATERIAL"}
            </div>
            <div className="mt-1 text-sm font-bold text-[#789083]">{item.sourceLabel}</div>
          </div>
          <div className="flex gap-2">
            {item.uncertain && (
              <span className="rounded-full bg-[#fff8df] px-3 py-1 text-xs font-black text-[#8a6814]">
                ❓ 不確定
              </span>
            )}
            {!item.reviewed && (
              <span className="rounded-full bg-[#fff1f1] px-3 py-1 text-xs font-black text-[#9b5050]">
                待複習
              </span>
            )}
          </div>
        </div>

        <div className="ms-question-stem mt-5">
          {item.questionNumber ? `${item.questionNumber}. ` : ""}
          {item.stem}
        </div>

        <div className="mt-5 space-y-2">
          {item.options.map((option, index) => {
            const correct = item.correctIndex === index;
            const chosen = item.userAnswer === index;
            return (
              <div
                key={`${item.id}-${index}`}
                className={[
                  "ms-question-option rounded-xl border px-4 py-3",
                  correct
                    ? "border-[#9ed9b5] bg-[#edf9f1] text-[#315b45]"
                    : chosen
                      ? "border-[#e6a2a2] bg-[#fff1f1] text-[#8b4747]"
                      : "border-[#e1e9e4] bg-white text-[#60786c]",
                ].join(" ")}
              >
                {String.fromCharCode(65 + index)}. {option}
                {correct && " ✓"}
                {chosen && !correct && " ← 你的答案"}
              </div>
            );
          })}
        </div>

        {item.userAnswer === null && (
          <div className="mt-4 rounded-xl bg-[#fff8df] px-4 py-3 text-sm font-bold text-[#80651e]">
            這題沒有正式作答，但你曾標記「我不確定」。
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-[#f0dddd] bg-[#fff8f8] px-4 py-3 text-sm font-bold text-[#9b5050]">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={updateReviewed}
            className={[
              "rounded-xl px-4 py-2 text-sm font-black transition disabled:opacity-50",
              item.reviewed
                ? "border border-[#d7e7de] bg-white text-[#557768]"
                : "bg-[#31c978] text-white",
            ].join(" ")}
          >
            {item.reviewed ? "取消已複習" : "✓ 標記已複習"}
          </button>

          {canShowOfficial && (
            <button
              type="button"
              onClick={() => setShowOfficial(true)}
              className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-black text-[#315b45]"
            >
              📄 官方原題
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="rounded-xl border border-[#ead8d8] bg-white px-4 py-2 text-sm font-black text-[#9b5050] disabled:opacity-50"
          >
            移除
          </button>
        </div>

        {item.correctIndex !== null && (
          <AIExplanationButton
            payload={{
              questionKey: item.id,
              source: item.source,
              sourceLabel: item.sourceLabel,
              stem: item.stem,
              options: item.options,
              correctIndex: item.correctIndex,
              userAnswer: item.userAnswer,
              uncertain: item.uncertain,
              existingExplanation: item.explanation ?? null,
            }}
          />
        )}
      </article>

      {showOfficial && canShowOfficial && item.officialPdfUrl && item.questionNumber && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/35 px-3 py-5 sm:px-5 sm:py-8">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-[#dce9e1] bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black tracking-[0.08em] text-[#2ba962]">OFFICIAL QUESTION</div>
                <div className="mt-1 text-xl font-black">官方原題 · 第 {item.questionNumber} 題</div>
                <div className="mt-1 text-sm font-bold text-[#789083]">{item.sourceLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowOfficial(false)}
                className="rounded-xl border border-[#d7e7de] bg-white px-3 py-2 text-sm font-black text-[#60786c]"
              >
                關閉
              </button>
            </div>
            <div className="mt-6">
              <OfficialQuestionCrop
                pdfUrl={item.officialPdfUrl}
                questionNumber={item.questionNumber}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#dfece4] bg-white px-4 py-3">
      <div className="text-xs font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#17372a]">{value}</div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  copy,
  href,
  action,
}: {
  icon: string;
  title: string;
  copy: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#dce9e1] bg-white p-7 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="mt-3 text-xl font-black">{title}</div>
      <div className="mt-2 text-sm font-bold leading-6 text-[#789083]">{copy}</div>
      <Link
        href={href}
        className="mt-5 inline-block rounded-xl bg-[#31c978] px-5 py-3 text-sm font-black text-white"
      >
        {action}
      </Link>
    </div>
  );
}
