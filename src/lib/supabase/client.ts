import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/database.types";

// Module-level singleton instance
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Parses all cookies from document.cookie string.
 */
function getAllCookies(): { name: string; value: string }[] {
  if (typeof document === "undefined") return [];
  return document.cookie.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: decodeURIComponent(rest.join("=")) };
  }).filter((cookie) => cookie.name);
}

/**
 * Sets multiple cookies in the browser.
 */
function setAllCookies(
  cookies: { name: string; value: string; options: { path?: string; maxAge?: number; domain?: string; sameSite?: "lax" | "strict" | "none" | boolean; secure?: boolean } }[]
): void {
  if (typeof document === "undefined") return;
  for (const { name, value, options } of cookies) {
    let cookie = `${name}=${encodeURIComponent(value)}`;
    if (options.path) cookie += `; path=${options.path}`;
    if (options.maxAge) cookie += `; max-age=${options.maxAge}`;
    if (options.domain) cookie += `; domain=${options.domain}`;
    if (options.sameSite && typeof options.sameSite === "string") {
      cookie += `; samesite=${options.sameSite}`;
    }
    if (options.secure) cookie += `; secure`;
    document.cookie = cookie;
  }
}

/**
 * Returns a singleton Supabase client for use in browser environments.
 *
 * This client uses cookie-based storage for session persistence,
 * ensuring compatibility with middleware auth checks.
 *
 * The singleton pattern ensures all components share the same client instance,
 * preventing auth state synchronization issues.
 *
 * Cookie names are configured to match middleware expectations:
 * - sb-access-token (access token)
 * - sb-refresh-token (refresh token)
 */
export const supabaseBrowser = (): ReturnType<typeof createBrowserClient<Database>> => {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not set");
  }

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: getAllCookies,
      setAll: setAllCookies,
    },
    cookieOptions: {
      // Cookie name prefix - Supabase will append token type (access-token, refresh-token)
      name: "sb",
      path: "/",
      sameSite: "lax",
      // 400 days max age (browser limit)
      maxAge: 400 * 24 * 60 * 60,
    },
    isSingleton: true,
  });

  return browserClient;
};
