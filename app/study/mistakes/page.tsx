"use client";

import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/top-bar";
import { useGameState } from "@/components/game-state-provider";
import {
  MistakeRecord,
  readMistakes,
  removeMistake,
  setMistakeReviewed,
} from "@/lib/mistake-store";

type Filter = "全部" | "國考" | "教材";

export default function MistakesPage() {
  const game = useGameState();
  const [items, setItems] = useState<MistakeRecord[]>([]);
  const [filter, setFilter] = useState<Filter>("全部");

  useEffect(() => {
    setItems(readMistakes());
  }, []);

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (filter === "全部") return true;
        if (filter === "國考") return item.source === "national-exam";
        return item.source === "material";
      })
      .sort((a, b) => {
        if (a.reviewed !== b.reviewed) {
          return Number(a.reviewed) - Number(b.reviewed);
        }

        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      });
  }, [items, filter]);

  const unreviewedCount = items.filter((item) => !item.reviewed).length;

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            MISTAKES
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            錯題庫
          </h1>

          <p className="mt-3 leading-7 text-[#70877a]">
            答錯或標記「我不確定」的題目會自動收進這裡。
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <SummaryCard label="全部題目" value={`${items.length} 題`} />
          <SummaryCard label="待複習" value={`${unreviewedCount} 題`} />
        </section>

        <section className="mt-6 flex flex-wrap gap-2">
          {(["全部", "國考", "教材"] as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
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

        <section className="mt-6 space-y-5">
          {filtered.length === 0 ? (
            <div className="rounded-[26px] border border-[#dfece4] bg-white p-8 text-center">
              <div className="text-4xl">📘</div>
              <div className="mt-4 text-xl font-black">
                目前沒有錯題
              </div>
              <div className="mt-2 text-sm font-bold text-[#789083]">
                做題後，答錯或標記不確定的題目會出現在這裡。
              </div>
            </div>
          ) : (
            filtered.map((item) => (
              <MistakeCard
                key={item.id}
                item={item}
                onReviewed={(reviewed) => {
                  if (reviewed && !item.reviewed) {
                    game.recordMistakesReviewed(1);
                  }

                  setItems(setMistakeReviewed(item.id, reviewed));
                }}
                onRemove={() => setItems(removeMistake(item.id))}
              />
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function MistakeCard({
  item,
  onReviewed,
  onRemove,
}: {
  item: MistakeRecord;
  onReviewed: (reviewed: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <article
      className={[
        "rounded-[26px] border bg-white p-6 shadow-[0_10px_26px_rgba(31,83,53,0.05)]",
        item.reviewed ? "border-[#e5ebe7] opacity-75" : "border-[#dce9e1]",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black tracking-[0.06em] text-[#2ba962]">
            {item.source === "national-exam" ? "NATIONAL EXAM" : "MATERIAL"}
          </div>
          <div className="mt-1 text-sm font-bold text-[#789083]">
            {item.sourceLabel}
          </div>
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

      <div className="mt-5 text-lg font-black leading-8">
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
                "rounded-xl border px-4 py-3 font-bold",
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

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onReviewed(!item.reviewed)}
          className={[
            "rounded-xl px-4 py-2 text-sm font-black transition",
            item.reviewed
              ? "border border-[#d7e7de] bg-white text-[#557768]"
              : "bg-[#31c978] text-white",
          ].join(" ")}
        >
          {item.reviewed ? "取消已複習" : "✓ 標記已複習"}
        </button>

        {item.officialPdfUrl && (
          <a
            href={item.officialPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-black text-[#315b45]"
          >
            📄 官方來源
          </a>
        )}

        <button
          type="button"
          onClick={onRemove}
          className="rounded-xl border border-[#ead8d8] bg-white px-4 py-2 text-sm font-black text-[#9b5050]"
        >
          移除
        </button>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#dfece4] bg-white p-5">
      <div className="text-sm font-bold text-[#789083]">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
