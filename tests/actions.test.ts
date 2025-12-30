import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createInvoice,
  createMatter,
  createTask,
  createTimeEntry,
  stopTimeEntry,
  updateInvoiceStatus,
  updateMatterStage,
  updateTaskStatus,
} from "@/lib/data/actions";
import * as auth from "@/lib/auth/server";
import * as server from "@/lib/supabase/server";

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
  }),
});

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === "time_entries") {
      return {
        insert: mockInsert,
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { started_at: new Date().toISOString() } }),
          }),
        }),
      };
    }
    if (table === "audit_logs") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: "Test Client", user_id: "client-id" }, error: null }),
          }),
        }),
      };
    }
    return {
      insert: mockInsert,
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    };
  }),
};

const asMockAdmin = () => mockSupabase as unknown as ReturnType<typeof server.supabaseAdmin>;

describe("data actions", () => {
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

  it("creates matter", async () => {
    const form = new FormData();
    form.set("title", "Test Matter");
    form.set("billingModel", "hourly");
    form.set("ownerId", "user-1");
    form.set("nextAction", "Initial consultation");
    form.set("nextActionDueDate", "2025-01-15");
    const res = await createMatter(form);
    expect(res?.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("matters");
  });

  it("creates task", async () => {
    const form = new FormData();
    form.set("title", "Task");
    form.set("matterId", "123");
    const res = await createTask(form);
    expect(res?.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("tasks");
  });

  it("creates invoice", async () => {
    const form = new FormData();
    form.set("matterId", "123");
    form.set("amount", "10");
    const res = await createInvoice(form);
    expect(res?.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("invoices");
  });

  it("creates time entry", async () => {
    const form = new FormData();
    form.set("matterId", "123");
    form.set("minutes", "15");
    const res = await createTimeEntry(form);
    expect(res?.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("time_entries");
  });

  it("updates matter stage", async () => {
    const form = new FormData();
    form.set("id", "1");
    form.set("stage", "Under Review");
    form.set("nextAction", "Review documents");
    form.set("nextActionDueDate", "2025-01-15");
    const res = await updateMatterStage(form);
    expect(res?.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("matters");
  });

  it("updates task status", async () => {
    const form = new FormData();
    form.set("id", "1");
    form.set("status", "done");
    const res = await updateTaskStatus(form);
    expect(res?.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("tasks");
  });

  it("updates invoice status", async () => {
    const form = new FormData();
    form.set("id", "1");
    form.set("status", "paid");
    const res = await updateInvoiceStatus(form);
    expect(res?.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("invoices");
  });

  it("stops time entry", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { started_at: new Date().toISOString() },
          }),
        }),
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabase.from as any).mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const form = new FormData();
    form.set("id", "1");
    const res = await stopTimeEntry(form);
    expect(res?.ok).toBe(true);
  });
});
