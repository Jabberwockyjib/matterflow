import { cookies, headers } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/database.types";

export type SessionProfile = {
  full_name: string | null;
  role: Database["public"]["Enums"]["user_role"] | null;
};

export async function getSessionWithProfile() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { session: null, profile: null };
  }

  const cookieStore = cookies();
  const safeGet = (name: string) => {
    try {
      const store = cookieStore as unknown as { get?: (key: string) => unknown };
      const value = store?.get?.(name);
      return typeof value === "string" ? value : value?.value;
    } catch {
      return undefined;
    }
  };

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => safeGet(name),
      set: (name: string, value: string, options: CookieOptions) => {
        try {
          const store = cookieStore as unknown as { set?: (input: unknown) => void };
          store?.set?.({ name, value, ...options });
        } catch {
          // noop in environments without mutable cookies (e.g., during SSR preview)
        }
      },
      remove: (name: string, options: CookieOptions) => {
        try {
          const store = cookieStore as unknown as { set?: (input: unknown) => void };
          store?.set?.({ name, value: "", ...options });
        } catch {
          // noop
        }
      },
    },
    headers,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { session: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("user_id", session.user.id)
    .maybeSingle();

  return {
    session,
    profile: profile as SessionProfile | null,
  };
}

export async function requireAuth() {
  const { session } = await getSessionWithProfile();
  if (!session) {
    throw new Error("Unauthorized: no Supabase session found.");
  }
  return session;
}
