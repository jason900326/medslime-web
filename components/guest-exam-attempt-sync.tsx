"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncGuestExamAttempt } from "@/lib/guest-exam-attempt-store";

export default function GuestExamAttemptSync() {
  useEffect(() => {
    let cancelled = false;

    const syncIfAuthenticated = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!cancelled && user) {
        await syncGuestExamAttempt();
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
          void syncGuestExamAttempt();
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
