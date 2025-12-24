"use client";

import { useEffect, useRef } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * AuthListener - Global auth state change listener component.
 *
 * This component subscribes to Supabase auth state changes and triggers
 * a full page reload when the auth state changes. This ensures server
 * components re-fetch data with the updated session.
 *
 * The component is mounted in the root layout and does not render any UI.
 * It uses window.location.assign() for navigation to ensure a full page
 * reload rather than a client-side navigation.
 *
 * Auth events handled:
 * - SIGNED_IN: User has signed in (session established)
 * - SIGNED_OUT: User has signed out (session cleared)
 * - TOKEN_REFRESHED: Session token was refreshed (no action needed)
 */
export function AuthListener() {
  // Track if this is the initial mount to avoid unnecessary reloads
  const initialMount = useRef(true);

  useEffect(() => {
    const supabase = supabaseBrowser();

    console.log('[AuthListener] Setting up auth state listener');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthListener] Auth state change:', {
        event,
        hasSession: !!session,
        isInitialMount: initialMount.current
      });

      // Skip reload on initial mount - session is already loaded by server
      if (initialMount.current) {
        initialMount.current = false;
        console.log('[AuthListener] Skipping reload on initial mount');
        return;
      }

      // Handle auth state changes that require a page reload
      // to synchronize server and client state
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        console.log('[AuthListener] Reloading page for event:', event);

        // Special handling for sign-in page: redirect to home instead of reloading
        if (window.location.pathname === "/auth/sign-in" && event === "SIGNED_IN") {
          console.log('[AuthListener] On sign-in page, redirecting to home');
          window.location.assign("/");
        } else {
          // Use window.location.assign() to trigger a full page reload,
          // ensuring server components re-fetch with updated session
          window.location.assign(window.location.pathname);
        }
      }
    });

    return () => {
      console.log('[AuthListener] Unsubscribing from auth state changes');
      subscription.unsubscribe();
    };
  }, []);

  // This component does not render any UI
  return null;
}
