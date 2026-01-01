import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: vi.fn(),
  supabaseEnvReady: vi.fn(() => true),
}));

import { getClientProfile, getActiveClients } from "@/lib/data/queries";
import { supabaseAdmin } from "@/lib/supabase/server";

describe("getClientProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for non-existent user", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
    };

    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);

    const result = await getClientProfile("nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Client not found");
  });

  it("returns error when user is not a client", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { user_id: "test", role: "admin", full_name: "Admin" },
        error: null
      }),
    };

    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);

    const result = await getClientProfile("test");

    expect(result.success).toBe(false);
    expect(result.error).toBe("User is not a client");
  });
});

describe("getActiveClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles database errors gracefully", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
    };

    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);

    const result = await getActiveClients();

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});
