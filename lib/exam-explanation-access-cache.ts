"use client";

const STORAGE_KEY = "medslime_exam_explanation_access_v1";
const MAX_AGE_MS = 5 * 60 * 1000;

type PurchaseRow = {
  exam_key?: string;
};

type AccessPayload = {
  authenticated?: boolean;
  purchases?: PurchaseRow[];
  error?: string;
};

type CacheSnapshot = {
  fetchedAt: number;
  keys: string[];
};

let memoryCache: CacheSnapshot | null = null;
let pending: Promise<Set<string>> | null = null;

function readStorage(): CacheSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheSnapshot>;
    if (!Array.isArray(parsed.keys) || typeof parsed.fetchedAt !== "number") return null;
    return {
      fetchedAt: parsed.fetchedAt,
      keys: parsed.keys.filter((value): value is string => typeof value === "string"),
    };
  } catch {
    return null;
  }
}

function writeCache(snapshot: CacheSnapshot) {
  memoryCache = snapshot;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Session cache is only a UX optimization.
  }
}

function getSnapshot() {
  if (memoryCache) return memoryCache;
  memoryCache = readStorage();
  return memoryCache;
}

function isFresh(snapshot: CacheSnapshot | null) {
  return Boolean(snapshot && Date.now() - snapshot.fetchedAt < MAX_AGE_MS);
}

export function getCachedExamExplanationAccess(examKey: string): boolean | null {
  const key = examKey.trim();
  if (!key) return false;
  const snapshot = getSnapshot();
  if (!isFresh(snapshot)) return null;
  return snapshot!.keys.includes(key);
}

export async function loadExamExplanationAccessKeys(options?: {
  force?: boolean;
}): Promise<Set<string>> {
  const snapshot = getSnapshot();
  if (!options?.force && isFresh(snapshot)) {
    return new Set(snapshot!.keys);
  }

  if (pending) return pending;

  pending = (async () => {
    const response = await fetch("/api/exam-explanation-access", {
      cache: "no-store",
    });
    const payload = (await response.json()) as AccessPayload;
    if (!response.ok) {
      throw new Error(payload.error ?? "讀取完整詳解權限失敗。");
    }

    const keys = Array.from(
      new Set(
        (payload.purchases ?? [])
          .map((item) => item.exam_key?.trim() ?? "")
          .filter(Boolean),
      ),
    );
    writeCache({ fetchedAt: Date.now(), keys });
    return new Set(keys);
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

export function cacheExamExplanationAccess(examKey: string, purchased: boolean) {
  const key = examKey.trim();
  if (!key) return;
  const snapshot = getSnapshot() ?? { fetchedAt: Date.now(), keys: [] };
  const keys = new Set(snapshot.keys);
  if (purchased) keys.add(key);
  else keys.delete(key);
  writeCache({ fetchedAt: Date.now(), keys: Array.from(keys) });
}

export function invalidateExamExplanationAccessCache() {
  memoryCache = null;
  pending = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore cache cleanup failures.
  }
}
