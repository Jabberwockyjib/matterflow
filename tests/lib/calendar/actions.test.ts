import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSessionWithProfile, mockCalendarEvent, defaultIds } from "../../setup/mocks/fixtures";

// Create a flexible chain mock that returns itself for any method call
function createChainMock(finalResult: Record<string, unknown> = { data: null, error: null }) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: (_target, prop) => {
      if (prop === "then" || prop === "catch") return undefined;
      // Terminal methods return the final result
      if (prop === "single" || prop === "maybeSingle") return () => finalResult;
      // Allow destructuring `{ error }` and `{ data }` from chain results
      if (prop === "error") return finalResult.error ?? null;
      if (prop === "data") return finalResult.data ?? null;
      // Everything else returns a new proxy to continue the chain
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const mockCalEvent = mockCalendarEvent();

vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "calendar_events") {
        return createChainMock({ data: mockCalEvent, error: null });
      }
      if (table === "audit_logs") {
        return createChainMock({ data: null, error: null });
      }
      if (table === "practice_settings") {
        return createChainMock({
          data: { google_refresh_token: null, google_calendar_id: null },
          error: null,
        });
      }
      return createChainMock({ data: null, error: null });
    }),
  })),
  supabaseEnvReady: vi.fn(() => true),
}));

// Mock auth - defaults to staff
vi.mock("@/lib/auth/server", () => ({
  getSessionWithProfile: vi.fn(() =>
    Promise.resolve({
      session: mockSessionWithProfile().session,
      profile: mockSessionWithProfile().profile,
    })
  ),
}));

// Mock revalidatePath (it's a Next.js server function)
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createCalendarEvent, deleteCalendarEvent, createCalendarEventForTask } from "@/lib/calendar/actions";
import { getSessionWithProfile } from "@/lib/auth/server";

describe("Calendar Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionWithProfile).mockResolvedValue({
      session: mockSessionWithProfile().session as never,
      profile: mockSessionWithProfile().profile,
    });
  });

  describe("createCalendarEvent", () => {
    it("requires authentication", async () => {
      vi.mocked(getSessionWithProfile).mockResolvedValueOnce({
        session: null as never,
        profile: null as never,
      });

      const formData = new FormData();
      formData.set("title", "Test Event");
      formData.set("startTime", "2026-03-01T10:00:00.000Z");
      formData.set("endTime", "2026-03-01T11:00:00.000Z");

      const result = await createCalendarEvent(formData);
      expect(result.error).toContain("Unauthorized");
    });

    it("blocks client role", async () => {
      vi.mocked(getSessionWithProfile).mockResolvedValueOnce({
        session: mockSessionWithProfile().session as never,
        profile: mockSessionWithProfile({ profile: { role: "client" } }).profile,
      });

      const formData = new FormData();
      formData.set("title", "Test Event");
      formData.set("startTime", "2026-03-01T10:00:00.000Z");
      formData.set("endTime", "2026-03-01T11:00:00.000Z");

      const result = await createCalendarEvent(formData);
      expect(result.error).toContain("Forbidden");
    });

    it("validates required fields", async () => {
      const formData = new FormData();
      // Missing title and times
      const result = await createCalendarEvent(formData);
      expect(result.error).toBeTruthy();
    });

    it("creates event with valid data", async () => {
      const formData = new FormData();
      formData.set("title", "Meeting with Client");
      formData.set("startTime", "2026-03-01T10:00:00.000Z");
      formData.set("endTime", "2026-03-01T11:00:00.000Z");
      formData.set("eventType", "meeting");

      const result = await createCalendarEvent(formData);
      expect(result.ok).toBe(true);
    });
  });

  describe("deleteCalendarEvent", () => {
    it("requires authentication", async () => {
      vi.mocked(getSessionWithProfile).mockResolvedValueOnce({
        session: null as never,
        profile: null as never,
      });

      const result = await deleteCalendarEvent("some-id");
      expect(result.error).toContain("Unauthorized");
    });

    it("blocks client role", async () => {
      vi.mocked(getSessionWithProfile).mockResolvedValueOnce({
        session: mockSessionWithProfile().session as never,
        profile: mockSessionWithProfile({ profile: { role: "client" } }).profile,
      });

      const result = await deleteCalendarEvent("some-id");
      expect(result.error).toContain("Forbidden");
    });

    it("deletes event for staff", async () => {
      const result = await deleteCalendarEvent(defaultIds.calendarEventId);
      expect(result.ok).toBe(true);
    });
  });

  describe("createCalendarEventForTask", () => {
    it("does not fail when supabase is available", async () => {
      await expect(
        createCalendarEventForTask(
          defaultIds.taskId,
          "Review Documents",
          "2026-03-15",
          defaultIds.matterId
        )
      ).resolves.not.toThrow();
    });
  });
});
