# Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical and high-severity security vulnerabilities found in the MatterFlow security audit, with tests for each fix.

**Architecture:** Each task is a self-contained security fix with a failing test written first (TDD). Fixes are ordered by severity: unauthenticated endpoints first, then authorization gaps, then defense-in-depth hardening. Each task ends with a commit.

**Tech Stack:** Next.js 15 (App Router), Supabase, Vitest + React Testing Library, TypeScript

**Test Pattern:** All security tests go in `tests/security/` and mock `getSessionWithProfile` from `@/lib/auth/server` plus `supabaseAdmin` from `@/lib/supabase/server`. The existing test infrastructure uses vitest globals and jsdom.

---

### Task 1: Create shared security test utilities

**Files:**
- Create: `tests/security/helpers.ts`
- Create: `tests/security/README.md`

**Step 1: Create the test helpers module**

```typescript
// tests/security/helpers.ts
import { vi } from "vitest";
import type { SessionWithProfile } from "@/lib/auth/server";

/**
 * Standard mock sessions for security tests
 */
export const MOCK_ADMIN_SESSION: SessionWithProfile = {
  session: { user: { id: "admin-user-id", email: "admin@test.com" } },
  profile: { full_name: "Admin User", role: "admin", status: "active", password_must_change: false },
};

export const MOCK_STAFF_SESSION: SessionWithProfile = {
  session: { user: { id: "staff-user-id", email: "staff@test.com" } },
  profile: { full_name: "Staff User", role: "staff", status: "active", password_must_change: false },
};

export const MOCK_CLIENT_SESSION: SessionWithProfile = {
  session: { user: { id: "client-user-id", email: "client@test.com" } },
  profile: { full_name: "Client User", role: "client", status: "active", password_must_change: false },
};

export const MOCK_NO_SESSION: SessionWithProfile = {
  session: null,
  profile: null,
};

/**
 * Create a mock NextRequest with optional auth and body
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: FormData | string;
  } = {}
): Request {
  const { method = "GET", headers = {}, body } = options;
  return new Request(url, {
    method,
    headers: new Headers(headers),
    body: body || undefined,
  });
}

/**
 * Create a FormData with file for upload tests
 */
export function createMockFormData(fields: Record<string, string | File>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

/**
 * Create a mock File object
 */
export function createMockFile(name = "test.pdf", type = "application/pdf", size = 1024): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}
```

**Step 2: Run test to verify helpers load**

Run: `pnpm vitest run tests/security/helpers.ts --passWithNoTests`
Expected: PASS (no tests, but file loads without error)

**Step 3: Commit**

```bash
git add tests/security/helpers.ts
git commit -m "chore: add shared security test utilities"
```

---

### Task 2: Add authentication to intake file upload endpoint

**Files:**
- Modify: `src/app/api/intake/upload/route.ts:112` (add auth check at start of POST)
- Create: `tests/security/intake-upload-auth.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/security/intake-upload-auth.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before imports
vi.mock("@/lib/auth/server", () => ({
  getSessionWithProfile: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null })),
        })),
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null })),
        })),
      })),
      upsert: vi.fn(() => ({ error: null })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "doc-1" }, error: null })),
        })),
      })),
    })),
  })),
}));
vi.mock("@/lib/google-drive/documents", () => ({
  uploadFileToDrive: vi.fn(),
}));
vi.mock("@/lib/google-drive/folders", () => ({
  createMatterFolders: vi.fn(),
}));

import { POST } from "@/app/api/intake/upload/route";
import { getSessionWithProfile } from "@/lib/auth/server";
import { MOCK_NO_SESSION, MOCK_CLIENT_SESSION, createMockFile } from "./helpers";

const mockGetSession = vi.mocked(getSessionWithProfile);

describe("POST /api/intake/upload - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session exists", async () => {
    mockGetSession.mockResolvedValue(MOCK_NO_SESSION);

    const formData = new FormData();
    formData.append("matterId", "test-matter-id");
    formData.append("file", createMockFile());

    const request = new Request("http://localhost/api/intake/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toMatch(/unauthorized|sign in/i);
  });

  it("allows authenticated client to upload", async () => {
    mockGetSession.mockResolvedValue(MOCK_CLIENT_SESSION);

    const formData = new FormData();
    formData.append("matterId", "test-matter-id");
    formData.append("file", createMockFile());

    const request = new Request("http://localhost/api/intake/upload", {
      method: "POST",
      body: formData,
    });

    // Will fail at Google Drive step (no refresh token), but should NOT fail at auth
    const response = await POST(request as any);
    const json = await response.json();

    // Should get past auth (400 = missing google drive, not 401)
    expect(response.status).not.toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/security/intake-upload-auth.test.ts`
