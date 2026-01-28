import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  deleteMatter,
  deleteTask,
  deleteTimeEntry,
  updateTimeEntry,
  searchMatters,
} from "@/lib/data/actions";
import * as auth from "@/lib/auth/server";
import * as server from "@/lib/supabase/server";

// Setup mocks
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

const mockDelete = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: "test-id", started_at: new Date().toISOString() }, error: null }),
  }),
  ilike: vi.fn().mockReturnValue({
    limit: vi.fn().mockResolvedValue({
      data: [
        { id: "1", title: "Test Matter", client: { full_name: "John Doe" } },
      ],
      error: null,
    }),
  }),
});

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === "audit_logs") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return {
      update: mockUpdate,
      delete: mockDelete,
      select: mockSelect,
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
        }),
      }),
    };
  }),
};

const asMockAdmin = () => mockSupabase as unknown as ReturnType<typeof server.supabaseAdmin>;

describe("delete actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(server, "supabaseEnvReady").mockReturnValue(true);
    vi.spyOn(server, "supabaseAdmin").mockReturnValue(asMockAdmin());
    vi.spyOn(auth, "getSessionWithProfile").mockResolvedValue({
      session: { user: { id: "user-1" } } as unknown as auth.SessionProfile,
      profile: { role: "admin", full_name: "Admin" },
    } as unknown as Awaited<ReturnType<typeof auth.getSessionWithProfile>>);
  });

  describe("deleteMatter", () => {
    it("deletes a matter successfully", async () => {
      const form = new FormData();
      form.set("id", "matter-123");

      const res = await deleteMatter(form);

      expect(res?.ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("matters");
    });

  });

  describe("deleteTask", () => {
    it("deletes a task successfully", async () => {
      const form = new FormData();
      form.set("id", "task-123");

      const res = await deleteTask(form);

      expect(res?.ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("tasks");
    });
  });

  describe("deleteTimeEntry", () => {
    it("deletes a time entry successfully", async () => {
      const form = new FormData();
      form.set("id", "time-123");

      const res = await deleteTimeEntry(form);

      expect(res?.ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("time_entries");
    });
  });
});

describe("updateTimeEntry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(server, "supabaseEnvReady").mockReturnValue(true);
    vi.spyOn(server, "supabaseAdmin").mockReturnValue(asMockAdmin());
    vi.spyOn(auth, "getSessionWithProfile").mockResolvedValue({
      session: { user: { id: "user-1" } } as unknown as auth.SessionProfile,
      profile: { role: "admin", full_name: "Admin" },
    } as unknown as Awaited<ReturnType<typeof auth.getSessionWithProfile>>);
  });

  it("updates a time entry successfully", async () => {
    const form = new FormData();
    form.set("id", "time-123");
    form.set("minutes", "30");
    form.set("description", "Updated description");

    const res = await updateTimeEntry(form);

    expect(res?.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("time_entries");
  });

});

describe("staff authorization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(server, "supabaseEnvReady").mockReturnValue(true);
    vi.spyOn(server, "supabaseAdmin").mockReturnValue(asMockAdmin());
  });

  it("allows staff users for mutations", async () => {
    vi.spyOn(auth, "getSessionWithProfile").mockResolvedValue({
      session: { user: { id: "user-1" } } as unknown as auth.SessionProfile,
      profile: { role: "staff", full_name: "Staff User" },
    } as unknown as Awaited<ReturnType<typeof auth.getSessionWithProfile>>);

    const form = new FormData();
    form.set("id", "task-123");

    const res = await deleteTask(form);

    expect(res?.ok).toBe(true);
  });

  it("allows admin users for mutations", async () => {
    vi.spyOn(auth, "getSessionWithProfile").mockResolvedValue({
      session: { user: { id: "user-1" } } as unknown as auth.SessionProfile,
      profile: { role: "admin", full_name: "Admin User" },
    } as unknown as Awaited<ReturnType<typeof auth.getSessionWithProfile>>);

    const form = new FormData();
    form.set("id", "matter-123");

    const res = await deleteMatter(form);

    expect(res?.ok).toBe(true);
  });
});
