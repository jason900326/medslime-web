"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAuthUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id ?? null);
      setEmail(user?.email ?? null);
      setLoading(false);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setEmail(session?.user?.email ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    userId,
    email,
    loading,
    isLoggedIn: Boolean(userId),
  };
}
