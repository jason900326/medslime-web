"use client";

import {
  saveNationalExamAttempt,
  type SaveExamAttemptInput,
} from "@/lib/exam-attempt-store";

const STORAGE_KEY = "medslime_guest_exam_attempt_v1";
let syncInFlight: Promise<boolean> | null = null;

type StoredGuestAttempt = {
  version: 1;
  savedAt: string;
  input: SaveExamAttemptInput;
};

export function saveGuestExamAttempt(input: SaveExamAttemptInput) {
  if (typeof window === "undefined") return false;

  try {
    const payload: StoredGuestAttempt = {
      version: 1,
      savedAt: new Date().toISOString(),
      input,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn("訪客作答暫存失敗：", error);
    return false;
  }
}

export function readGuestExamAttempt(): SaveExamAttemptInput | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw) as Partial<StoredGuestAttempt>;
    if (payload.version !== 1 || !payload.input || typeof payload.input !== "object") {
      return null;
    }

    return payload.input as SaveExamAttemptInput;
  } catch {
    return null;
  }
}

export function clearGuestExamAttempt() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable should not block the rest of the app.
  }
}

export async function syncGuestExamAttempt() {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const pending = readGuestExamAttempt();
    if (!pending) return false;

    const savedId = await saveNationalExamAttempt(pending);
    if (!savedId) return false;

    clearGuestExamAttempt();
    return true;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}
