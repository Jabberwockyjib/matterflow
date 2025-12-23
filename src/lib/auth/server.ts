import { cookies, headers } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/database.types";

export type SessionProfile = {
  full_name: string | null;
  role: Database["public"]["Enums"]["user_role"] | null;
};

export type SessionWithProfile = {
  session: {
    user: {
      id: string;
      email?: string;
    };
  } | null;
  profile: SessionProfile | null;
};

// For testing purposes - can be mocked in tests
let mockSessionWithProfile: SessionWithProfile | null = null;

export function setMockSessionWithProfile(data: SessionWithProfile | null) {
  mockSessionWithProfile = data;
}

export async function getSessionWithProfile(): Promise<SessionWithProfile> {
  if (mockSessionWithProfile !== null) {
    return mockSessionWithProfile;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { session: null, profile: null };
  }

  const cookieStore = cookies();
  const safeGet = (name: string): string | undefined => {
    try {
      const store = cookieStore as unknown as { get?: (key: string) => unknown };
      const value = store?.get?.(name);
      if (typeof value === "string") return value;
      if (value && typeof value === "object" && "value" in value) {
        return (value as { value: string }).value;
      }
      return undefined;
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