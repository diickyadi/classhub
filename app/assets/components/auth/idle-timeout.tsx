"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const CHECK_INTERVAL_MS = 1000;

export default function IdleTimeout() {
  const router = useRouter();

  const sessionActiveRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const logoutInProgressRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    function handleActivity() {
      if (
        sessionActiveRef.current &&
        !logoutInProgressRef.current
      ) {
        lastActivityRef.current = Date.now();
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const wasSessionActive = sessionActiveRef.current;

      sessionActiveRef.current = Boolean(session);

      if (
        session &&
        (!wasSessionActive ||
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION")
      ) {
        lastActivityRef.current = Date.now();
      }

      if (!session) {
        logoutInProgressRef.current = false;
      }
    });

    const activityEvents = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, {
        passive: true,
      });
    });

    const intervalId = window.setInterval(async () => {
      if (
        !sessionActiveRef.current ||
        logoutInProgressRef.current
      ) {
        return;
      }

      const idleDuration = Date.now() - lastActivityRef.current;

      if (idleDuration < IDLE_TIMEOUT_MS) {
        return;
      }

      logoutInProgressRef.current = true;

      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("Logout otomatis gagal:", error.message);

          logoutInProgressRef.current = false;
          lastActivityRef.current = Date.now();

          return;
        }

        sessionActiveRef.current = false;

        router.replace("/");
        router.refresh();
      } catch (error) {
        console.error(
          "Terjadi kesalahan saat logout otomatis:",
          error
        );

        logoutInProgressRef.current = false;
        lastActivityRef.current = Date.now();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });

      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