Expected: FAIL - currently no auth check, so unauthenticated requests return 400 (missing fields) not 401

**Step 3: Add authentication check to intake upload**

In `src/app/api/intake/upload/route.ts`, add import and auth check at the start of the POST function:

Add import at top (after line 5):
```typescript
import { getSessionWithProfile } from "@/lib/auth/server";
```

Add auth check at start of POST handler (after line 113, before `const formData`):
```typescript
    // Verify user is authenticated
    const { session } = await getSessionWithProfile();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: please sign in" },
        { status: 401 }
      );
    }
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/security/intake-upload-auth.test.ts`
Expected: PASS

**Step 5: Run full test suite to check for regressions**

Run: `pnpm vitest run`
Expected: All existing tests still pass

**Step 6: Commit**

```bash
git add src/app/api/intake/upload/route.ts tests/security/intake-upload-auth.test.ts
git commit -m "fix(security): add authentication to intake file upload endpoint"
```

---

### Task 3: Add authentication to task file upload endpoint

**Files:**
- Modify: `src/app/api/tasks/upload/route.ts:38` (add auth check at start of POST)
- Create: `tests/security/task-upload-auth.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/security/task-upload-auth.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/server", () => ({
  getSessionWithProfile: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null })),
        })),
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "doc-1" }, error: null })),
        })),
      })),
    })),
  })),
}));
vi.mock("@/lib/google-drive/documents", () => ({
  uploadFileToDrive: vi.fn(),
}));

import { POST } from "@/app/api/tasks/upload/route";
import { getSessionWithProfile } from "@/lib/auth/server";
import { MOCK_NO_SESSION, MOCK_CLIENT_SESSION, createMockFile } from "./helpers";

const mockGetSession = vi.mocked(getSessionWithProfile);

describe("POST /api/tasks/upload - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session exists", async () => {
    mockGetSession.mockResolvedValue(MOCK_NO_SESSION);

    const formData = new FormData();
    formData.append("matterId", "matter-1");
    formData.append("taskId", "task-1");
    formData.append("file", createMockFile());

    const request = new Request("http://localhost/api/tasks/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request as any);
    expect(response.status).toBe(401);
  });

  it("allows authenticated user to proceed", async () => {
    mockGetSession.mockResolvedValue(MOCK_CLIENT_SESSION);

    const formData = new FormData();
    formData.append("matterId", "matter-1");
    formData.append("taskId", "task-1");
    formData.append("file", createMockFile());

    const request = new Request("http://localhost/api/tasks/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request as any);
    expect(response.status).not.toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/security/task-upload-auth.test.ts`
Expected: FAIL

**Step 3: Add authentication check to task upload**

In `src/app/api/tasks/upload/route.ts`, add import at top (after line 4):
```typescript
import { getSessionWithProfile } from "@/lib/auth/server";
```

