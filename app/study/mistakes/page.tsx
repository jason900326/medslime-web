"use client";

import { useMemo, useState } from "react";
import TopBar from "@/components/top-bar";

type MistakeSource = "國考" | "教材";

type MistakeItem = {
  id: string;
  source: MistakeSource;
  subject: string;
  chapter: string;
  stem: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number;
  explanation: string;
  reviewed: boolean;
};

const initialMistakes: MistakeItem[] = [
  {
    id: "m1",
    source: "國考",
    subject: "臨床微生物學",
    chapter: "革蘭氏陽性菌",
    stem: "下列何者最符合 Staphylococcus aureus 的典型特徵？",
    options: [
      "Catalase negative、coagulase negative",
      "Catalase positive、coagulase positive",
      "Oxidase positive、indole positive",
      "Urease negative、PYR positive",
    ],
    correctAnswer: 1,
    userAnswer: 0,
    explanation:
      "Staphylococcus 屬通常為 catalase positive，而 S. aureus 的重要鑑別特徵之一是 coagulase positive。",
    reviewed: false,
  },
  {
    id: "m2",
    source: "教材",
    subject: "臨床生化學",
    chapter: "肝功能",
    stem: "下列哪一項酵素最常用來評估膽汁鬱積相關變化？",
    options: ["ALT", "AST", "ALP", "CK-MB"],
    correctAnswer: 2,
    userAnswer: 1,
    explanation:
      "ALP 常在膽汁鬱積與膽道阻塞時上升；ALT 與 AST 較偏向肝細胞損傷。",
    reviewed: false,
  },
  {
    id: "m3",
    source: "國考",
    subject: "臨床血液學",
    chapter: "紅血球疾病",
    stem: "缺鐵性貧血最常見的紅血球型態為何？",
    options: [
      "Macrocytic hyperchromic",
      "Normocytic normochromic",
      "Microcytic hypochromic",
      "Spherocytic hyperchromic",
    ],
    correctAnswer: 2,
    userAnswer: 2,
    explanation:
      "缺鐵性貧血典型呈 microcytic hypochromic，MCV 與 MCH 常下降。",
    reviewed: true,
  },
];

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState(initialMistakes);
  const [sourceFilter, setSourceFilter] = useState<"全部" | MistakeSource>("全部");
  const [subjectFilter, setSubjectFilter] = useState("全部");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const subjects = useMemo(
    () => ["全部", ...Array.from(new Set(mistakes.map((item) => item.subject)))],
    [mistakes],
  );

  const filtered = useMemo(() => {
    return mistakes
      .filter((item) =>
        sourceFilter === "全部" ? true : item.source === sourceFilter,
      )
      .filter((item) =>
        subjectFilter === "全部" ? true : item.subject === subjectFilter,
      )
      .sort((a, b) => Number(a.reviewed) - Number(b.reviewed));
  }, [mistakes, sourceFilter, subjectFilter]);

  const reviewedCount = mistakes.filter((item) => item.reviewed).length;

  const toggleReviewed = (id: string) => {
    setMistakes((current) =>
      current.map((item) =>
        item.id === id ? { ...item, reviewed: !item.reviewed } : item,
      ),
    );
  };

  return (
    <main className="min-h-screen bg-[#f8fcf9] text-[#17372a]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <TopBar showBack backHref="/study" backLabel="返回學習" />

        <section className="mt-8">
          <div className="text-sm font-black tracking-[0.08em] text-[#2ba962]">
            MISTAKES
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            錯題庫
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-[#70877a]">
            把答錯與不確定的題目集中整理，先處理還沒複習過的題目。
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard label="錯題總數" value={`${mistakes.length} 題`} />
          <SummaryCard label="已複習" value={`${reviewedCount} 題`} />
          <SummaryCard
            label="待複習"
            value={`${mistakes.length - reviewedCount} 題`}
          />
        </section>

        <section className="mt-6 flex flex-col gap-3 rounded-[22px] border border-[#dfece4] bg-white p-4 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            {(["全部", "國考", "教材"] as const).map((source) => (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-black transition",
                  sourceFilter === source
                    ? "border-[#65d795] bg-[#eaf9f0] text-[#237849]"
                    : "border-[#dbe9e1] bg-white text-[#466a58] hover:bg-[#f5faf7]",
                ].join(" ")}
              >
                {source}
              </button>
            ))}
          </div>

          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-bold text-[#315b45] outline-none md:ml-auto"
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject === "全部" ? "全部科目" : subject}
              </option>
            ))}
          </select>
        </section>

        <section className="mt-6 space-y-4">
          {filtered.map((item) => {
            const expanded = expandedId === item.id;

            return (
              <article
                key={item.id}
                className={[
                  "rounded-[26px] border bg-white p-5 shadow-[0_10px_26px_rgba(31,83,53,0.05)] transition",
                  item.reviewed
                    ? "border-[#e4ebe7] opacity-75"
                    : "border-[#dce9e1]",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#eefaf2] px-3 py-1 text-xs font-black text-[#28754b]">
                    {item.source}
                  </span>

                  <span className="rounded-full bg-[#f3f6f4] px-3 py-1 text-xs font-black text-[#60786c]">
                    {item.subject}
                  </span>

                  <span className="text-xs font-bold text-[#8a9c92]">
                    {item.chapter}
                  </span>

                  {item.reviewed && (
                    <span className="ml-auto rounded-full bg-[#eaf9f0] px-3 py-1 text-xs font-black text-[#28754b]">
                      ✓ 已複習
                    </span>
                  )}
                </div>

                <div className="mt-4 text-lg font-black leading-8">
                  {item.stem}
                </div>

                <div className="mt-4 grid gap-2">
                  {item.options.map((option, index) => {
                    const isCorrect = index === item.correctAnswer;
                    const isWrongUserChoice =
                      index === item.userAnswer && index !== item.correctAnswer;

                    return (
                      <div
                        key={option}
                        className={[
                          "rounded-xl border px-4 py-3 text-sm font-bold",
                          isCorrect
                            ? "border-[#bde3cc] bg-[#edf9f1] text-[#266f48]"
                            : isWrongUserChoice
                              ? "border-[#ebc7c7] bg-[#fff3f3] text-[#9b5050]"
                              : "border-[#e2eae5] bg-white text-[#4b6859]",
                        ].join(" ")}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </div>
                    );
                  })}
                </div>

                <div
                  className={[
                    "grid transition-[grid-template-rows,opacity,margin] duration-300",
                    expanded
                      ? "mt-5 grid-rows-[1fr] opacity-100"
                      : "mt-0 grid-rows-[0fr] opacity-0",
                  ].join(" ")}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-[#e4ece7] pt-5">
                      <div className="text-sm font-black text-[#315b45]">
                        解析
                      </div>

                      <p className="mt-2 leading-7 text-[#6f887b]">
                        {item.explanation}
                      </p>

                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setExpandedId((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    className="rounded-xl border border-[#d7e7de] bg-white px-4 py-2 text-sm font-black text-[#315b45] transition hover:bg-[#f5faf7]"
                  >
                    {expanded ? "收起解析" : "查看解析"}
                  </button>

                  <button
                    onClick={() => toggleReviewed(item.id)}
                    className={[
                      "rounded-xl px-4 py-2 text-sm font-black transition",
                      item.reviewed
                        ? "border border-[#d7e7de] bg-white text-[#60786c]"
                        : "bg-[#31c978] text-white hover:bg-[#2dbc70]",
                    ].join(" ")}
                  >
                    {item.reviewed ? "取消已複習" : "標記已複習"}
                  </button>
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-[26px] border border-dashed border-[#cfded5] bg-white/70 p-10 text-center font-bold text-[#789083]">
              這個篩選條件下沒有錯題。
            </div>
          )}
        </section>
      </div>
    </main>
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
