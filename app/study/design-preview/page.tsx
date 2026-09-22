import { notFound } from "next/navigation";
import StudyShell from "@/components/study-shell";
import StudyDirectionView, { type DirectionPayload } from "@/components/records/study-direction-view";

// Development-only visual fixture. Never substitutes for a user's analysis.
const sample: DirectionPayload = {
  isPro: true,
  message: "少量作答的正確率容易波動，建議配合更多練習觀察。",
  subjects: [
    { subject: "生物化學與臨床生化學", attempts: 8, average: 62.5, availableTopicCount: 2, topicStats: [
      { topic: "醣類代謝", attempts: 4, answeredCount: 20, correctCount: 8, accuracy: 40, uncertainCount: 3, repeatedWrongQuestions: 2, recentAccuracy: 50, previousAccuracy: 30, priorityScore: 90 },
      { topic: "酵素與臨床檢驗", attempts: 3, answeredCount: 10, correctCount: 6, accuracy: 60, uncertainCount: 2, repeatedWrongQuestions: 1, recentAccuracy: 60, previousAccuracy: 60, priorityScore: 60 },
    ] },
    { subject: "臨床血液學與血庫學", attempts: 5, average: 71, availableTopicCount: 1, topicStats: [
      { topic: "貧血的分類與鑑別", attempts: 3, answeredCount: 15, correctCount: 9, accuracy: 60, uncertainCount: 2, repeatedWrongQuestions: 1, recentAccuracy: 50, previousAccuracy: 70, priorityScore: 75 },
    ] },
    { subject: "微生物學與臨床微生物學（包括細菌與黴菌）", attempts: 1, average: 80, availableTopicCount: 0, topicStats: [] },
  ],
};

export default function DesignPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <StudyShell>
    <section className="mt-8">
      <p className="text-sm font-semibold text-[#8b652c]">設計預覽 · 示範資料，不是你的學習分析</p>
      <h1 className="ms-page-title mt-3">學習分析</h1>
      <p className="study-muted mt-2">此頁僅供本機開發時檢查排版與科目切換。練習連結仍會前往真正的題庫。</p>
    </section>
    <StudyDirectionView data={sample} />
  </StudyShell>;
}
