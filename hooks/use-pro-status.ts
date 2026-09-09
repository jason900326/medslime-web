"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/use-auth-user";

type ProStatus = {
  isPro: boolean;
  proExpiresAt: string | null;
  checkedAt: number;
};

type EntitlementResponse = {
  isPro?: boolean;
  proExpiresAt?: string | null;
  error?: string;
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const SESSION_KEY_PREFIX = "medslime_pro_status_v1";
const memoryCache = new Map<string, ProStatus>();
const inflight = new Map<string, Promise<ProStatus>>();

function sessionKey(userId: string) {
  return `${SESSION_KEY_PREFIX}:${userId}`;
}

function readSessionCache(userId: string): ProStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProStatus>;
    if (
      typeof parsed.isPro !== "boolean" ||
      typeof parsed.checkedAt !== "number" ||
      Date.now() - parsed.checkedAt > CACHE_TTL_MS
    ) {
      return null;
    }
    return {
      isPro: parsed.isPro,
      proExpiresAt: typeof parsed.proExpiresAt === "string" ? parsed.proExpiresAt : null,
      checkedAt: parsed.checkedAt,
    };
  } catch {
    return null;
  }
}

function writeCache(userId: string, status: ProStatus) {
  memoryCache.set(userId, status);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(sessionKey(userId), JSON.stringify(status));
  } catch {
    // sessionStorage unavailable should not block entitlement reads.
  }
}

async function fetchProStatus(userId: string): Promise<ProStatus> {
  const cached = memoryCache.get(userId) ?? readSessionCache(userId);
  if (cached && Date.now() - cached.checkedAt <= CACHE_TTL_MS) {
    memoryCache.set(userId, cached);
    return cached;
  }

  const existing = inflight.get(userId);
  if (existing) return existing;

  const request = (async () => {
    const response = await fetch("/api/entitlements", { cache: "no-store" });
    const payload = (await response.json()) as EntitlementResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "無法讀取 Pro 會員狀態。");
    }

    const status: ProStatus = {
      isPro: Boolean(payload.isPro),
      proExpiresAt:
        typeof payload.proExpiresAt === "string" ? payload.proExpiresAt : null,
      checkedAt: Date.now(),
    };
    writeCache(userId, status);
    return status;
  })();

  inflight.set(userId, request);
  try {
    return await request;
  } finally {
    inflight.delete(userId);
  }
}

export function invalidateProStatus(userId?: string | null) {
  if (userId) {
    memoryCache.delete(userId);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(sessionKey(userId));
    }
    return;
  }

  memoryCache.clear();
  if (typeof window !== "undefined") {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(`${SESSION_KEY_PREFIX}:`)) {
        window.sessionStorage.removeItem(key);
      }
    }
  }
}

export function useProStatus() {
  const auth = useAuthUser();
  const initial = useMemo(() => {
    if (!auth.userId || typeof window === "undefined") return null;
    return memoryCache.get(auth.userId) ?? readSessionCache(auth.userId);
  }, [auth.userId]);
  const [status, setStatus] = useState<ProStatus | null>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.userId) {
      setStatus(null);
      setError(null);
      return;
    }

    const cached = memoryCache.get(auth.userId) ?? readSessionCache(auth.userId);
    if (cached) setStatus(cached);

    let cancelled = false;
    void fetchProStatus(auth.userId)
      .then((next) => {
        if (!cancelled) {
          setStatus(next);
          setError(null);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Pro 狀態讀取失敗。");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth.loading, auth.userId]);

  return {
    userId: auth.userId,
    isLoggedIn: auth.isLoggedIn,
    loading: auth.loading || (auth.isLoggedIn && status === null && error === null),
    isPro: status?.isPro ?? false,
    proExpiresAt: status?.proExpiresAt ?? null,
    error,
  };
}
