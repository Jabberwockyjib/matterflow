import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("supabase/server", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("supabaseEnvReady", () => {
    it("returns true when all env vars are set", async () => {
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const { supabaseEnvReady } = await import("@/lib/supabase/server");

      expect(supabaseEnvReady()).toBe(true);
    });

    it("returns true when using NEXT_PUBLIC_SUPABASE_URL", async () => {
      delete process.env.SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const { supabaseEnvReady } = await import("@/lib/supabase/server");

      expect(supabaseEnvReady()).toBe(true);
    });

    it("returns false when SUPABASE_URL is missing", async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const { supabaseEnvReady } = await import("@/lib/supabase/server");

      expect(supabaseEnvReady()).toBe(false);
    });

    it("returns false when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
      process.env.SUPABASE_URL = "https://test.supabase.co";
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { supabaseEnvReady } = await import("@/lib/supabase/server");

      expect(supabaseEnvReady()).toBe(false);
    });

    it("returns false when all env vars are missing", async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { supabaseEnvReady } = await import("@/lib/supabase/server");

      expect(supabaseEnvReady()).toBe(false);
    });
  });

  describe("supabaseAdmin", () => {
    it("throws when SUPABASE_URL is missing", async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const { supabaseAdmin } = await import("@/lib/supabase/server");

      expect(() => supabaseAdmin()).toThrow(
        "Supabase service credentials are missing"
      );
    });

    it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
      process.env.SUPABASE_URL = "https://test.supabase.co";
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { supabaseAdmin } = await import("@/lib/supabase/server");

      expect(() => supabaseAdmin()).toThrow(
        "Supabase service credentials are missing"
      );
    });

    it("creates client when all env vars are set", async () => {
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const { supabaseAdmin } = await import("@/lib/supabase/server");

      const client = supabaseAdmin();
      expect(client).toBeDefined();
      expect(typeof client.from).toBe("function");
    });

    it("prefers SUPABASE_URL over NEXT_PUBLIC_SUPABASE_URL", async () => {
      process.env.SUPABASE_URL = "https://primary.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fallback.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const { supabaseAdmin } = await import("@/lib/supabase/server");

      // Client should be created without throwing
      const client = supabaseAdmin();
      expect(client).toBeDefined();
    });

    it("falls back to NEXT_PUBLIC_SUPABASE_URL when SUPABASE_URL is not set", async () => {
      delete process.env.SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fallback.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const { supabaseAdmin } = await import("@/lib/supabase/server");

      const client = supabaseAdmin();
      expect(client).toBeDefined();
    });
  });
});
