import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

vi.mock("@/lib/square/actions", () => ({
  syncSquarePaymentStatus: vi.fn(),
}));
vi.mock("@/lib/square/client", () => ({
  getSquareWebhookSignatureKey: vi.fn(),
}));

import { POST } from "@/app/api/webhooks/square/route";
import { getSquareWebhookSignatureKey } from "@/lib/square/client";

const mockGetKey = vi.mocked(getSquareWebhookSignatureKey);

function signBody(body: string, key: string): string {
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(body);
  return hmac.digest("base64");
}

const VALID_WEBHOOK_BODY = JSON.stringify({
  type: "invoice.paid",
  eventId: "evt-1",
  merchantId: "merchant-1",
  data: { object: { invoice: { id: "inv-1" } } },
});

describe("POST /api/webhooks/square - Signature Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 500 when signature key is not configured", async () => {
    mockGetKey.mockResolvedValue(undefined);

    const request = new Request("http://localhost/api/webhooks/square", {
      method: "POST",
      body: VALID_WEBHOOK_BODY,
      headers: { "x-square-hmacsha256-signature": "some-sig" },
    });

    const response = await POST(request as any);
    expect(response.status).toBe(500);
  });

  it("returns 401 with invalid signature", async () => {
    mockGetKey.mockResolvedValue("real-key");

    const request = new Request("http://localhost/api/webhooks/square", {
      method: "POST",
      body: VALID_WEBHOOK_BODY,
      headers: { "x-square-hmacsha256-signature": "bad-sig" },
    });

    const response = await POST(request as any);
    expect(response.status).toBe(401);
  });

  it("processes webhook with valid signature", async () => {
    const key = "test-key-123";
    mockGetKey.mockResolvedValue(key);
    const sig = signBody(VALID_WEBHOOK_BODY, key);

    const request = new Request("http://localhost/api/webhooks/square", {
      method: "POST",
      body: VALID_WEBHOOK_BODY,
      headers: { "x-square-hmacsha256-signature": sig },
    });

    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });
});
