import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

// Module-level singleton instance
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Returns a singleton Supabase client for use in browser environments.
 *
 * This client uses cookie-based storage for session persistence,
 * ensuring compatibility with middleware auth checks.
 *
 * The singleton pattern ensures all components share the same client instance,
 * preventing auth state synchronization issues.
 *
 * Returns null if Supabase environment variables are not set (for build-time compatibility).
 */
export const supabaseBrowser = (): ReturnType<typeof createBrowserClient<Database>> | null => {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return null instead of throwing during build time
    return null;
  }

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return browserClient;
};
