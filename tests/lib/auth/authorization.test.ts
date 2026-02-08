import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/auth/server", () => ({
  getSessionWithProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseEnvReady: vi.fn(),
  supabaseAdmin: vi.fn(),
}));

import { ensureSupabase, ensureStaffOrAdmin, ensureAdmin } from "@/lib/auth/authorization";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseEnvReady, supabaseAdmin } from "@/lib/supabase/server";

const mockGetSession = vi.mocked(getSessionWithProfile);
const mockEnvReady = vi.mocked(supabaseEnvReady);
const mockAdmin = vi.mocked(supabaseAdmin);

describe("ensureSupabase", () => {
  it("throws when env vars are not set", () => {
    mockEnvReady.mockReturnValue(false);
    expect(() => ensureSupabase()).toThrow("Supabase environment variables are not set");
  });

  it("returns supabaseAdmin client when env is ready", () => {
    mockEnvReady.mockReturnValue(true);
    const mockClient = { from: vi.fn() };
    mockAdmin.mockReturnValue(mockClient as any);
    expect(ensureSupabase()).toBe(mockClient);
  });
});

describe("ensureStaffOrAdmin", () => {
  it("returns error when no session", async () => {
    mockGetSession.mockResolvedValue({ session: null, profile: null });
    const result = await ensureStaffOrAdmin();
    expect(result).toEqual({ error: "Unauthorized: please sign in" });
  });

  it("returns error when user is client", async () => {
    mockGetSession.mockResolvedValue({
      session: { user: { id: "u1" } } as any,
      profile: { role: "client" } as any,
    });
    const result = await ensureStaffOrAdmin();
    expect(result).toEqual({ error: "Forbidden: clients cannot perform this action" });
  });

  it("returns session and profile for staff", async () => {
    const session = { user: { id: "u1" } } as any;
    const profile = { role: "staff" } as any;
    mockGetSession.mockResolvedValue({ session, profile });
    const result = await ensureStaffOrAdmin();
    expect(result).toEqual({ session, profile });
  });

  it("returns session and profile for admin", async () => {
    const session = { user: { id: "u1" } } as any;
    const profile = { role: "admin" } as any;
    mockGetSession.mockResolvedValue({ session, profile });
    const result = await ensureStaffOrAdmin();
    expect(result).toEqual({ session, profile });
  });
});

describe("ensureAdmin", () => {
  it("returns error when no session", async () => {
    mockGetSession.mockResolvedValue({ session: null, profile: null });
    const result = await ensureAdmin();
    expect(result).toEqual({ error: "Unauthorized: please sign in" });
  });

  it("returns error for staff (non-admin)", async () => {
    mockGetSession.mockResolvedValue({
      session: { user: { id: "u1" } } as any,
      profile: { role: "staff" } as any,
    });
    const result = await ensureAdmin();
    expect(result).toEqual({ error: "Forbidden: only admins can perform this action" });
  });

  it("returns error for client", async () => {
    mockGetSession.mockResolvedValue({
      session: { user: { id: "u1" } } as any,
      profile: { role: "client" } as any,
    });
    const result = await ensureAdmin();
    expect(result).toEqual({ error: "Forbidden: only admins can perform this action" });
  });

  it("returns session and profile for admin", async () => {
    const session = { user: { id: "u1" } } as any;
    const profile = { role: "admin" } as any;
    mockGetSession.mockResolvedValue({ session, profile });
    const result = await ensureAdmin();
    expect(result).toEqual({ session, profile });
  });
});
