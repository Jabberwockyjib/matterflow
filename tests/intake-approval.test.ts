/**
 * Test: Intake Form Approval Flow
 *
 * Verifies that approving an intake form:
 * 1. Updates intake_response status to "approved"
 * 2. Advances matter stage from "Intake Received" to "Under Review"
 * 3. Sets responsible_party to "lawyer"
 * 4. Sets next_action to "Begin document review"
 * 5. Sets next_action_due_date to 2 days from approval
 * 6. Creates audit log entry
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { approveIntakeForm } from "@/lib/intake/actions";
import { supabaseAdmin } from "@/lib/supabase/server";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { matter_id: "mock-matter-id" },
                error: null,
              })
            ),
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { stage: "Intake Received" },
              error: null,
            })
          ),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

vi.mock("@/lib/auth/server", () => ({
  getSessionWithProfile: vi.fn(() =>
    Promise.resolve({
      session: {
        user: {
          id: "mock-user-id",
          email: "test@example.com",
        },
      },
    })
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("approveIntakeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update intake response status to approved", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase/server");
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { matter_id: "mock-matter-id" },
              error: null,
            })
          ),
        })),
      })),
    }));

    const mockFrom = vi.fn((table: string) => {
      if (table === "intake_responses") {
        return { update: mockUpdate };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { stage: "Intake Received" },
                error: null,
              })
            ),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
    });

    vi.mocked(supabaseAdmin).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof supabaseAdmin>);

    const result = await approveIntakeForm("mock-intake-id");

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      status: "approved",
      updated_at: expect.any(String),
    });
  });

  it("should advance matter to Under Review with correct fields", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase/server");

    let matterUpdateCalled = false;
    let matterUpdateData: any = null;

    const mockFrom = vi.fn((table: string) => {
      if (table === "intake_responses") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { matter_id: "mock-matter-id" },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      }

      if (table === "matters") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { stage: "Intake Received" },
                  error: null,
                })
              ),
            })),
          })),
          update: vi.fn((data: any) => {
            matterUpdateCalled = true;
            matterUpdateData = data;
            return {
              eq: vi.fn(() => Promise.resolve({ error: null })),
            };
          }),
        };
      }

      // audit_logs
      return {
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
    });

    vi.mocked(supabaseAdmin).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof supabaseAdmin>);

    const result = await approveIntakeForm("mock-intake-id");

    expect(result).toEqual({ ok: true });
    expect(matterUpdateCalled).toBe(true);
    expect(matterUpdateData).toMatchObject({
      stage: "Under Review",
      responsible_party: "lawyer",
      next_action: "Begin document review",
      updated_at: expect.any(String),
    });

    // Verify due date is 2 days in the future
    const expectedDueDate = new Date();
    expectedDueDate.setDate(expectedDueDate.getDate() + 2);
    const expectedDateStr = expectedDueDate.toISOString().split("T")[0];
    expect(matterUpdateData.next_action_due_date).toBe(expectedDateStr);
  });

  it("should create audit log entry", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase/server");

    let auditLogData: any = null;

    const mockFrom = vi.fn((table: string) => {
      if (table === "intake_responses") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { matter_id: "mock-matter-id" },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      }

      if (table === "matters") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { stage: "Intake Received" },
                  error: null,
                })
              ),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }

      // audit_logs
      return {
        insert: vi.fn((data: any) => {
          auditLogData = data;
          return Promise.resolve({ data: null, error: null });
        }),
      };
    });

    vi.mocked(supabaseAdmin).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof supabaseAdmin>);

    const result = await approveIntakeForm("mock-intake-id");

    expect(result).toEqual({ ok: true });
    expect(auditLogData).toMatchObject({
      actor_id: "mock-user-id",
      event_type: "intake_form_approved",
      entity_type: "matter",
      entity_id: "mock-matter-id",
      metadata: {
        intake_response_id: "mock-intake-id",
        approved_at: expect.any(String),
      },
    });
  });

  it("should not update matter if stage is not Intake Received", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase/server");

    let matterUpdateCalled = false;

    const mockFrom = vi.fn((table: string) => {
      if (table === "intake_responses") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { matter_id: "mock-matter-id" },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      }

      if (table === "matters") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { stage: "Under Review" }, // Already advanced
                  error: null,
                })
              ),
            })),
          })),
          update: vi.fn(() => {
            matterUpdateCalled = true;
            return {
              eq: vi.fn(() => Promise.resolve({ error: null })),
            };
          }),
        };
      }

      // audit_logs
      return {
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
    });

    vi.mocked(supabaseAdmin).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof supabaseAdmin>);

    const result = await approveIntakeForm("mock-intake-id");

    expect(result).toEqual({ ok: true });
    expect(matterUpdateCalled).toBe(false); // Should not update matter
  });

  it("should return error if matter update fails", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase/server");

    const mockFrom = vi.fn((table: string) => {
      if (table === "intake_responses") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { matter_id: "mock-matter-id" },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      }

      if (table === "matters") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { stage: "Intake Received" },
                  error: null,
                })
              ),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                error: { message: "Database error" },
              })
            ),
          })),
        };
      }

      return {
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
    });

    vi.mocked(supabaseAdmin).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof supabaseAdmin>);

    const result = await approveIntakeForm("mock-intake-id");

    expect(result).toEqual({
      error: "Failed to update matter status. Please try again.",
    });
  });
});
