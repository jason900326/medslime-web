"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncGuestExamAttempt } from "@/lib/guest-exam-attempt-store";

export default function GuestExamAttemptSync() {
  useEffect(() => {
    let cancelled = false;

    const syncIfAuthenticated = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled || !user) return;

        const synced = await syncGuestExamAttempt();
        if (
          !cancelled &&
          synced &&
          window.location.pathname.startsWith("/study/records")
        ) {
          window.location.reload();
        }
      } catch (error) {
        console.warn("訪客作答同步失敗：", error);
      }
    };

    void syncIfAuthenticated();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        !cancelled &&
        session?.user &&
        (event === "SIGNED_IN" || event === "INITIAL_SESSION")
      ) {
        window.setTimeout(() => {
          void syncIfAuthenticated();
        }, 0);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
