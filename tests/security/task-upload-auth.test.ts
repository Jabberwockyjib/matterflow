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

    const json = await response.json();
    expect(json.error).toMatch(/unauthorized|sign in/i);
  });

  it("allows authenticated user to proceed past auth check", async () => {
    mockGetSession.mockResolvedValue(MOCK_CLIENT_SESSION);

    // Create a request with a mocked formData method to avoid jsdom hanging
    const mockFormData = new FormData();
    mockFormData.append("matterId", "matter-1");
    mockFormData.append("taskId", "task-1");
    mockFormData.append("file", createMockFile());

    const request = {
      method: "POST",
      formData: vi.fn().mockResolvedValue(mockFormData),
    } as unknown as Request;

    const response = await POST(request as any);
    // Should not be 401 - auth check passed, proceeds to business logic
    expect(response.status).not.toBe(401);
  });
});
