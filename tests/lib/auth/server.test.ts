import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  getSessionWithProfile,
  setMockSessionWithProfile,
  requireAuth,
  type SessionWithProfile,
} from "@/lib/auth/server";

describe("auth/server", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Reset mock before each test
    setMockSessionWithProfile(null);
  });

  afterEach(() => {
    process.env = originalEnv;
    setMockSessionWithProfile(null);
  });

  describe("setMockSessionWithProfile", () => {
    it("sets a mock session for testing", async () => {
      const mockSession: SessionWithProfile = {
        session: {
          user: {
            id: "user-123",
            email: "test@example.com",
          },
        },
        profile: {
          full_name: "Test User",
          role: "admin",
          status: "active",
          password_must_change: false,
        },
      };

      setMockSessionWithProfile(mockSession);

      const result = await getSessionWithProfile();
      expect(result).toEqual(mockSession);
    });

    it("can set mock to null to clear it", async () => {
      const mockSession: SessionWithProfile = {
        session: { user: { id: "user-123" } },
        profile: null,
      };

      setMockSessionWithProfile(mockSession);
      setMockSessionWithProfile(null);

      // After clearing, it will try to get real session
      // Without proper env vars, it returns null session
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const result = await getSessionWithProfile();
      expect(result).toEqual({ session: null, profile: null });
    });
  });

  describe("getSessionWithProfile", () => {
    it("returns mock session when set", async () => {
      const mockSession: SessionWithProfile = {
        session: {
          user: { id: "mock-user-id", email: "mock@test.com" },
        },
        profile: {
          full_name: "Mock User",
          role: "staff",
          status: "active",
          password_must_change: false,
        },
      };

      setMockSessionWithProfile(mockSession);

      const result = await getSessionWithProfile();

      expect(result.session?.user.id).toBe("mock-user-id");
      expect(result.profile?.full_name).toBe("Mock User");
      expect(result.profile?.role).toBe("staff");
    });

    it("returns null session when env vars are missing", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const result = await getSessionWithProfile();

      expect(result).toEqual({ session: null, profile: null });
    });

    it("returns null session when SUPABASE_URL is missing", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";

      const result = await getSessionWithProfile();

      expect(result).toEqual({ session: null, profile: null });
    });

    it("returns null session when ANON_KEY is missing", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const result = await getSessionWithProfile();

      expect(result).toEqual({ session: null, profile: null });
    });
  });

  describe("requireAuth", () => {
    it("throws when no session exists", async () => {
      setMockSessionWithProfile({
        session: null,
        profile: null,
      });

      await expect(requireAuth()).rejects.toThrow(
        "Unauthorized: no Supabase session found."
      );
    });

    it("returns session when authenticated", async () => {
      const mockSession = {
        user: { id: "auth-user-123", email: "auth@test.com" },
      };

      setMockSessionWithProfile({
        session: mockSession,
        profile: { full_name: "Auth User", role: "admin", status: "active", password_must_change: false },
      });

      const result = await requireAuth();

      expect(result).toEqual(mockSession);
    });

    it("returns session without profile requirement", async () => {
      const mockSession = {
        user: { id: "user-no-profile" },
      };

      setMockSessionWithProfile({
        session: mockSession,
        profile: null,
      });

      const result = await requireAuth();

      expect(result.user.id).toBe("user-no-profile");
    });
  });

  describe("SessionProfile type", () => {
    it("accepts all valid roles", async () => {
      const roles: Array<"admin" | "staff" | "client"> = ["admin", "staff", "client"];

      for (const role of roles) {
        setMockSessionWithProfile({
          session: { user: { id: "test-user" } },
          profile: { full_name: "Test", role, status: "active", password_must_change: false },
        });

        const result = await getSessionWithProfile();
        expect(result.profile?.role).toBe(role);
      }
    });

    it("handles null profile fields", async () => {
      setMockSessionWithProfile({
        session: { user: { id: "test-user" } },
        profile: {
          full_name: null,
          role: null,
          status: null,
          password_must_change: null,
        },
      });

      const result = await getSessionWithProfile();

      expect(result.profile?.full_name).toBeNull();
      expect(result.profile?.role).toBeNull();
      expect(result.profile?.status).toBeNull();
      expect(result.profile?.password_must_change).toBeNull();
    });
  });
});
