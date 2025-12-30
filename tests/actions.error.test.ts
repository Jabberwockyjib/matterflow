import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMatter } from "@/lib/data/actions";
import * as auth from "@/lib/auth/server";
import * as server from "@/lib/supabase/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'audit_logs') {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { full_name: 'Test Client' },
              error: null
            }),
          }),
        }),
      };
    }
    return { insert: mockInsert };
  }),
};

const asMockAdmin = () => mockSupabase as unknown as ReturnType<typeof server.supabaseAdmin>;

describe("data actions errors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockInsert.mockClear();
    vi.spyOn(server, "supabaseEnvReady").mockReturnValue(true);
    vi.spyOn(server, "supabaseAdmin").mockReturnValue(asMockAdmin());
    vi.spyOn(auth, "getSessionWithProfile").mockResolvedValue({
      session: { user: { id: "user-1" } } as unknown as auth.SessionProfile,
      profile: { role: "admin", full_name: "Admin" },
    } as unknown as Awaited<ReturnType<typeof auth.getSessionWithProfile>>);
  });

  it("returns error when Supabase insert fails", async () => {
    const form = new FormData();
    form.set("title", "Test");
    form.set("ownerId", "user-1");
    form.set("nextAction", "Review");
    form.set("nextActionDueDate", "2025-01-15");
    const res = await createMatter(form);
    expect(res?.error).toBe("boom");
  });
});
