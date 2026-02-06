import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/email/automations", () => ({
  runAllAutomations: vi.fn(() => ({
    intake: { sent: 0, failed: 0, errors: [] },
    activity: { sent: 0, failed: 0, errors: [] },
    invoices: { sent: 0, failed: 0, errors: [] },
  })),
  sendIntakeReminders: vi.fn(),
  sendActivityReminders: vi.fn(),
  sendInvoiceReminders: vi.fn(),
}));

import { GET, POST } from "@/app/api/cron/email-automations/route";

describe("Cron email-automations - Authentication", () => {
  const REAL_SECRET = "test-cron-secret-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when CRON_SECRET is NOT set", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
    });

    it("GET returns 401 even without CRON_SECRET configured", async () => {
      const request = new Request("http://localhost/api/cron/email-automations");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("POST returns 401 even without CRON_SECRET configured", async () => {
      const request = new Request("http://localhost/api/cron/email-automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe("when CRON_SECRET is set", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = REAL_SECRET;
    });

    it("GET returns 401 with wrong secret", async () => {
      const request = new Request("http://localhost/api/cron/email-automations", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("GET succeeds with correct secret", async () => {
      const request = new Request("http://localhost/api/cron/email-automations", {
        headers: { authorization: `Bearer ${REAL_SECRET}` },
      });
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it("POST returns 401 with no secret", async () => {
      const request = new Request("http://localhost/api/cron/email-automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