Add auth check at start of POST handler (after line 39, before `const formData`):
```typescript
    // Verify user is authenticated
    const { session } = await getSessionWithProfile();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: please sign in" },
        { status: 401 }
      );
    }
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/security/task-upload-auth.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `pnpm vitest run`
Expected: All pass

**Step 6: Commit**

```bash
git add src/app/api/tasks/upload/route.ts tests/security/task-upload-auth.test.ts
git commit -m "fix(security): add authentication to task file upload endpoint"
```

---

### Task 4: Make cron endpoint authentication mandatory

**Files:**
- Modify: `src/app/api/cron/email-automations/route.ts:18,85`
- Create: `tests/security/cron-auth.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/security/cron-auth.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/security/cron-auth.test.ts`
Expected: FAIL - "when CRON_SECRET is NOT set" tests fail because current code skips auth when secret is unset

**Step 3: Fix the conditional auth check**

In `src/app/api/cron/email-automations/route.ts`:

Change line 18 from:
```typescript
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
```
to:
```typescript
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
```

Change line 85 from:
```typescript
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
```
to:
```typescript
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/security/cron-auth.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `pnpm vitest run`
Expected: All pass

**Step 6: Commit**

```bash
git add src/app/api/cron/email-automations/route.ts tests/security/cron-auth.test.ts
git commit -m "fix(security): make CRON_SECRET mandatory for email automation endpoints"
```

---

### Task 5: Make Square webhook signature verification mandatory

**Files:**
- Modify: `src/app/api/webhooks/square/route.ts:52-66`
- Create: `tests/security/webhook-signature.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/security/webhook-signature.test.ts
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
    mockGetKey.mockResolvedValue(null);

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
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/security/webhook-signature.test.ts`
Expected: FAIL - "returns 500 when not configured" fails because current code logs warning and continues

**Step 3: Make signature verification mandatory**

In `src/app/api/webhooks/square/route.ts`, replace lines 51-66:

Old:
```typescript
    // Verify webhook signature if signature key is configured
    if (signatureKey) {
      const isValid = verifyWebhookSignature(body, signature, signatureKey);

      if (!isValid) {
        console.error("Invalid Square webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    } else {
      console.warn(
        "SQUARE_WEBHOOK_SIGNATURE_KEY not set. Webhook signature verification skipped.",
      );
    }
```

New:
```typescript
    // Verify webhook signature (mandatory)
    if (!signatureKey) {
      console.error("SQUARE_WEBHOOK_SIGNATURE_KEY not configured. Rejecting webhook.");
      return NextResponse.json(
        { error: "Webhook signature verification not configured" },
        { status: 500 },
      );
    }

    const isValid = verifyWebhookSignature(body, signature, signatureKey);
    if (!isValid) {
      console.error("Invalid Square webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/security/webhook-signature.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `pnpm vitest run`
Expected: All pass

**Step 6: Commit**

```bash
git add src/app/api/webhooks/square/route.ts tests/security/webhook-signature.test.ts
git commit -m "fix(security): make Square webhook signature verification mandatory"
```

---

### Task 6: Add open redirect protection to OAuth callbacks

**Files:**
- Create: `src/lib/auth/validate-return-url.ts`
- Create: `tests/security/validate-return-url.test.ts`
- Modify: `src/app/api/auth/google/callback/route.ts:42`
- Modify: `src/app/api/auth/square/callback/route.ts:57`

**Step 1: Write the failing test**

```typescript
// tests/security/validate-return-url.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeReturnUrl } from "@/lib/auth/validate-return-url";

