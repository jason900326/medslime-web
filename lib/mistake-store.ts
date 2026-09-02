"use client";

export type MistakeSource = "national-exam" | "material";

export type MistakeRecord = {
  id: string;
  source: MistakeSource;
  sourceLabel: string;
  subject?: string;
  year?: string;
  session?: string;
  questionNumber?: number;
  stem: string;
  options: string[];
  correctIndex: number | null;
  userAnswer: number | null;
  uncertain: boolean;
  officialPdfUrl?: string | null;
  createdAt: string;
  reviewed: boolean;
};

const STORAGE_KEY = "medslime_mistakes_v1";

export function readMistakes(): MistakeRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeMistakes(records: MistakeRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function upsertMistakes(records: MistakeRecord[]) {
  const current = readMistakes();
  const map = new Map<string, MistakeRecord>();

  for (const item of current) {
    map.set(item.id, item);
  }

  for (const item of records) {
    const previous = map.get(item.id);

    map.set(item.id, {
      ...previous,
      ...item,
      reviewed: previous?.reviewed ?? item.reviewed ?? false,
    });
  }

  writeMistakes(Array.from(map.values()));
}

export function setMistakeReviewed(id: string, reviewed: boolean) {
  const next = readMistakes().map((item) =>
    item.id === id ? { ...item, reviewed } : item,
  );

  writeMistakes(next);
  return next;
}

export function removeMistake(id: string) {
  const next = readMistakes().filter((item) => item.id !== id);
  writeMistakes(next);
  return next;
}
