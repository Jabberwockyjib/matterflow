import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

export type SessionProfile = {
  full_name: string | null;
  role: Database["public"]["Enums"]["user_role"] | null;
  status: string | null;
  password_must_change: boolean | null;
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

  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { session: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status, password_must_change")
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