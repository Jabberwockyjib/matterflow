# Minimum Billing Increment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add configurable minimum billing increments that round time entries up to the nearest billing unit (default 6 minutes).

**Architecture:** Add `billing_increment_minutes` to `practice_settings`, rename `duration_minutes` to `actual_duration_minutes` and add `billable_duration_minutes` to `time_entries`. Calculate billable duration when timer stops. Show both values in toast and time entry list.

**Tech Stack:** Supabase (Postgres), Next.js Server Actions, React (sonner toast), TypeScript

---

## Task 1: Database Migration - Add billing_increment_minutes to practice_settings

**Files:**
- Create: `supabase/migrations/20260204000001_add_billing_increment.sql`

**Step 1: Write the migration**

```sql
-- Add billing increment setting to practice_settings
-- Default 6 minutes (0.1 hour) - industry standard for legal billing

ALTER TABLE practice_settings
ADD COLUMN billing_increment_minutes integer DEFAULT 6;

-- Add comment
COMMENT ON COLUMN practice_settings.billing_increment_minutes IS 'Minimum billing increment in minutes. Time entries are rounded up to nearest increment. Default 6 (0.1 hour).';
```

**Step 2: Apply migration locally**

Run:
```bash
docker exec -i matterflow-db psql -U postgres -d postgres < supabase/migrations/20260204000001_add_billing_increment.sql
```

Expected: `ALTER TABLE` success

**Step 3: Commit**

```bash
git add supabase/migrations/20260204000001_add_billing_increment.sql
git commit -m "feat(db): add billing_increment_minutes to practice_settings"
```

---

## Task 2: Database Migration - Add billable duration to time_entries

**Files:**
- Create: `supabase/migrations/20260204000002_add_billable_duration.sql`

**Step 1: Write the migration**

```sql
-- Add billable_duration_minutes to time_entries
-- Keeps actual duration in duration_minutes, stores rounded billable time separately

ALTER TABLE time_entries
ADD COLUMN billable_duration_minutes integer;

-- Backfill existing entries: set billable = actual (no retroactive rounding)
UPDATE time_entries
SET billable_duration_minutes = duration_minutes
WHERE duration_minutes IS NOT NULL;

-- Add comments
COMMENT ON COLUMN time_entries.duration_minutes IS 'Actual duration in minutes (raw time worked)';
COMMENT ON COLUMN time_entries.billable_duration_minutes IS 'Billable duration in minutes (rounded up to billing increment)';
```

**Step 2: Apply migration locally**

Run:
```bash
docker exec -i matterflow-db psql -U postgres -d postgres < supabase/migrations/20260204000002_add_billable_duration.sql
```

Expected: `ALTER TABLE` and `UPDATE` success

**Step 3: Commit**

```bash
git add supabase/migrations/20260204000002_add_billable_duration.sql
git commit -m "feat(db): add billable_duration_minutes to time_entries"
```

---

## Task 3: Regenerate TypeScript Types

**Files:**
- Modify: `src/types/database.types.ts`

**Step 1: Regenerate types from local database**

Run:
```bash
pnpm supabase gen types typescript --local > src/types/database.types.ts
```

**Step 2: Verify new columns appear**

Search for `billing_increment_minutes` and `billable_duration_minutes` in the generated file.

**Step 3: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore: regenerate database types"
```

---

## Task 4: Add Billing Rounding Utility Function

**Files:**
- Create: `src/lib/billing/utils.ts`
- Create: `tests/lib/billing/utils.test.ts`

**Step 1: Write the failing tests**

```typescript
// tests/lib/billing/utils.test.ts
import { describe, it, expect } from "vitest";
import { calculateBillableDuration } from "@/lib/billing/utils";

