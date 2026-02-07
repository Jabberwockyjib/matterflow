import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Google Calendar client module
vi.mock("@/lib/google-calendar/client", () => ({
  createCalendarClient: vi.fn(),
  syncGoogleCalendarEvents: vi.fn(() => ({ events: [], nextSyncToken: "test-token" })),
  toGoogleEvent: vi.fn(() => ({})),
  createGoogleCalendarEvent: vi.fn(() => ({ id: "gcal-1", etag: "etag-1", updated: "2026-01-01" })),
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            data: { google_refresh_token: null, google_calendar_id: null, google_calendar_sync_token: null },
          })),
          single: vi.fn(() => ({
            data: { google_refresh_token: null },
          })),
        })),
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null })),
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ data: [] })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        limit: vi.fn(() => ({ error: null })),
        eq: vi.fn(() => ({ error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
  })),
  supabaseEnvReady: vi.fn(() => true),
}));

import { GET } from "@/app/api/cron/calendar-sync/route";

describe("Calendar Sync Cron - Authentication", () => {
  const REAL_SECRET = "test-cron-secret-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when CRON_SECRET is NOT set", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
    });

    it("returns 401 without CRON_SECRET configured", async () => {
      const request = new Request("http://localhost/api/cron/calendar-sync");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe("when CRON_SECRET is set", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = REAL_SECRET;
    });

    it("returns 401 with wrong secret", async () => {
      const request = new Request("http://localhost/api/cron/calendar-sync", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 401 with no Authorization header", async () => {
      const request = new Request("http://localhost/api/cron/calendar-sync");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("succeeds with correct secret (returns 200 even without Google connected)", async () => {
      const request = new Request("http://localhost/api/cron/calendar-sync", {
        headers: { authorization: `Bearer ${REAL_SECRET}` },
      });
      const response = await GET(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toContain("not connected");
    });
  });
});
