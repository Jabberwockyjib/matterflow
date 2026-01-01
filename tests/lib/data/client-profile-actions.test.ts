import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: vi.fn(),
  supabaseEnvReady: vi.fn(() => true),
}));

vi.mock("@/lib/auth/server", () => ({
  getSessionWithProfile: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateClientProfile } from "@/lib/data/actions";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";

describe("updateClientProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates client profile successfully", async () => {
    vi.mocked(getSessionWithProfile).mockResolvedValue({
      session: { user: { id: "admin-id" } },
      profile: { role: "admin", user_id: "admin-id" },
    } as any);

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);

    const formData = new FormData();
    formData.set("userId", "123e4567-e89b-12d3-a456-426614174000");
    formData.set("phone", "555-123-4567");
    formData.set("companyName", "Acme Corp");

    const result = await updateClientProfile(formData);

    expect(result.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSupabase.update).toHaveBeenCalled();
  });

  it("rejects clients from updating", async () => {
    vi.mocked(getSessionWithProfile).mockResolvedValue({
      session: { user: { id: "client-id" } },
      profile: { role: "client", user_id: "client-id" },
    } as any);

    const formData = new FormData();
    formData.set("userId", "123e4567-e89b-12d3-a456-426614174000");

    const result = await updateClientProfile(formData);

    expect(result.error).toContain("Forbidden");
  });

  it("validates input data", async () => {
    vi.mocked(getSessionWithProfile).mockResolvedValue({
      session: { user: { id: "admin-id" } },
      profile: { role: "admin", user_id: "admin-id" },
    } as any);

    const formData = new FormData();
    formData.set("userId", "not-a-uuid");

    const result = await updateClientProfile(formData);

    expect(result.ok).toBeFalsy();
    expect(result.error).toBeDefined();
  });
});
