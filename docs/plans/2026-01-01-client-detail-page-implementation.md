# Client Detail Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build admin client detail/edit page with contact fields and profile management

**Architecture:** Two-column detail page with editable contact form on left, read-only context (matters, intakes, info requests) on right. Entry points from /clients page, /admin/users dropdown, and pipeline cards.

**Tech Stack:** Next.js 15 App Router, Supabase, React Hook Form, Zod, shadcn/ui, Tailwind CSS

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260101000001_add_client_contact_fields.sql`

**Step 1: Create migration file**

```sql
-- Add contact fields to profiles table for client management
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_secondary text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_secondary_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_contact_method text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS internal_notes text;

-- Add check constraints for enum-like fields
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_type_check
  CHECK (phone_type IS NULL OR phone_type IN ('mobile', 'business', 'home'));
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_secondary_type_check
  CHECK (phone_secondary_type IS NULL OR phone_secondary_type IN ('mobile', 'business', 'home'));
ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_contact_method_check
  CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'phone', 'text'));

COMMENT ON COLUMN profiles.phone IS 'Primary phone number';
COMMENT ON COLUMN profiles.phone_type IS 'Type: mobile, business, or home';
COMMENT ON COLUMN profiles.internal_notes IS 'Private notes visible only to staff/admin';
```

**Step 2: Apply migration**

Run: `supabase db push`
Expected: Migration applied successfully

**Step 3: Regenerate TypeScript types**

Run: `supabase gen types typescript --local > src/types/database.types.ts`
Expected: Types file updated with new columns

**Step 4: Commit**

```bash
git add supabase/migrations/20260101000001_add_client_contact_fields.sql src/types/database.types.ts
git commit -m "feat: add client contact fields to profiles table"
```

---

## Task 2: Validation Schema

**Files:**
- Modify: `src/lib/validation/schemas.ts`
- Create: `tests/lib/validation/client-profile-schemas.test.ts`

**Step 1: Write failing test**

```typescript
// tests/lib/validation/client-profile-schemas.test.ts
import { describe, it, expect } from "vitest";
import { updateClientProfileSchema, phoneTypeValues, preferredContactMethodValues } from "@/lib/validation/schemas";

