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
          single: vi.fn(() => ({ data: null, error: { message: "not found" } })),
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

  it("returns 401 when no session and no invite code", async () => {
    mockGetSession.mockResolvedValue(MOCK_NO_SESSION);

    const formData = new FormData();
    formData.append("matterId", "test-matter-id");
    formData.append("file", createMockFile());

    // Use mock request object so formData() doesn't hang in jsdom
    const request = {
      method: "POST",
      url: "http://localhost/api/intake/upload",
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue(formData),
    };

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toMatch(/unauthorized|sign in/i);
  });

  it("returns 401 when no session and invalid invite code", async () => {
    mockGetSession.mockResolvedValue(MOCK_NO_SESSION);

    const formData = new FormData();
    formData.append("matterId", "test-matter-id");
    formData.append("file", createMockFile());
    formData.append("inviteCode", "INVALID-CODE");

    const request = {
      method: "POST",
      url: "http://localhost/api/intake/upload",
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue(formData),
    };

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toMatch(/unauthorized|invalid/i);
  });

  it("allows authenticated client to upload", async () => {
    mockGetSession.mockResolvedValue(MOCK_CLIENT_SESSION);

    const formData = new FormData();
    formData.append("matterId", "test-matter-id");
    formData.append("file", createMockFile());

    const request = {
      method: "POST",
      url: "http://localhost/api/intake/upload",
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue(formData),
    };

    const response = await POST(request as any);
    // Should not be 401 - proves auth check passed
    expect(response.status).not.toBe(401);
    // Should proceed past auth (400 = Google Drive not connected, 403 = IDOR check with null mock, 500 = other mock issues)
    expect([400, 403, 500]).toContain(response.status);
  });
});
