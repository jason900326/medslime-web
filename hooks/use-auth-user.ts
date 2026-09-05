"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ACTIVE_USER_KEY = "medslime_active_user_id";

function syncActiveUserId(userId: string | null) {
  if (typeof window === "undefined") return;

  if (userId) {
    window.sessionStorage.setItem(ACTIVE_USER_KEY, userId);
  } else {
    window.sessionStorage.removeItem(ACTIVE_USER_KEY);
  }
}

export function useAuthUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const nextUserId = user?.id ?? null;

      setUserId(nextUserId);
      setEmail(user?.email ?? null);
      setCreatedAt(user?.created_at ?? null);
      syncActiveUserId(nextUserId);
      setLoading(false);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;

      setUserId(nextUserId);
      setEmail(session?.user?.email ?? null);
      setCreatedAt(session?.user?.created_at ?? null);
      syncActiveUserId(nextUserId);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    userId,
    email,
    createdAt,
    loading,
    isLoggedIn: Boolean(userId),
  };
}
