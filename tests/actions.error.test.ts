import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMatter } from "@/lib/data/actions";
import * as auth from "@/lib/auth/server";
import * as server from "@/lib/supabase/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockInsert = vi.fn().mockResolvedValue({ error: { message: "boom" } });
const mockSupabase = {
  from: vi.fn(() => ({ insert: mockInsert })),
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
    } as unknown as ReturnType<typeof auth.getSessionWithProfile>);
  });

  it("returns error when Supabase insert fails", async () => {
    const form = new FormData();
    form.set("title", "Test");
    const res = await createMatter(form);
    expect(res?.error).toBe("boom");
  });
});
