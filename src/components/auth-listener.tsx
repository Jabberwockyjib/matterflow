"use client";

import { useEffect, useRef } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * AuthListener - Global auth state change listener component.
 *
 * Subscribes to Supabase auth state changes and triggers a full page reload
 * only when the user identity actually changes (sign-in or sign-out).
 *
 * IMPORTANT: Supabase's BroadcastChannel broadcasts token refreshes as
 * SIGNED_IN events to other tabs. Without tracking the current user ID,
 * this causes an infinite reload loop when the app is open in multiple
 * tabs (Tab A refreshes token -> broadcasts SIGNED_IN -> Tab B reloads ->
 * Tab B broadcasts SIGNED_IN -> Tab A reloads -> ...).
 *
 * The fix: track the current user ID and only reload when it changes.
 * Token refreshes for the same user are ignored.
 */
export function AuthListener() {
  // Track the current user ID to detect actual identity changes vs token refreshes
  const currentUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = supabaseBrowser();

    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id ?? null;
      const previousUserId = currentUserIdRef.current;

      // On first callback (initial session load), just record the user ID
      if (previousUserId === undefined) {
        currentUserIdRef.current = newUserId;
        return;
      }

      // Only act on events that change the user identity
      if (event === "SIGNED_OUT" && previousUserId !== null) {
        currentUserIdRef.current = null;
        window.location.assign("/auth/sign-in");
        return;
      }

      if (event === "SIGNED_IN" && newUserId !== previousUserId) {
        currentUserIdRef.current = newUserId;

        if (window.location.pathname === "/auth/sign-in") {
          window.location.assign("/");
        } else {
          window.location.assign(window.location.pathname);
        }
        return;
      }

      // TOKEN_REFRESHED or SIGNED_IN for the same user (cross-tab broadcast)
      // — just update the ref, no reload needed
      currentUserIdRef.current = newUserId;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