describe("updateClientProfileSchema", () => {
  it("accepts valid client profile data", () => {
    const data = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      phone: "555-123-4567",
      phoneType: "mobile",
      companyName: "Acme Corp",
      addressStreet: "123 Main St",
      addressCity: "Springfield",
      addressState: "IL",
      addressZip: "62701",
      preferredContactMethod: "email",
    };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("requires valid UUID for userId", () => {
    const data = { userId: "not-a-uuid" };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("validates phone type enum", () => {
    const data = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      phoneType: "invalid",
    };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("validates preferred contact method enum", () => {
    const data = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      preferredContactMethod: "carrier_pigeon",
    };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("enforces max length on internal notes", () => {
    const data = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      internalNotes: "x".repeat(10001),
    };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("allows all fields to be optional except userId", () => {
    const data = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
    };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("phoneTypeValues", () => {
  it("has correct values", () => {
    expect(phoneTypeValues).toContain("mobile");
    expect(phoneTypeValues).toContain("business");
    expect(phoneTypeValues).toContain("home");
    expect(phoneTypeValues.length).toBe(3);
  });
});

describe("preferredContactMethodValues", () => {
  it("has correct values", () => {
    expect(preferredContactMethodValues).toContain("email");
    expect(preferredContactMethodValues).toContain("phone");
    expect(preferredContactMethodValues).toContain("text");
    expect(preferredContactMethodValues.length).toBe(3);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/validation/client-profile-schemas.test.ts`
Expected: FAIL - updateClientProfileSchema not found

**Step 3: Add schema to schemas.ts**

Add to `src/lib/validation/schemas.ts` after the intake schemas section:

```typescript
// ============================================================================
// Client Profile Schemas
// ============================================================================

export const phoneTypeValues = ["mobile", "business", "home"] as const;
export const preferredContactMethodValues = ["email", "phone", "text"] as const;

/**
 * Schema for updating client profile contact information
 */
export const updateClientProfileSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID" }),
  phone: z.string().optional(),
  phoneType: z.enum(phoneTypeValues).optional(),
  phoneSecondary: z.string().optional(),
  phoneSecondaryType: z.enum(phoneTypeValues).optional(),
  companyName: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  addressCountry: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  preferredContactMethod: z.enum(preferredContactMethodValues).optional(),
  internalNotes: z.string().max(10000, "Notes cannot exceed 10,000 characters").optional(),
});

export type UpdateClientProfileData = z.infer<typeof updateClientProfileSchema>;
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/validation/client-profile-schemas.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/validation/schemas.ts tests/lib/validation/client-profile-schemas.test.ts
git commit -m "feat: add client profile validation schema"
```

---

## Task 3: Query Functions

**Files:**
- Modify: `src/lib/data/queries.ts`
- Create: `tests/lib/data/client-profile-queries.test.ts`

**Step 1: Write failing test**

```typescript
// tests/lib/data/client-profile-queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase before importing queries
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: vi.fn(),
  supabaseEnvReady: vi.fn(() => true),
}));

vi.mock("@/lib/auth/server", () => ({
  getSessionWithProfile: vi.fn(() => Promise.resolve({
    session: { user: { id: "admin-user-id" } },
    profile: { role: "admin" },
  })),
}));

import { getClientProfile, getActiveClients } from "@/lib/data/queries";
import { supabaseAdmin } from "@/lib/supabase/server";

describe("getClientProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns client profile with matters, intakes, and info requests", async () => {
    const mockProfile = {
      user_id: "client-123",
      full_name: "John Smith",
      email: "john@example.com",
      role: "client",
      phone: "555-1234",
      company_name: "Acme Corp",
    };

    const mockMatters = [
      { id: "matter-1", title: "Contract Review", stage: "Under Review" },
    ];

    const mockIntakes = [
      { id: "intake-1", form_type: "Contract Review", status: "submitted" },
    ];

    const mockInfoRequests = [
      { id: "ir-1", status: "pending", questions: [] },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: "john@example.com" } },
            error: null
          }),
        },
      },
    };

    // Need to chain different results for different tables
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        };
      }
      if (table === "matters") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockMatters, error: null }),
        };
      }
      if (table === "intake_responses") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockIntakes, error: null }),
        };
      }
      if (table === "info_requests") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockInfoRequests, error: null }),
        };
      }
      return mockSupabase;
    });

    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);

    const result = await getClientProfile("client-123");

    expect(result.success).toBe(true);
    expect(result.data?.profile.fullName).toBe("John Smith");
  });

  it("returns error for non-existent user", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
    };

    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);

    const result = await getClientProfile("nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("getActiveClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of clients with matter counts", async () => {
    const mockClients = [
      {
        user_id: "client-1",
        full_name: "John Smith",
        email: "john@example.com",
        role: "client",
        matter_count: 2,
        last_activity: "2026-01-01T00:00:00Z",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockClients, error: null }),
    };

    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);

    const result = await getActiveClients();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].fullName).toBe("John Smith");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/data/client-profile-queries.test.ts`
Expected: FAIL - getClientProfile not found

**Step 3: Add query functions to queries.ts**

Add types near top of `src/lib/data/queries.ts`:

```typescript
export type ClientProfile = {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  phone: string | null;
  phoneType: string | null;
  phoneSecondary: string | null;
  phoneSecondaryType: string | null;
  companyName: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  addressCountry: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  preferredContactMethod: string | null;
  internalNotes: string | null;
  createdAt: string;
};

export type ClientMatterSummary = {
  id: string;
  title: string;
  stage: string;
  matterType: string;
  createdAt: string;
};

export type ClientIntakeSummary = {
  id: string;
  formType: string;
  status: string;
  submittedAt: string | null;
};

export type ClientInfoRequestSummary = {
  id: string;
  status: string;
  questionCount: number;
  createdAt: string;
  respondedAt: string | null;
};

