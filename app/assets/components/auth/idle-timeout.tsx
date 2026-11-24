"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;

export default function IdleTimeout() {

  useEffect(() => {
    const supabase = createClient();

    let sessionActive = false;
    let lastActivity = Date.now();
    let logoutInProgress = false;

    function handleActivity() {
      if (sessionActive && !logoutInProgress) {
        lastActivity = Date.now();
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      sessionActive = Boolean(session);

      if (
        session &&
        (event === "SIGNED_IN" || event === "INITIAL_SESSION")
      ) {
        lastActivity = Date.now();
      }
    });

    const activityEvents = [
      "pointerdown",
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
      if (!sessionActive || logoutInProgress) return;

      if (Date.now() - lastActivity < IDLE_TIMEOUT_MS) return;

      logoutInProgress = true;

      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("Logout otomatis gagal:", error.message);
          lastActivity = Date.now() - IDLE_TIMEOUT_MS + 60 * 1000;
          logoutInProgress = false;
          return;
        }

        sessionActive = false;
        window.location.replace("/");
      } catch (error) {
        console.error("Kesalahan logout otomatis:", error);
        logoutInProgress = false;
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });

      subscription.unsubscribe();
    };
  }, []);

  return null;
}
