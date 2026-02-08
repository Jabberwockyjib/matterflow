import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: vi.fn(),
  supabaseEnvReady: vi.fn(() => true),
}));

import { getClientInfo, verifyClientMatterAccess } from "@/lib/data/queries";
import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";

describe("getClientInfo", () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabaseAdmin as any).mockReturnValue(mockSupabase);
    (supabaseEnvReady as any).mockReturnValue(true);
  });

  it("returns email and fullName when both exist", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { full_name: "Jane Doe" },
    });
    mockSupabase.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { email: "jane@example.com" } },
    });

    const result = await getClientInfo("user-123");
    expect(result).toEqual({ email: "jane@example.com", fullName: "Jane Doe" });
  });

  it("returns null when email is missing", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { full_name: "Jane Doe" },
    });
    mockSupabase.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { email: null } },
    });

    const result = await getClientInfo("user-123");
    expect(result).toBeNull();
  });

  it("falls back to 'Client' when full_name is null", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { full_name: null },
    });
    mockSupabase.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { email: "jane@example.com" } },
    });

    const result = await getClientInfo("user-123");
    expect(result).toEqual({ email: "jane@example.com", fullName: "Client" });
  });

  it("returns null when supabase env not ready", async () => {
    (supabaseEnvReady as any).mockReturnValue(false);
    const result = await getClientInfo("user-123");
    expect(result).toBeNull();
  });
});

describe("verifyClientMatterAccess", () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabaseAdmin as any).mockReturnValue(mockSupabase);
    (supabaseEnvReady as any).mockReturnValue(true);
  });

  it("returns true when client has access", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { id: "matter-1" } });
    const result = await verifyClientMatterAccess("matter-1", "user-1");
    expect(result).toBe(true);
  });

  it("returns false when client lacks access", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null });
    const result = await verifyClientMatterAccess("matter-1", "user-1");
    expect(result).toBe(false);
  });

  it("returns false when env not ready", async () => {
    (supabaseEnvReady as any).mockReturnValue(false);
    const result = await verifyClientMatterAccess("matter-1", "user-1");
    expect(result).toBe(false);
  });
});