describe("calculateBillableDuration", () => {
  describe("with 6-minute increment (default)", () => {
    it("rounds 1 minute up to 6", () => {
      expect(calculateBillableDuration(1, 6)).toBe(6);
    });

    it("keeps 6 minutes as 6", () => {
      expect(calculateBillableDuration(6, 6)).toBe(6);
    });

    it("rounds 7 minutes up to 12", () => {
      expect(calculateBillableDuration(7, 6)).toBe(12);
    });

    it("rounds 20 minutes up to 24", () => {
      expect(calculateBillableDuration(20, 6)).toBe(24);
    });
  });

  describe("with 15-minute increment", () => {
    it("rounds 3 minutes up to 15", () => {
      expect(calculateBillableDuration(3, 15)).toBe(15);
    });

    it("keeps 15 minutes as 15", () => {
      expect(calculateBillableDuration(15, 15)).toBe(15);
    });

    it("rounds 20 minutes up to 30", () => {
      expect(calculateBillableDuration(20, 15)).toBe(30);
    });

    it("rounds 21 minutes up to 30", () => {
      expect(calculateBillableDuration(21, 15)).toBe(30);
    });
  });

  describe("with 1-minute increment (no rounding)", () => {
    it("keeps 3 minutes as 3", () => {
      expect(calculateBillableDuration(3, 1)).toBe(3);
    });

    it("keeps 7 minutes as 7", () => {
      expect(calculateBillableDuration(7, 1)).toBe(7);
    });
  });

  describe("edge cases", () => {
    it("handles 0 minutes", () => {
      expect(calculateBillableDuration(0, 6)).toBe(0);
    });

    it("handles null increment by returning actual", () => {
      expect(calculateBillableDuration(7, null)).toBe(7);
    });

    it("handles undefined increment by returning actual", () => {
      expect(calculateBillableDuration(7, undefined)).toBe(7);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test tests/lib/billing/utils.test.ts`

Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
// src/lib/billing/utils.ts

/**
 * Calculate billable duration by rounding up to the nearest billing increment.
 *
 * @param actualMinutes - The actual time worked in minutes
 * @param incrementMinutes - The billing increment (e.g., 6 for 0.1 hour billing)
 * @returns The billable duration rounded up to the nearest increment
 *
 * @example
 * calculateBillableDuration(7, 6)  // returns 12 (rounds up to next 6-min increment)
 * calculateBillableDuration(6, 6)  // returns 6 (exact match)
 * calculateBillableDuration(20, 15) // returns 30 (rounds up to next 15-min increment)
 */
export function calculateBillableDuration(
  actualMinutes: number,
  incrementMinutes: number | null | undefined
): number {
  // No rounding if no increment set or increment is 1 or less
  if (!incrementMinutes || incrementMinutes <= 1) {
    return actualMinutes;
  }

  // Handle 0 minutes
  if (actualMinutes === 0) {
    return 0;
  }

  // Round up to nearest increment
  return Math.ceil(actualMinutes / incrementMinutes) * incrementMinutes;
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/lib/billing/utils.test.ts`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/billing/utils.ts tests/lib/billing/utils.test.ts
git commit -m "feat: add calculateBillableDuration utility function"
```

---

## Task 5: Update PracticeSettings Type and Query

**Files:**
- Modify: `src/lib/data/queries.ts` (lines 1122-1135, 1143-1160)

**Step 1: Update the PracticeSettings type**

Find the `PracticeSettings` type around line 1122 and add `billingIncrementMinutes`:

```typescript
export type PracticeSettings = {
  id: string;
  firmName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  defaultHourlyRate: number | null;
  paymentTermsDays: number;
  lateFeePercentage: number;
  autoRemindersEnabled: boolean;
  matterTypes: string[];
  billingIncrementMinutes: number;  // Add this line
  createdAt: string;
  updatedAt: string;
};
```

**Step 2: Update the mock data in getPracticeSettings**

Find the mock return around line 1143 and add `billingIncrementMinutes: 6`:

```typescript
return {
  data: {
    id: "mock-settings",
    firmName: "Mock Law Firm",
    contactEmail: "contact@mocklaw.com",
    contactPhone: "(555) 123-4567",
    address: "123 Main St, Suite 100\nMock City, MC 12345",
    defaultHourlyRate: 250.0,
    paymentTermsDays: 30,
    lateFeePercentage: 5.0,
    autoRemindersEnabled: true,
    billingIncrementMinutes: 6,  // Add this line
    matterTypes: [
      "Contract Review",
      "Employment Agreement",
      "Policy Review",
      "Litigation",
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  source: "mock" as const,
};
```

**Step 3: Update the data transformation**

Find where `data` is transformed to `PracticeSettings` (around line 1178) and add mapping:

```typescript
// In the return statement where data is mapped
billingIncrementMinutes: data.billing_increment_minutes ?? 6,
```

**Step 4: Run typecheck**

Run: `pnpm typecheck`

Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/data/queries.ts
git commit -m "feat: add billingIncrementMinutes to PracticeSettings type and query"
```

---

## Task 6: Update stopTimer Action to Calculate Billable Duration

**Files:**
- Modify: `src/lib/data/actions.ts` (stopTimer function around line 2090)

**Step 1: Import the utility and update stopTimer**

Add import at top of file:
```typescript
import { calculateBillableDuration } from "@/lib/billing/utils";
```

Replace the `stopTimer` function:

```typescript
export async function stopTimer(
  entryId: string,
  notes?: string
): Promise<{ error?: string; actualMinutes?: number; billableMinutes?: number }> {
  try {
    const supabase = supabaseAdmin();

    // Get the time entry to calculate duration
    const { data: entry, error: fetchError } = await supabase
      .from("time_entries")
      .select("started_at")
      .eq("id", entryId)
      .single();

    if (fetchError || !entry) {
      return { error: fetchError?.message || "Time entry not found" };
    }

    // Calculate actual duration
    const startedAt = new Date(entry.started_at);
    const endedAt = new Date();
    const actualMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

    // Get billing increment from practice settings
    const { data: settings } = await supabase
      .from("practice_settings")
      .select("billing_increment_minutes")
      .maybeSingle();

    const billingIncrement = settings?.billing_increment_minutes ?? 6;
    const billableMinutes = calculateBillableDuration(actualMinutes, billingIncrement);

    // Update the time entry with ended_at, actual duration, and billable duration
    const { error } = await supabase
      .from("time_entries")
      .update({
        ended_at: endedAt.toISOString(),
        duration_minutes: actualMinutes,
        billable_duration_minutes: billableMinutes,
        description: notes || undefined,
      })
      .eq("id", entryId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/time");
    return { actualMinutes, billableMinutes };
  } catch (error) {
    console.error("stopTimer error:", error);
    return { error: "Failed to stop timer" };
  }
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`

Expected: No errors (or only pre-existing errors)

**Step 3: Commit**

```bash
git add src/lib/data/actions.ts
git commit -m "feat: calculate billable duration when stopping timer"
```

---

## Task 7: Update Timer Context to Show Toast with Billable Duration

**Files:**
- Modify: `src/contexts/timer-context.tsx` (stop callback around line 767)

**Step 1: Update the stop function to handle the new return value**

Find the `stop` callback and update the stopTimer call handling to show a toast. First add import at top:

```typescript
import { toast } from "sonner";
```

Then update the success handling in the `stop` callback (after line ~818 where we dispatch STOP):

```typescript
// Success - update local state
dispatch({ type: "STOP" });
setIsModalOpen(false);

// Show toast with billing info
if (result.actualMinutes !== undefined && result.billableMinutes !== undefined) {
  if (result.actualMinutes === result.billableMinutes) {
    toast.success(`Time logged: ${result.billableMinutes} min`);
  } else {
    toast.success(`Time logged: ${result.actualMinutes} min actual → ${result.billableMinutes} min billed`);
  }
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`

Expected: No errors

**Step 3: Run tests**

Run: `pnpm test tests/contexts`

Expected: Tests pass (or only pre-existing failures)

**Step 4: Commit**

```bash
git add src/contexts/timer-context.tsx
git commit -m "feat: show toast with actual and billable duration when timer stops"
```

---

## Task 8: Add Billing Increment Setting to Practice Settings Form

**Files:**
- Modify: `src/app/settings/practice-settings-form.tsx`

**Step 1: Add state for billing increment**

Add after the other useState declarations (around line 30):

```typescript
const [billingIncrementMinutes, setBillingIncrementMinutes] = useState(
  settings?.billingIncrementMinutes?.toString() || "6"
);
```

**Step 2: Add to the form submission**

In the `handleBillingDefaultsSubmit` function, add to the updatePracticeSettings call:

```typescript
const result = await updatePracticeSettings({
  defaultHourlyRate: defaultHourlyRate ? parseFloat(defaultHourlyRate) : undefined,
  paymentTermsDays: parseInt(paymentTermsDays),
  lateFeePercentage: parseFloat(lateFeePercentage),
  autoRemindersEnabled,
  billingIncrementMinutes: parseInt(billingIncrementMinutes),  // Add this line
});
```

**Step 3: Add the UI field**

Add after the `defaultHourlyRate` field (around line 175):

```tsx
<div>
  <Label htmlFor="billingIncrementMinutes">Minimum Billing Increment</Label>
  <select
    id="billingIncrementMinutes"
    value={billingIncrementMinutes}
    onChange={(e) => setBillingIncrementMinutes(e.target.value)}
    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <option value="1">1 minute (no rounding)</option>
    <option value="5">5 minutes</option>
    <option value="6">6 minutes (0.1 hour)</option>
    <option value="10">10 minutes</option>
    <option value="15">15 minutes (0.25 hour)</option>
  </select>
  <p className="text-xs text-slate-500 mt-1">
    Time entries are rounded up to the nearest increment for billing
  </p>
</div>
```

**Step 4: Run typecheck**

Run: `pnpm typecheck`

Expected: May have error about billingIncrementMinutes not in updatePracticeSettings params

**Step 5: Commit**

```bash
git add src/app/settings/practice-settings-form.tsx
git commit -m "feat: add billing increment setting to practice settings form"
```

---

## Task 9: Update updatePracticeSettings Action

**Files:**
- Modify: `src/lib/data/actions.ts` (updatePracticeSettings function)

**Step 1: Find and update the function signature**

Search for `updatePracticeSettings` and add `billingIncrementMinutes` to the params type and update logic:

```typescript
// In the params type
billingIncrementMinutes?: number;

// In the update object construction
if (data.billingIncrementMinutes !== undefined) {
  updateData.billing_increment_minutes = data.billingIncrementMinutes;
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/data/actions.ts
git commit -m "feat: add billingIncrementMinutes to updatePracticeSettings action"
```

---

## Task 10: Update TimeEntrySummary Type

**Files:**
- Modify: `src/lib/data/queries.ts` (TimeEntrySummary type around line 43)

**Step 1: Add billableDurationMinutes to the type**

```typescript
export type TimeEntrySummary = {
  id: string;
  matterId: string;
  taskId: string | null;
  status: string;
  description: string | null;
  durationMinutes: number | null;
  billableDurationMinutes: number | null;  // Add this line
  startedAt: string;
  endedAt: string | null;
};
```

**Step 2: Update any query functions that return TimeEntrySummary**

Search for places that map time_entries to TimeEntrySummary and add:

```typescript
billableDurationMinutes: entry.billable_duration_minutes,
```

**Step 3: Run typecheck**

Run: `pnpm typecheck`

Expected: No errors (may need to fix mapping in multiple places)

**Step 4: Commit**

```bash
git add src/lib/data/queries.ts
git commit -m "feat: add billableDurationMinutes to TimeEntrySummary type"
```

---

## Task 11: Update Time Entry Display in UI

**Files:**
- Find and modify time entry display components (likely in `src/app/time/page.tsx` or similar)

**Step 1: Search for time entry display**

Run: `grep -r "durationMinutes" src/app src/components --include="*.tsx"`

Find where time entries are displayed and update to show both values.

**Step 2: Update display format**

Where duration is shown, update to:

```tsx
{entry.billableDurationMinutes && entry.durationMinutes !== entry.billableDurationMinutes ? (
  <span>
    {entry.billableDurationMinutes} min
    <span className="text-slate-400 text-sm ml-1">
      (actual: {entry.durationMinutes} min)
    </span>
  </span>
) : (
  <span>{entry.durationMinutes || entry.billableDurationMinutes || 0} min</span>
)}
```

**Step 3: Run the app and verify visually**

Run: `pnpm dev`

Navigate to time entries, start/stop a timer, verify toast shows correctly.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: display both actual and billable duration in time entry list"
```

---

## Task 12: Apply Migrations to Production

**Step 1: Apply billing_increment migration**

Use the Supabase MCP to run:
```sql
ALTER TABLE practice_settings
ADD COLUMN IF NOT EXISTS billing_increment_minutes integer DEFAULT 6;
```

**Step 2: Apply billable_duration migration**

Use the Supabase MCP to run:
```sql
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS billable_duration_minutes integer;

UPDATE time_entries
SET billable_duration_minutes = duration_minutes
WHERE duration_minutes IS NOT NULL AND billable_duration_minutes IS NULL;
```

**Step 3: Verify with query**

```sql
SELECT billing_increment_minutes FROM practice_settings LIMIT 1;
SELECT id, duration_minutes, billable_duration_minutes FROM time_entries LIMIT 5;
```

---

## Task 13: Final Integration Test

**Step 1: Manual test flow**

1. Go to Settings → Practice → Billing Defaults
2. Verify "Minimum Billing Increment" dropdown appears with 6 minutes selected
3. Change to 15 minutes, save
4. Start a timer on any matter
5. Wait ~20 seconds, stop timer
6. Verify toast shows "1 min actual → 15 min billed"
7. Go to Time page, verify entry shows "15 min (actual: 1 min)"

**Step 2: Commit final changes**

```bash
git add -A
git commit -m "feat: complete minimum billing increment feature"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | DB migration: billing_increment_minutes | migration SQL |
| 2 | DB migration: billable_duration_minutes | migration SQL |
| 3 | Regenerate TypeScript types | database.types.ts |
| 4 | Billing rounding utility + tests | utils.ts, utils.test.ts |
| 5 | Update PracticeSettings type/query | queries.ts |
| 6 | Update stopTimer action | actions.ts |
| 7 | Update timer context for toast | timer-context.tsx |
| 8 | Add setting to practice form | practice-settings-form.tsx |
| 9 | Update updatePracticeSettings action | actions.ts |
| 10 | Update TimeEntrySummary type | queries.ts |
| 11 | Update time entry display | time page components |
| 12 | Apply migrations to production | Supabase MCP |
| 13 | Integration test | Manual verification |