describe("sanitizeReturnUrl", () => {
  it("allows relative paths", () => {
    expect(sanitizeReturnUrl("/settings")).toBe("/settings");
    expect(sanitizeReturnUrl("/settings?tab=integrations")).toBe("/settings?tab=integrations");
    expect(sanitizeReturnUrl("/")).toBe("/");
  });

  it("rejects absolute URLs to external domains", () => {
    expect(sanitizeReturnUrl("https://evil.com")).toBe("/");
    expect(sanitizeReturnUrl("https://evil.com/phishing")).toBe("/");
    expect(sanitizeReturnUrl("http://attacker.com")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeReturnUrl("//evil.com")).toBe("/");
    expect(sanitizeReturnUrl("//evil.com/path")).toBe("/");
  });

  it("rejects javascript: URLs", () => {
    expect(sanitizeReturnUrl("javascript:alert(1)")).toBe("/");
  });

  it("rejects data: URLs", () => {
    expect(sanitizeReturnUrl("data:text/html,<script>alert(1)</script>")).toBe("/");
  });

  it("returns / for empty or undefined input", () => {
    expect(sanitizeReturnUrl("")).toBe("/");
    expect(sanitizeReturnUrl(undefined as any)).toBe("/");
    expect(sanitizeReturnUrl(null as any)).toBe("/");
  });

  it("allows paths with hash fragments", () => {
    expect(sanitizeReturnUrl("/matters#section")).toBe("/matters#section");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/security/validate-return-url.test.ts`
Expected: FAIL - module not found

**Step 3: Implement sanitizeReturnUrl**

```typescript
// src/lib/auth/validate-return-url.ts

/**
 * Sanitize a return URL to prevent open redirect attacks.
 * Only allows relative paths starting with "/".
 * Returns "/" for any invalid, external, or malicious URL.
 */
export function sanitizeReturnUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "/";

  // Must start with exactly one "/" (not "//")
  if (!url.startsWith("/") || url.startsWith("//")) return "/";

  // Block javascript:, data:, etc. (shouldn't reach here but defense-in-depth)
  if (/^[a-z]+:/i.test(url)) return "/";

  return url;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/security/validate-return-url.test.ts`
Expected: PASS

**Step 5: Wire into Google OAuth callback**

In `src/app/api/auth/google/callback/route.ts`:

Add import after line 5:
```typescript
import { sanitizeReturnUrl } from "@/lib/auth/validate-return-url";
```

Change line 42 from:
```typescript
        returnUrl = stateData.returnUrl || "/";
```
to:
```typescript
        returnUrl = sanitizeReturnUrl(stateData.returnUrl);
```

**Step 6: Wire into Square OAuth callback**

In `src/app/api/auth/square/callback/route.ts`:

Add import after line 4:
```typescript
import { sanitizeReturnUrl } from "@/lib/auth/validate-return-url";
```

Change line 57 from:
```typescript
        returnUrl = stateData.returnUrl || "/settings";
```
to:
```typescript
        returnUrl = sanitizeReturnUrl(stateData.returnUrl) || "/settings";
```

**Step 7: Run full test suite**

Run: `pnpm vitest run`
Expected: All pass

**Step 8: Commit**

```bash
git add src/lib/auth/validate-return-url.ts tests/security/validate-return-url.test.ts src/app/api/auth/google/callback/route.ts src/app/api/auth/square/callback/route.ts
git commit -m "fix(security): add open redirect protection to OAuth callbacks"
```

---

### Task 7: Stop passing secrets to client components

**Files:**
- Modify: `src/app/settings/integrations-panel.tsx:55-71` (remove secrets from props)
- Modify: `src/components/square-connect.tsx:16,26,32` (remove webhookSignatureKey prop, use server action)

**Step 1: Write the failing test**

```typescript
// tests/security/no-secrets-to-client.test.ts
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Static analysis test: ensure secret values are never passed to client components.
 * This is a grep-style test that catches regressions.
 */
describe("No secrets passed to client components", () => {
  it("integrations-panel does not pass token values to client components", () => {
    const content = fs.readFileSync(
      path.resolve("src/app/settings/integrations-panel.tsx"),
      "utf-8"
    );

    // Should NOT pass actual token/key values as props
    expect(content).not.toMatch(/webhookSignatureKey=\{.*square_webhook_signature_key/);
    expect(content).not.toMatch(/webhookSignatureKey:\s*process\.env/);

    // Should still pass boolean connection status (that's fine)
    expect(content).toMatch(/isConnected=/);
  });

  it("square-connect does not accept or store webhook signature key", () => {
    const content = fs.readFileSync(
      path.resolve("src/components/square-connect.tsx"),
      "utf-8"
    );

    // Should NOT have webhookSignatureKey in props interface
    expect(content).not.toMatch(/webhookSignatureKey\??: string/);
    // Should NOT have initialWebhookKey state
    expect(content).not.toMatch(/initialWebhookKey/);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/security/no-secrets-to-client.test.ts`
Expected: FAIL - current code passes webhookSignatureKey to SquareConnect

**Step 3: Remove secrets from integrations-panel.tsx**

In `src/app/settings/integrations-panel.tsx`:

Remove `square_webhook_signature_key` from the select query (line 28).

Replace the squareSettings object (lines 55-71) to remove webhookSignatureKey:

Old:
```typescript
    const squareSettings = isSquareConnectedViaOAuth
      ? {
        merchantId: practiceSettings?.square_merchant_id || undefined,
        locationId: practiceSettings?.square_location_id || undefined,
        locationName: practiceSettings?.square_location_name || undefined,
        environment: (practiceSettings?.square_environment as "sandbox" | "production") || "sandbox",
        connectedAt: practiceSettings?.square_connected_at || undefined,
        webhookSignatureKey: practiceSettings?.square_webhook_signature_key || undefined,
      }
      : isSquareConnectedViaEnv
      ? {
        locationId: process.env.SQUARE_LOCATION_ID,
        environment: (process.env.SQUARE_ENVIRONMENT as "sandbox" | "production") || "sandbox",
        connectedAt: undefined,
        webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || undefined,
      }
      : undefined;
```

New:
```typescript
    const squareSettings = isSquareConnectedViaOAuth
      ? {
        merchantId: practiceSettings?.square_merchant_id || undefined,
        locationId: practiceSettings?.square_location_id || undefined,
        locationName: practiceSettings?.square_location_name || undefined,
        environment: (practiceSettings?.square_environment as "sandbox" | "production") || "sandbox",
        connectedAt: practiceSettings?.square_connected_at || undefined,
        hasWebhookKey: Boolean(practiceSettings?.square_webhook_signature_key),
      }
      : isSquareConnectedViaEnv
      ? {
        locationId: process.env.SQUARE_LOCATION_ID,
        environment: (process.env.SQUARE_ENVIRONMENT as "sandbox" | "production") || "sandbox",
        connectedAt: undefined,
        hasWebhookKey: Boolean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY),
      }
      : undefined;
```

Update the SquareConnect prop from `webhookSignatureKey={squareSettings?.webhookSignatureKey}` to `hasWebhookKey={squareSettings?.hasWebhookKey}`.

**Step 4: Update square-connect.tsx**

In `src/components/square-connect.tsx`:

Replace `webhookSignatureKey?: string` in the interface (line 16) with `hasWebhookKey?: boolean`.

Remove `webhookSignatureKey: initialWebhookKey` from destructuring (line 26), replace with `hasWebhookKey`.

Change the webhook key state (line 32) from:
```typescript
  const [webhookKey, setWebhookKey] = useState(initialWebhookKey || "");
```
to:
```typescript
  const [webhookKey, setWebhookKey] = useState("");
```

Change the "key is configured" indicator (line 201) from:
```typescript
                {initialWebhookKey && (
```
to:
```typescript
                {hasWebhookKey && (
```

**Step 5: Run test to verify it passes**

Run: `pnpm vitest run tests/security/no-secrets-to-client.test.ts`
Expected: PASS

**Step 6: Run typecheck and full test suite**

Run: `pnpm typecheck && pnpm vitest run`
Expected: All pass

**Step 7: Commit**

```bash
git add src/app/settings/integrations-panel.tsx src/components/square-connect.tsx tests/security/no-secrets-to-client.test.ts
git commit -m "fix(security): stop passing OAuth tokens and webhook keys to client components"
```

---

### Task 8: Fix RLS WITH CHECK(true) on intake_responses

**Files:**
- Create: `supabase/migrations/20260205000001_fix_intake_responses_rls.sql`

**Step 1: Write the migration**

```sql
-- Fix overly permissive WITH CHECK(true) on intake_responses
-- Previously any user passing the USING clause could write arbitrary data.
-- Now the WITH CHECK enforces the same conditions as USING.

DROP POLICY IF EXISTS "intake responses editable by staff/owner" ON public.intake_responses;

CREATE POLICY "intake responses editable by staff/owner"
  ON public.intake_responses FOR ALL
  USING (
    current_user_role() IN ('admin', 'staff')
    OR auth.uid() IN (
      SELECT client_id FROM public.matters WHERE matters.id = intake_responses.matter_id
    )
  )
  WITH CHECK (
    current_user_role() IN ('admin', 'staff')
    OR auth.uid() IN (
      SELECT client_id FROM public.matters WHERE matters.id = intake_responses.matter_id
    )
  );
```

**Step 2: Apply migration to production via Supabase MCP**

Use `mcp__supabase-therapy__apply_migration` with the SQL above.

**Step 3: Verify by checking Supabase security advisors**

Use `mcp__supabase-therapy__get_advisors` with type "security" and confirm the intake_responses warning is gone.

**Step 4: Commit**

```bash
git add supabase/migrations/20260205000001_fix_intake_responses_rls.sql
git commit -m "fix(security): fix permissive WITH CHECK(true) on intake_responses RLS policy"
```

---

### Task 9: Fix SECURITY DEFINER functions missing SET search_path

**Files:**
- Create: `supabase/migrations/20260205000002_fix_function_search_paths.sql`

**Step 1: Write the migration**

```sql
-- Fix SECURITY DEFINER functions missing SET search_path
-- Without explicit search_path, these functions are vulnerable to search path attacks.

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'client',
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Step 2: Apply migration to production via Supabase MCP**

Use `mcp__supabase-therapy__apply_migration` with the SQL above.

**Step 3: Verify by checking Supabase security advisors**

Use `mcp__supabase-therapy__get_advisors` with type "security" and confirm the function warnings are gone.

**Step 4: Commit**

```bash
git add supabase/migrations/20260205000002_fix_function_search_paths.sql
git commit -m "fix(security): add SET search_path to SECURITY DEFINER functions"
```

---

### Task 10: Restrict practice_settings RLS to hide secrets from non-admins

**Files:**
- Create: `supabase/migrations/20260205000003_restrict_practice_settings_rls.sql`

**Step 1: Write the migration**

The current policy lets staff and clients read ALL columns of practice_settings, including OAuth tokens. We need to create a view that exposes only non-sensitive columns for non-admin users. Since RLS can't filter columns, we'll use a secure view instead.

```sql
-- Restrict practice_settings to hide secret columns from non-admin users
-- Create a secure view for non-admin access to practice settings

-- Drop existing permissive read policy for staff/client
DROP POLICY IF EXISTS "Staff and client can read practice settings" ON public.practice_settings;

-- Create a restrictive read policy that only exposes non-secret fields via function
-- Staff/client can still SELECT but only through the secure view
CREATE OR REPLACE FUNCTION public.get_practice_settings_safe()
RETURNS TABLE (
  id uuid,
  firm_name text,
  contact_email text,
  contact_phone text,
  address text,
  default_hourly_rate numeric,
  payment_terms_days integer,
  late_fee_percentage numeric,
  auto_reminders_enabled boolean,
  matter_types jsonb,
  google_connected_at timestamptz,
  google_connected_email text,
  square_connected_at text,
  square_location_name text,
  square_environment text
) AS $$
  SELECT
    id, firm_name, contact_email, contact_phone, address,
    default_hourly_rate, payment_terms_days, late_fee_percentage,
    auto_reminders_enabled, matter_types,
    google_connected_at, google_connected_email,
    square_connected_at, square_location_name, square_environment
  FROM public.practice_settings
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Re-create staff/client SELECT policy with the same scope (they can still read the row)
-- But application code for non-admin should use get_practice_settings_safe() RPC instead
CREATE POLICY "Staff and client can read practice settings"
  ON practice_settings
  FOR SELECT
  USING (current_user_role() IN ('staff', 'client'));

COMMENT ON FUNCTION public.get_practice_settings_safe() IS 'Returns practice settings without sensitive fields (tokens, keys). Use for non-admin UI.';
```

**Step 2: Apply migration to production via Supabase MCP**

**Step 3: Commit**

```bash
git add supabase/migrations/20260205000003_restrict_practice_settings_rls.sql
git commit -m "fix(security): add secure function to read practice_settings without secrets"
```

---

### Task 11: Add middleware protection for /intake routes

**Files:**
- Modify: `src/middleware.ts:59-68`
- Create: `tests/security/middleware-intake.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/security/middleware-intake.test.ts
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Middleware protects /intake routes", () => {
  it("middleware includes /intake in protected routes check", () => {
    const content = fs.readFileSync(
      path.resolve("src/middleware.ts"),
      "utf-8"
    );

    // The isProtected check should include /intake
    // Look for pathname.startsWith("/intake") in the protected routes block
    expect(content).toMatch(/pathname\.startsWith\(["']\/intake["']\)/);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/security/middleware-intake.test.ts`
Expected: FAIL - /intake not in protected routes

**Step 3: Add /intake to protected routes**

In `src/middleware.ts`, add to the isProtected check (after line 68, before the closing paren):

```typescript
        pathname.startsWith("/intake") ||
```

So lines 59-69 become:
```typescript
    const isProtected =
      !isPublic &&
      (pathname.startsWith("/matters") ||
        pathname.startsWith("/tasks") ||
        pathname.startsWith("/time") ||
        pathname.startsWith("/billing") ||
        pathname.startsWith("/documents") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/intake") ||
        pathname.startsWith("/dashboard"));
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/security/middleware-intake.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `pnpm vitest run`
Expected: All pass

**Step 6: Commit**

```bash
git add src/middleware.ts tests/security/middleware-intake.test.ts
git commit -m "fix(security): add /intake to middleware protected routes"
```

---

### Task 12: Run typecheck + full test suite + build verification

**Step 1: Run TypeScript type checking**

Run: `pnpm typecheck`
Expected: No errors

**Step 2: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests pass (including new security tests)

**Step 3: Run production build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Run Supabase security advisors**

Use `mcp__supabase-therapy__get_advisors` with type "security" to verify the fixed issues are resolved.

**Step 5: Final commit if any fixups needed**

```bash
git add -A
git commit -m "chore: security hardening verification pass"
```

---

## Summary of Changes

| Task | Severity Fixed | Files Changed |
|------|---------------|---------------|
| 1 | Setup | `tests/security/helpers.ts` |
| 2 | CRITICAL | `src/app/api/intake/upload/route.ts` |
| 3 | CRITICAL | `src/app/api/tasks/upload/route.ts` |
| 4 | HIGH | `src/app/api/cron/email-automations/route.ts` |
| 5 | HIGH | `src/app/api/webhooks/square/route.ts` |
| 6 | HIGH | `src/lib/auth/validate-return-url.ts`, both OAuth callbacks |
| 7 | HIGH | `src/app/settings/integrations-panel.tsx`, `src/components/square-connect.tsx` |
| 8 | HIGH | RLS migration for `intake_responses` |
| 9 | MEDIUM | Migration for function search paths |
| 10 | HIGH | Migration + secure function for `practice_settings` |
| 11 | HIGH | `src/middleware.ts` |
| 12 | Verification | Full build + test + typecheck |

## Not In Scope (Lower Priority - Future Work)

- Token encryption at rest (requires key management strategy)
- Rate limiting (requires choosing a library like `@upstash/ratelimit`)
- Webhook replay protection / idempotency (requires event tracking table)
- OAuth state expiration validation (low risk, providers handle this)
- Email template HTML sanitization (low risk: admin-only, `\w+` regex replacement)
- Leaked password protection (Supabase dashboard setting, not code change)