export type ClientProfileResult = {
  success: boolean;
  data?: {
    profile: ClientProfile;
    matters: ClientMatterSummary[];
    intakes: ClientIntakeSummary[];
    infoRequests: ClientInfoRequestSummary[];
  };
  error?: string;
};

export type ActiveClient = {
  userId: string;
  email: string;
  fullName: string | null;
  matterCount: number;
  lastActivity: string | null;
};

export type ActiveClientsResult = {
  success: boolean;
  data?: ActiveClient[];
  error?: string;
};
```

Add functions at end of `src/lib/data/queries.ts`:

```typescript
// ============================================================================
// Client Profile Queries
// ============================================================================

export async function getClientProfile(userId: string): Promise<ClientProfileResult> {
  if (!supabaseEnvReady()) {
    return { success: false, error: "Database not configured" };
  }

  try {
    const supabase = supabaseAdmin();

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Client not found" };
    }

    // Get email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email || "";

    // Get matters for this client
    const { data: matters } = await supabase
      .from("matters")
      .select("id, title, stage, matter_type, created_at")
      .eq("client_id", userId)
      .order("created_at", { ascending: false });

    // Get intake responses via matters
    const matterIds = (matters || []).map((m) => m.id);
    let intakes: any[] = [];
    if (matterIds.length > 0) {
      const { data: intakeData } = await supabase
        .from("intake_responses")
        .select("id, form_type, status, submitted_at, matter_id")
        .in("matter_id", matterIds);
      intakes = intakeData || [];
    }

    // Get info requests for intakes
    const intakeIds = intakes.map((i) => i.id);
    let infoRequests: any[] = [];
    if (intakeIds.length > 0) {
      const { data: irData } = await supabase
        .from("info_requests")
        .select("id, status, questions, created_at, responded_at, intake_response_id")
        .in("intake_response_id", intakeIds);
      infoRequests = irData || [];
    }

    return {
      success: true,
      data: {
        profile: {
          userId: profile.user_id,
          email,
          fullName: profile.full_name,
          role: profile.role,
          phone: profile.phone,
          phoneType: profile.phone_type,
          phoneSecondary: profile.phone_secondary,
          phoneSecondaryType: profile.phone_secondary_type,
          companyName: profile.company_name,
          addressStreet: profile.address_street,
          addressCity: profile.address_city,
          addressState: profile.address_state,
          addressZip: profile.address_zip,
          addressCountry: profile.address_country,
          emergencyContactName: profile.emergency_contact_name,
          emergencyContactPhone: profile.emergency_contact_phone,
          preferredContactMethod: profile.preferred_contact_method,
          internalNotes: profile.internal_notes,
          createdAt: profile.created_at,
        },
        matters: (matters || []).map((m) => ({
          id: m.id,
          title: m.title,
          stage: m.stage,
          matterType: m.matter_type,
          createdAt: m.created_at,
        })),
        intakes: intakes.map((i) => ({
          id: i.id,
          formType: i.form_type,
          status: i.status,
          submittedAt: i.submitted_at,
        })),
        infoRequests: infoRequests.map((ir) => ({
          id: ir.id,
          status: ir.status,
          questionCount: Array.isArray(ir.questions) ? ir.questions.length : 0,
          createdAt: ir.created_at,
          respondedAt: ir.responded_at,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching client profile:", error);
    return { success: false, error: "Failed to fetch client profile" };
  }
}

export async function getActiveClients(): Promise<ActiveClientsResult> {
  if (!supabaseEnvReady()) {
    return { success: false, error: "Database not configured" };
  }

  try {
    const supabase = supabaseAdmin();

    // Get all client profiles
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, role, created_at")
      .eq("role", "client")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Get emails and matter counts for each client
    const clients: ActiveClient[] = [];
    for (const profile of profiles || []) {
      // Get email
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email || "";

      // Get matter count
      const { count } = await supabase
        .from("matters")
        .select("id", { count: "exact", head: true })
        .eq("client_id", profile.user_id);

      // Get last activity (most recent matter update)
      const { data: lastMatter } = await supabase
        .from("matters")
        .select("updated_at")
        .eq("client_id", profile.user_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      clients.push({
        userId: profile.user_id,
        email,
        fullName: profile.full_name,
        matterCount: count || 0,
        lastActivity: lastMatter?.updated_at || profile.created_at,
      });
    }

    return { success: true, data: clients };
  } catch (error) {
    console.error("Error fetching active clients:", error);
    return { success: false, error: "Failed to fetch active clients" };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/data/client-profile-queries.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/data/queries.ts tests/lib/data/client-profile-queries.test.ts
git commit -m "feat: add client profile query functions"
```

---

## Task 4: Server Action

**Files:**
- Modify: `src/lib/data/actions.ts`
- Create: `tests/lib/data/client-profile-actions.test.ts`

**Step 1: Write failing test**

```typescript
// tests/lib/data/client-profile-actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: vi.fn(),
  supabaseEnvReady: vi.fn(() => true),
}));

vi.mock("@/lib/auth/server", () => ({
  getSessionWithProfile: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateClientProfile } from "@/lib/data/actions";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";

describe("updateClientProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates client profile successfully", async () => {
    vi.mocked(getSessionWithProfile).mockResolvedValue({
      session: { user: { id: "admin-id" } },
      profile: { role: "admin", user_id: "admin-id" },
    } as any);

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);

    const formData = new FormData();
    formData.set("userId", "123e4567-e89b-12d3-a456-426614174000");
    formData.set("phone", "555-123-4567");
    formData.set("companyName", "Acme Corp");

    const result = await updateClientProfile(formData);

    expect(result.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSupabase.update).toHaveBeenCalled();
  });

  it("rejects clients from updating", async () => {
    vi.mocked(getSessionWithProfile).mockResolvedValue({
      session: { user: { id: "client-id" } },
      profile: { role: "client", user_id: "client-id" },
    } as any);

    const formData = new FormData();
    formData.set("userId", "123e4567-e89b-12d3-a456-426614174000");

    const result = await updateClientProfile(formData);

    expect(result.error).toContain("Forbidden");
  });

  it("validates input data", async () => {
    vi.mocked(getSessionWithProfile).mockResolvedValue({
      session: { user: { id: "admin-id" } },
      profile: { role: "admin", user_id: "admin-id" },
    } as any);

    const formData = new FormData();
    formData.set("userId", "not-a-uuid");

    const result = await updateClientProfile(formData);

    expect(result.ok).toBeFalsy();
    expect(result.error).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/data/client-profile-actions.test.ts`
Expected: FAIL - updateClientProfile not found

**Step 3: Add import and action to actions.ts**

Add to imports at top of `src/lib/data/actions.ts`:

```typescript
import { updateClientProfileSchema } from "@/lib/validation/schemas";
```

Add action at end of `src/lib/data/actions.ts`:

```typescript
// ============================================================================
// Client Profile Actions
// ============================================================================

export async function updateClientProfile(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    const rawData = {
      userId: formData.get("userId") as string,
      phone: formData.get("phone") as string || undefined,
      phoneType: formData.get("phoneType") as string || undefined,
      phoneSecondary: formData.get("phoneSecondary") as string || undefined,
      phoneSecondaryType: formData.get("phoneSecondaryType") as string || undefined,
      companyName: formData.get("companyName") as string || undefined,
      addressStreet: formData.get("addressStreet") as string || undefined,
      addressCity: formData.get("addressCity") as string || undefined,
      addressState: formData.get("addressState") as string || undefined,
      addressZip: formData.get("addressZip") as string || undefined,
      addressCountry: formData.get("addressCountry") as string || undefined,
      emergencyContactName: formData.get("emergencyContactName") as string || undefined,
      emergencyContactPhone: formData.get("emergencyContactPhone") as string || undefined,
      preferredContactMethod: formData.get("preferredContactMethod") as string || undefined,
      internalNotes: formData.get("internalNotes") as string || undefined,
    };

    const parsed = updateClientProfileSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Validation failed" };
    }

    const { userId, ...profileData } = parsed.data;

    // Build update object with only defined values
    const updateData: Record<string, string | null> = {};
    if (profileData.phone !== undefined) updateData.phone = profileData.phone || null;
    if (profileData.phoneType !== undefined) updateData.phone_type = profileData.phoneType || null;
    if (profileData.phoneSecondary !== undefined) updateData.phone_secondary = profileData.phoneSecondary || null;
    if (profileData.phoneSecondaryType !== undefined) updateData.phone_secondary_type = profileData.phoneSecondaryType || null;
    if (profileData.companyName !== undefined) updateData.company_name = profileData.companyName || null;
    if (profileData.addressStreet !== undefined) updateData.address_street = profileData.addressStreet || null;
    if (profileData.addressCity !== undefined) updateData.address_city = profileData.addressCity || null;
    if (profileData.addressState !== undefined) updateData.address_state = profileData.addressState || null;
    if (profileData.addressZip !== undefined) updateData.address_zip = profileData.addressZip || null;
    if (profileData.addressCountry !== undefined) updateData.address_country = profileData.addressCountry || null;
    if (profileData.emergencyContactName !== undefined) updateData.emergency_contact_name = profileData.emergencyContactName || null;
    if (profileData.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = profileData.emergencyContactPhone || null;
    if (profileData.preferredContactMethod !== undefined) updateData.preferred_contact_method = profileData.preferredContactMethod || null;
    if (profileData.internalNotes !== undefined) updateData.internal_notes = profileData.internalNotes || null;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating client profile:", error);
      return { error: "Failed to update client profile" };
    }

    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "client_profile_updated",
      entityType: "profile",
      entityId: userId,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    revalidatePath(`/clients/${userId}`);
    revalidatePath("/clients");

    return { ok: true };
  } catch (error) {
    console.error("Error in updateClientProfile:", error);
    return { error: "An unexpected error occurred" };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/data/client-profile-actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/data/actions.ts tests/lib/data/client-profile-actions.test.ts
git commit -m "feat: add updateClientProfile server action"
```

---

## Task 5: Client Profile Form Component

**Files:**
- Create: `src/components/clients/client-profile-form.tsx`

**Step 1: Create the component**

```typescript
// src/components/clients/client-profile-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateClientProfileSchema, type UpdateClientProfileData, phoneTypeValues, preferredContactMethodValues } from "@/lib/validation/schemas";
import { updateClientProfile } from "@/lib/data/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

interface ClientProfileFormProps {
  userId: string;
  initialData: {
    phone?: string | null;
    phoneType?: string | null;
    phoneSecondary?: string | null;
    phoneSecondaryType?: string | null;
    companyName?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressZip?: string | null;
    addressCountry?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    preferredContactMethod?: string | null;
    internalNotes?: string | null;
  };
  onSaved?: () => void;
}

export function ClientProfileForm({ userId, initialData, onSaved }: ClientProfileFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<UpdateClientProfileData>({
    resolver: zodResolver(updateClientProfileSchema),
    defaultValues: {
      userId,
      phone: initialData.phone || "",
      phoneType: (initialData.phoneType as any) || undefined,
      phoneSecondary: initialData.phoneSecondary || "",
      phoneSecondaryType: (initialData.phoneSecondaryType as any) || undefined,
      companyName: initialData.companyName || "",
      addressStreet: initialData.addressStreet || "",
      addressCity: initialData.addressCity || "",
      addressState: initialData.addressState || "",
      addressZip: initialData.addressZip || "",
      addressCountry: initialData.addressCountry || "",
      emergencyContactName: initialData.emergencyContactName || "",
      emergencyContactPhone: initialData.emergencyContactPhone || "",
      preferredContactMethod: (initialData.preferredContactMethod as any) || undefined,
      internalNotes: initialData.internalNotes || "",
    },
  });

  const onSubmit = async (data: UpdateClientProfileData) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.set(key, String(value));
        }
      });

      const result = await updateClientProfile(formData);

      if (result.ok) {
        setSuccess(true);
        onSaved?.();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to save");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Phone Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900">Phone</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Primary Phone</Label>
            <Input
              id="phone"
              {...form.register("phone")}
              placeholder="555-123-4567"
            />
          </div>
          <div>
            <Label htmlFor="phoneType">Type</Label>
            <Select
              value={form.watch("phoneType") || ""}
              onValueChange={(value) => form.setValue("phoneType", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {phoneTypeValues.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phoneSecondary">Secondary Phone</Label>
            <Input
              id="phoneSecondary"
              {...form.register("phoneSecondary")}
              placeholder="555-987-6543"
            />
          </div>
          <div>
            <Label htmlFor="phoneSecondaryType">Type</Label>
            <Select
              value={form.watch("phoneSecondaryType") || ""}
              onValueChange={(value) => form.setValue("phoneSecondaryType", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {phoneTypeValues.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Company */}
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          {...form.register("companyName")}
          placeholder="Acme Corp"
        />
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900">Address</h3>
        <div>
          <Label htmlFor="addressStreet">Street Address</Label>
          <Input
            id="addressStreet"
            {...form.register("addressStreet")}
            placeholder="123 Main St"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="addressCity">City</Label>
            <Input
              id="addressCity"
              {...form.register("addressCity")}
              placeholder="Springfield"
            />
          </div>
          <div>
            <Label htmlFor="addressState">State</Label>
            <Input
              id="addressState"
              {...form.register("addressState")}
              placeholder="IL"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="addressZip">ZIP Code</Label>
            <Input
              id="addressZip"
              {...form.register("addressZip")}
              placeholder="62701"
            />
          </div>
          <div>
            <Label htmlFor="addressCountry">Country</Label>
            <Input
              id="addressCountry"
              {...form.register("addressCountry")}
              placeholder="USA"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900">Emergency Contact</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergencyContactName">Name</Label>
            <Input
              id="emergencyContactName"
              {...form.register("emergencyContactName")}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Phone</Label>
            <Input
              id="emergencyContactPhone"
              {...form.register("emergencyContactPhone")}
              placeholder="555-111-2222"
            />
          </div>
        </div>
      </div>

      {/* Preferred Contact Method */}
      <div>
        <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
        <Select
          value={form.watch("preferredContactMethod") || ""}
          onValueChange={(value) => form.setValue("preferredContactMethod", value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select preferred method" />
          </SelectTrigger>
          <SelectContent>
            {preferredContactMethodValues.map((method) => (
              <SelectItem key={method} value={method}>
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Internal Notes */}
      <div>
        <Label htmlFor="internalNotes">Internal Notes</Label>
        <p className="text-xs text-slate-500 mb-1">Only visible to staff</p>
        <Textarea
          id="internalNotes"
          {...form.register("internalNotes")}
          placeholder="Notes about this client..."
          rows={4}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
        {success && (
          <span className="text-sm text-green-600">Changes saved successfully</span>
        )}
        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/clients/client-profile-form.tsx
git commit -m "feat: add ClientProfileForm component"
```

---

## Task 6: Read-Only Context Components

**Files:**
- Create: `src/components/clients/client-matters-list.tsx`
- Create: `src/components/clients/client-intakes-list.tsx`
- Create: `src/components/clients/client-info-requests-list.tsx`

**Step 1: Create ClientMattersList**

```typescript
// src/components/clients/client-matters-list.tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { ClientMatterSummary } from "@/lib/data/queries";

interface ClientMattersListProps {
  matters: ClientMatterSummary[];
}

const stageBadgeColors: Record<string, string> = {
  "Lead Created": "bg-slate-100 text-slate-700",
  "Intake Sent": "bg-yellow-100 text-yellow-800",
  "Intake Received": "bg-blue-100 text-blue-800",
  "Under Review": "bg-purple-100 text-purple-800",
  "Waiting on Client": "bg-orange-100 text-orange-800",
  "Completed": "bg-green-100 text-green-800",
  "Archived": "bg-gray-100 text-gray-600",
  "Declined": "bg-red-100 text-red-800",
};

export function ClientMattersList({ matters }: ClientMattersListProps) {
  if (matters.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No matters yet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {matters.map((matter) => (
        <li key={matter.id} className="py-3">
          <Link
            href={`/matters/${matter.id}`}
            className="block hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {matter.title}
                </p>
                <p className="text-xs text-slate-500">{matter.matterType}</p>
              </div>
              <Badge className={stageBadgeColors[matter.stage] || "bg-slate-100"}>
                {matter.stage}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

**Step 2: Create ClientIntakesList**

```typescript
// src/components/clients/client-intakes-list.tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import type { ClientIntakeSummary } from "@/lib/data/queries";

interface ClientIntakesListProps {
  intakes: ClientIntakeSummary[];
}

const statusBadgeColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
};

export function ClientIntakesList({ intakes }: ClientIntakesListProps) {
  if (intakes.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No intake submissions</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {intakes.map((intake) => (
        <li key={intake.id} className="py-3">
          <Link
            href={`/admin/intake/${intake.id}`}
            className="block hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {intake.formType}
                </p>
                {intake.submittedAt && (
                  <p className="text-xs text-slate-500">
                    Submitted {new Date(intake.submittedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge className={statusBadgeColors[intake.status] || "bg-slate-100"}>
                {intake.status}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

**Step 3: Create ClientInfoRequestsList**

```typescript
// src/components/clients/client-info-requests-list.tsx
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import type { ClientInfoRequestSummary } from "@/lib/data/queries";

interface ClientInfoRequestsListProps {
  infoRequests: ClientInfoRequestSummary[];
}

const statusBadgeColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  responded: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
};

export function ClientInfoRequestsList({ infoRequests }: ClientInfoRequestsListProps) {
  if (infoRequests.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No info requests</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {infoRequests.map((ir) => (
        <li key={ir.id} className="py-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">
                {ir.questionCount} question{ir.questionCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-slate-500">
                Sent {new Date(ir.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge className={statusBadgeColors[ir.status] || "bg-slate-100"}>
              {ir.status}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/clients/client-matters-list.tsx src/components/clients/client-intakes-list.tsx src/components/clients/client-info-requests-list.tsx
git commit -m "feat: add client context list components"
```

---

## Task 7: Client Detail Page

**Files:**
- Create: `src/app/clients/[userId]/page.tsx`
- Create: `src/app/clients/[userId]/client-detail-client.tsx`

**Step 1: Create server page component**

```typescript
// src/app/clients/[userId]/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, User } from "lucide-react";
import { getClientProfile } from "@/lib/data/queries";
import { ClientDetailClient } from "./client-detail-client";

interface ClientDetailPageProps {
  params: Promise<{ userId: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { userId } = await params;

  const result = await getClientProfile(userId);

  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Not Found</h2>
          <p className="text-red-700">Client not found</p>
          <Link
            href="/clients"
            className="inline-flex items-center mt-4 text-red-800 hover:text-red-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  const { profile, matters, intakes, infoRequests } = result.data;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/clients"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Clients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <User className="h-8 w-8" />
              {profile.fullName || "Unnamed Client"}
            </h1>
            <p className="text-slate-600 flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4" />
              {profile.email}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ClientDetailClient
        profile={profile}
        matters={matters}
        intakes={intakes}
        infoRequests={infoRequests}
      />
    </div>
  );
}
```

**Step 2: Create client component**

```typescript
// src/app/clients/[userId]/client-detail-client.tsx
"use client";

import { ClientProfileForm } from "@/components/clients/client-profile-form";
import { ClientMattersList } from "@/components/clients/client-matters-list";
import { ClientIntakesList } from "@/components/clients/client-intakes-list";
import { ClientInfoRequestsList } from "@/components/clients/client-info-requests-list";
import type {
  ClientProfile,
  ClientMatterSummary,
  ClientIntakeSummary,
  ClientInfoRequestSummary,
} from "@/lib/data/queries";

interface ClientDetailClientProps {
  profile: ClientProfile;
  matters: ClientMatterSummary[];
  intakes: ClientIntakeSummary[];
  infoRequests: ClientInfoRequestSummary[];
}

export function ClientDetailClient({
  profile,
  matters,
  intakes,
  infoRequests,
}: ClientDetailClientProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Editable Form */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Contact Information
          </h2>
          <ClientProfileForm
            userId={profile.userId}
            initialData={{
              phone: profile.phone,
              phoneType: profile.phoneType,
              phoneSecondary: profile.phoneSecondary,
              phoneSecondaryType: profile.phoneSecondaryType,
              companyName: profile.companyName,
              addressStreet: profile.addressStreet,
              addressCity: profile.addressCity,
              addressState: profile.addressState,
              addressZip: profile.addressZip,
              addressCountry: profile.addressCountry,
              emergencyContactName: profile.emergencyContactName,
              emergencyContactPhone: profile.emergencyContactPhone,
              preferredContactMethod: profile.preferredContactMethod,
              internalNotes: profile.internalNotes,
            }}
          />
        </div>
      </div>

      {/* Right Column - Read-Only Context */}
      <div className="space-y-6">
        {/* Matters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Associated Matters
          </h2>
          <ClientMattersList matters={matters} />
        </div>

        {/* Intakes */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Intake Submissions
          </h2>
          <ClientIntakesList intakes={intakes} />
        </div>

        {/* Info Requests */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Info Requests
          </h2>
          <ClientInfoRequestsList infoRequests={infoRequests} />
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/clients/[userId]/page.tsx src/app/clients/[userId]/client-detail-client.tsx
git commit -m "feat: add client detail page"
```

---

## Task 8: Active Clients Table

**Files:**
- Create: `src/components/clients/active-clients-table.tsx`
- Modify: `src/components/clients/active-clients-section.tsx`

**Step 1: Create ActiveClientsTable**

```typescript
// src/components/clients/active-clients-table.tsx
"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Eye, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { ActiveClient } from "@/lib/data/queries";

interface ActiveClientsTableProps {
  clients: ActiveClient[];
}

export function ActiveClientsTable({ clients }: ActiveClientsTableProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No active clients yet</p>
        <p className="text-sm mt-1">Invite your first client to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-center">Matters</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.userId}>
              <TableCell className="font-medium">
                {client.fullName || "Unnamed"}
              </TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell className="text-center">{client.matterCount}</TableCell>
              <TableCell>
                {client.lastActivity
                  ? format(new Date(client.lastActivity), "MMM d, yyyy")
                  : "Never"}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/clients/${client.userId}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Step 2: Update ActiveClientsSection**

```typescript
// src/components/clients/active-clients-section.tsx
import { getActiveClients } from "@/lib/data/queries";
import { ActiveClientsTable } from "./active-clients-table";

export async function ActiveClientsSection() {
  const result = await getActiveClients();

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">
        Active Clients
      </h2>
      <ActiveClientsTable clients={result.data || []} />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/clients/active-clients-table.tsx src/components/clients/active-clients-section.tsx
git commit -m "feat: add ActiveClientsTable component"
```

---

## Task 9: Update Admin Users Dropdown

**Files:**
- Modify: `src/components/admin/user-table.tsx`

**Step 1: Add View Client Details menu item**

In `src/components/admin/user-table.tsx`, add after line 21 imports:

```typescript
import Link from "next/link";
```

Then add after line 118 (inside DropdownMenuContent, before "Change to Admin"):

```typescript
{user.role === "client" && (
  <>
    <DropdownMenuItem asChild>
      <Link href={`/clients/${user.userId}`}>
        View Client Details
      </Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
  </>
)}
```

**Step 2: Commit**

```bash
git add src/components/admin/user-table.tsx
git commit -m "feat: add View Client Details to admin users dropdown"
```

---

## Task 10: Run Tests and Verify Build

**Step 1: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 2: Run type check**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 4: Test build**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address test/lint/build issues"
```

---

## Summary

This plan implements:
1. Database migration for 14 new profile columns
2. Zod validation schema with tests
3. Query functions for client profile and active clients
4. Server action for updating client profiles with audit logging
5. ClientProfileForm with React Hook Form
6. Read-only context components (matters, intakes, info requests)
7. Client detail page at `/clients/[userId]`
8. ActiveClientsTable replacing placeholder
9. View Client Details in admin users dropdown

Total: 10 tasks, ~15-20 commits
