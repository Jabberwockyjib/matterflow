import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";

export const ensureSupabase = () => {
  if (!supabaseEnvReady()) {
    throw new Error("Supabase environment variables are not set");
  }
  return supabaseAdmin();
};

export const ensureStaffOrAdmin = async () => {
  const { profile, session } = await getSessionWithProfile();
  if (!session) {
    return { error: "Unauthorized: please sign in" } as const;
  }
  if (profile?.role === "client") {
    return { error: "Forbidden: clients cannot perform this action" } as const;
  }
  return { session, profile } as const;
};

export const ensureAdmin = async () => {
  const { profile, session } = await getSessionWithProfile();
  if (!session) {
    return { error: "Unauthorized: please sign in" } as const;
  }
  if (profile?.role !== "admin") {
    return { error: "Forbidden: only admins can perform this action" } as const;
  }
  return { session, profile } as const;
};
