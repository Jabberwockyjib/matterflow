# Intake Automation MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build end-to-end intake automation: lawyer creates matter → client receives email → fills form → auto-advances → lawyer approves on dashboard.

**Architecture:** Enhance existing matter creation flow to auto-populate intake-specific fields, update email template to link to intake form, enhance dashboard with "Needs Review" sections, and add visual indicators for responsibility and stage.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + RLS), React Email, Tailwind CSS, TypeScript

---

## Prerequisites

- Working directory: `/Users/brian/therapy`
- Supabase local instance running (`supabase start`)
- Environment variables configured (`.env.local`)
- Latest code on `main` branch

## Task Breakdown

### Task 1: Database Migration - Add intake_received_at Field

**Files:**
- Create: `supabase/migrations/0003_add_intake_received_at.sql`

**Step 1: Create migration file**

```bash
touch supabase/migrations/0003_add_intake_received_at.sql
```

**Step 2: Write migration SQL**

Add to `supabase/migrations/0003_add_intake_received_at.sql`:

```sql
-- Add intake_received_at timestamp to matters table for tracking when intake was submitted
ALTER TABLE matters
ADD COLUMN intake_received_at TIMESTAMPTZ;

-- Add comment explaining the field
COMMENT ON COLUMN matters.intake_received_at IS 'Timestamp when client submitted intake form';
```

**Step 3: Apply migration locally**

Run:
```bash
supabase migration up
```

Expected output: Migration applied successfully

**Step 4: Regenerate TypeScript types**

Run:
```bash
supabase gen types typescript --local > src/types/database.types.ts
```

Expected: File updated with new `intake_received_at` field

**Step 5: Commit**

```bash
git add supabase/migrations/0003_add_intake_received_at.sql src/types/database.types.ts
git commit -m "feat: add intake_received_at timestamp to matters table"
```

---

### Task 2: Update Matter Creation - Auto-Set Intake Fields

**Files:**
- Modify: `src/lib/data/actions.ts:60-151` (createMatter function)

**Step 1: Read current createMatter function**

Run:
```bash
cat src/lib/data/actions.ts | grep -A 90 "export async function createMatter"
```

Review the function to understand current logic.

**Step 2: Add intake field auto-population logic**

In `src/lib/data/actions.ts`, modify the `createMatter` function around line 66-82:

Replace:
```typescript
const title = (formData.get("title") as string) || "Untitled Matter";
const ownerId = (formData.get("ownerId") as string) || roleCheck.session.user.id;
const clientId = (formData.get("clientId") as string) || null;
const matterType = (formData.get("matterType") as string) || "General";
const billingModel = (formData.get("billingModel") as string) || "hourly";
const responsible = (formData.get("responsibleParty") as string) || "lawyer";
const nextAction = (formData.get("nextAction") as string) || null;
const nextActionDueDate = (formData.get("nextActionDueDate") as string) || null;

// Validation: Next Action and Due Date are required
if (!nextAction) {
  return { error: "Next Action is required" };
}
if (!nextActionDueDate) {
  return { error: "Next Action Due Date is required" };
}
```

With:
```typescript
const title = (formData.get("title") as string) || "Untitled Matter";
const ownerId = (formData.get("ownerId") as string) || roleCheck.session.user.id;
const clientId = (formData.get("clientId") as string) || null;
const matterType = (formData.get("matterType") as string) || "General";
const billingModel = (formData.get("billingModel") as string) || "hourly";

// Auto-populate intake fields when client is specified
let stage = "Lead Created";
let responsible = (formData.get("responsibleParty") as string) || "lawyer";
let nextAction = (formData.get("nextAction") as string) || null;
let nextActionDueDate = (formData.get("nextActionDueDate") as string) || null;

if (clientId) {
  // Client specified - set up for intake automation
  stage = "Intake Sent";
  responsible = "client";
  nextAction = nextAction || "Complete intake form";

  // Default due date: 3 days from now
  if (!nextActionDueDate) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    nextActionDueDate = dueDate.toISOString().split("T")[0];
  }
}

// Validation: Next Action and Due Date are required
if (!nextAction) {
  return { error: "Next Action is required" };
}
if (!nextActionDueDate) {
  return { error: "Next Action Due Date is required" };
}
```

**Step 3: Update matter insert to include stage**

In the same function, around line 83, update the insert:

Replace:
```typescript
const { data: newMatter, error } = await supabase.from("matters").insert({
  title,
  owner_id: ownerId,
  client_id: clientId,
  matter_type: matterType,
  billing_model: billingModel,
  responsible_party: responsible,
  next_action: nextAction,
  next_action_due_date: nextActionDueDate,
}).select("id").single();
```

With:
```typescript
const { data: newMatter, error } = await supabase.from("matters").insert({
  title,
  owner_id: ownerId,
  client_id: clientId,
  matter_type: matterType,
  billing_model: billingModel,
  stage,
  responsible_party: responsible,
  next_action: nextAction,
  next_action_due_date: nextActionDueDate,
}).select("id").single();
```

**Step 4: Test the changes**

Run dev server:
```bash
pnpm dev
```

Navigate to `/matters` and create a matter with a client. Verify in Supabase that stage is "Intake Sent".

**Step 5: Commit**

```bash
git add src/lib/data/actions.ts
git commit -m "feat: auto-set intake fields when matter created with client"
```

---

### Task 3: Update Email Template - Link to Intake Form

**Files:**
- Modify: `src/lib/email/templates/matter-created.tsx`
- Modify: `src/lib/data/actions.ts:128-137` (email sending section)

**Step 1: Update email template to accept intakeLink**

In `src/lib/email/templates/matter-created.tsx`, update the interface and usage:

Replace interface (line 5-12):
```typescript
interface MatterCreatedEmailProps {
  clientName: string;
  matterTitle: string;
  matterType: string;
  lawyerName: string;
  nextAction: string;
  matterLink: string;
}
```

With:
```typescript
interface MatterCreatedEmailProps {
  clientName: string;
  matterTitle: string;
  matterType: string;
  lawyerName: string;
  nextAction: string;
  intakeLink: string;
}
```

**Step 2: Update email copy to focus on intake**

Replace the email body (lines 14-66) with:

```tsx
export const MatterCreatedEmail = ({
  clientName,
  matterTitle,
  matterType,
  lawyerName,
  nextAction,
  intakeLink,
}: MatterCreatedEmailProps) => (
  <BaseLayout
    preview={`Complete your intake form for ${matterTitle}`}
    heading="Complete Your Intake Form"
  >
    <Text style={paragraph}>Hi {clientName},</Text>
    <Text style={paragraph}>
      Welcome! We&apos;re ready to start working on your {matterType}.
    </Text>

    <Text style={paragraph}>
      To get started, please complete your intake form. This helps us understand your situation
      and provide the best possible service.
    </Text>

    <div style={infoBox}>
      <Text style={infoTitle}>What to expect:</Text>
      <Text style={infoItem}>• Takes about 10-15 minutes</Text>
      <Text style={infoItem}>• You can save your progress anytime</Text>
      <Text style={infoItem}>• We&apos;ll review it within 2 business days</Text>
    </div>

    <Button href={intakeLink} style={button}>
      Complete Intake Form
    </Button>

    <Text style={paragraph}>
      Questions? Reply to this email or contact {lawyerName} directly.
    </Text>

    <Text style={paragraph}>
      Thank you,
      <br />
      {lawyerName}
    </Text>
  </BaseLayout>
);
```

**Step 3: Add new styles for info box**

Add after the existing styles (around line 71):

```typescript
const infoBox = {
  backgroundColor: "#f1f5f9",
  borderRadius: "6px",
  padding: "16px",
  margin: "20px 0",
};

const infoTitle = {
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const infoItem = {
  color: "#475569",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
};
```

**Step 4: Update createMatter to pass intakeLink instead of matterLink**

In `src/lib/data/actions.ts`, around line 128-137, update:

Replace:
```typescript
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
await sendMatterCreatedEmail({
  to: clientUser.email,
  clientName: clientProfile.full_name || "Client",
  matterTitle: title,
  matterId,
  matterType,
  lawyerName: ownerProfile?.full_name || "Your Attorney",
  nextAction,
  matterLink: `${appUrl}/matters/${matterId}`,
});
```

With:
```typescript
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
await sendMatterCreatedEmail({
  to: clientUser.email,
  clientName: clientProfile.full_name || "Client",
  matterTitle: title,
  matterId,
  matterType,
  lawyerName: ownerProfile?.full_name || "Your Attorney",
  nextAction,
  intakeLink: `${appUrl}/intake/${matterId}`,
});
```

**Step 5: Update email actions interface**

In `src/lib/email/actions.ts`, around line 54-63, update the interface:

Replace:
```typescript
interface SendMatterCreatedEmailParams {
  to: string;
  clientName: string;
  matterTitle: string;
  matterId: string;
  matterType: string;
  lawyerName: string;
  nextAction: string;
  matterLink: string;
}
```

With:
```typescript
interface SendMatterCreatedEmailParams {
  to: string;
  clientName: string;
  matterTitle: string;
  matterId: string;
  matterType: string;
  lawyerName: string;
  nextAction: string;
  intakeLink: string;
}
```

And update the function call (line 68-75):

Replace:
```typescript
const template = MatterCreatedEmail({
  clientName: params.clientName,
  matterTitle: params.matterTitle,
  matterType: params.matterType,
  lawyerName: params.lawyerName,
  nextAction: params.nextAction,
  matterLink: params.matterLink,
});
```

With:
```typescript
const template = MatterCreatedEmail({
  clientName: params.clientName,
  matterTitle: params.matterTitle,
  matterType: params.matterType,
  lawyerName: params.lawyerName,
  nextAction: params.nextAction,
  intakeLink: params.intakeLink,
});
```

**Step 6: Test email template**

Run email preview server:
```bash
pnpm email
```

Navigate to the MatterCreatedEmail preview and verify the new copy and button link.

**Step 7: Commit**

```bash
git add src/lib/email/templates/matter-created.tsx src/lib/email/actions.ts src/lib/data/actions.ts
git commit -m "feat: update matter created email to link to intake form"
```

---

### Task 4: Update Intake Submission - Set intake_received_at

**Files:**
- Modify: `src/lib/intake/actions.ts:220-236`

**Step 1: Add intake_received_at to matter update**

In `src/lib/intake/actions.ts`, around line 228-236, update the matter stage advancement:

Replace:
```typescript
if (currentMatter?.stage === "Intake Sent") {
  await supabase
    .from("matters")
    .update({
      stage: "Intake Received",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matterId);
}
```

With:
```typescript
const now = new Date().toISOString();

if (currentMatter?.stage === "Intake Sent") {
  await supabase
    .from("matters")
    .update({
      stage: "Intake Received",
      responsible_party: "lawyer",
      next_action: "Review intake form",
      next_action_due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      intake_received_at: now,
      updated_at: now,
    })
    .eq("id", matterId);
}
```

**Step 2: Test intake submission**

Start dev server and navigate to an intake form. Submit it and verify in Supabase that:
- `stage` changed to "Intake Received"
- `responsible_party` changed to "lawyer"
- `next_action` is "Review intake form"
- `intake_received_at` is set

**Step 3: Commit**

```bash
git add src/lib/intake/actions.ts
git commit -m "feat: set intake_received_at and update next action on submission"
```

---

### Task 5: Update Intake Approval - Advance to Under Review

**Files:**
- Modify: `src/lib/intake/actions.ts` (approveIntakeForm function)

**Step 1: Find approveIntakeForm function**

Run:
```bash
grep -n "export async function approveIntakeForm" src/lib/intake/actions.ts
```

Note the line number (should be around line 280-300).

**Step 2: Read current approveIntakeForm implementation**

```bash
sed -n '280,320p' src/lib/intake/actions.ts
```

Review the current implementation.

**Step 3: Update approveIntakeForm to advance matter stage**

After updating the intake_response status (around line 290), add matter update:

```typescript
// Update matter stage to "Under Review"
const { data: matter } = await supabase
  .from("matters")
  .select("stage")
  .eq("id", matterId)
  .single();

if (matter?.stage === "Intake Received") {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 2);

  await supabase
    .from("matters")
    .update({
      stage: "Under Review",
      responsible_party: "lawyer",
      next_action: "Begin document review",
      next_action_due_date: dueDate.toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", matterId);
}
```

**Step 4: Add audit log for approval**

Before the revalidatePath calls, add:

```typescript
// Log approval to audit trail
const { session } = await getSessionWithProfile();
if (session) {
  await supabase.from("audit_logs").insert({
    actor_id: session.user.id,
    event_type: "intake_form_approved",
    entity_type: "matter",
    entity_id: matterId,
    metadata: {
      intake_response_id: intakeResponseId,
      approved_at: new Date().toISOString(),
    } as any,
  });
}
```

**Step 5: Import getSessionWithProfile if not already imported**

At top of file, ensure import exists:

```typescript
import { getSessionWithProfile } from "@/lib/auth/server";
```

**Step 6: Test approval flow**

1. Create matter with client
2. Submit intake form as client
3. Approve intake as lawyer
4. Verify matter advanced to "Under Review"
5. Check audit logs table for approval event

**Step 7: Commit**

```bash
git add src/lib/intake/actions.ts
git commit -m "feat: advance matter to Under Review on intake approval"
```

---

### Task 6: Create Stage Badge Component

**Files:**
- Create: `src/components/ui/stage-badge.tsx`

**Step 1: Create component file**

```bash
touch src/components/ui/stage-badge.tsx
```

**Step 2: Write StageBadge component**

Add to `src/components/ui/stage-badge.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface StageBadgeProps {
  stage: string;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const colors = getStageColors(stage);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors,
        className
      )}
    >
      {stage}
    </span>
  );
}

function getStageColors(stage: string): string {
  switch (stage) {
    case "Intake Sent":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "Intake Received":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "Waiting on Client":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "Under Review":
    case "Conflict Check":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "Completed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    case "Archived":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
  }
}
```

**Step 3: Commit**

```bash
git add src/components/ui/stage-badge.tsx
git commit -m "feat: add StageBadge component with color-coded stages"
```

---

### Task 7: Create Responsibility Icon Component

**Files:**
- Create: `src/components/ui/responsibility-icon.tsx`

**Step 1: Create component file**

```bash
touch src/components/ui/responsibility-icon.tsx
```

**Step 2: Write ResponsibilityIcon component**

Add to `src/components/ui/responsibility-icon.tsx`:

```tsx
import { User, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponsibilityIconProps {
  responsibleParty: "lawyer" | "staff" | "client";
  className?: string;
  showLabel?: boolean;
}

export function ResponsibilityIcon({
  responsibleParty,
  className,
  showLabel = false,
}: ResponsibilityIconProps) {
  const isClient = responsibleParty === "client";
  const Icon = isClient ? Mail : User;
  const label = isClient ? "Client's turn" : "Your turn";
  const colorClass = isClient
    ? "text-blue-600 dark:text-blue-400"
    : "text-amber-600 dark:text-amber-400";

  if (showLabel) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", colorClass, className)}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }

  return <Icon className={cn("h-4 w-4", colorClass, className)} />;
}
```

**Step 3: Commit**

```bash
git add src/components/ui/responsibility-icon.tsx
git commit -m "feat: add ResponsibilityIcon component for matter cards"
```

---

### Task 8: Update Dashboard - Add Needs Attention Section

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/lib/data/queries.ts` (add new query functions)

**Step 1: Add query functions for dashboard sections**

In `src/lib/data/queries.ts`, add at the end:

```typescript
/**
 * Fetch matters awaiting intake review (stage = "Intake Received")
 */
export async function fetchMattersAwaitingReview() {
  const { session } = await getSessionWithProfile();

  if (!session) {
    return { data: [], source: "mock" as const };
  }

  if (!supabaseEnvReady()) {
    return {
      data: MOCK_MATTERS.filter((m) => m.stage === "Intake Received"),
      source: "mock" as const,
    };
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("matters")
    .select("*, profiles:client_id(full_name)")
    .eq("stage", "Intake Received")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching matters awaiting review:", error);
    return { data: [], source: "supabase" as const, error: error.message };
  }

  return {
    data: (data || []).map(mapMatter),
    source: "supabase" as const,
  };
}

/**
 * Fetch matters awaiting client intake (stage = "Intake Sent")
 */
export async function fetchMattersAwaitingIntake() {
  const { session } = await getSessionWithProfile();

  if (!session) {
    return { data: [], source: "mock" as const };
  }

  if (!supabaseEnvReady()) {
    return {
      data: MOCK_MATTERS.filter((m) => m.stage === "Intake Sent"),
      source: "mock" as const,
    };
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("matters")
    .select("*, profiles:client_id(full_name)")
    .eq("stage", "Intake Sent")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching matters awaiting intake:", error);
    return { data: [], source: "supabase" as const, error: error.message };
  }

  return {
    data: (data || []).map(mapMatter),
    source: "supabase" as const,
  };
}

/**
 * Fetch overdue matters where responsible_party = lawyer/staff
 */
export async function fetchOverdueMatters() {
  const { session } = await getSessionWithProfile();

  if (!session) {
    return { data: [], source: "mock" as const };
  }

  if (!supabaseEnvReady()) {
    const today = new Date().toISOString().split("T")[0];
    return {
      data: MOCK_MATTERS.filter(
        (m) => m.nextActionDueDate < today && m.responsibleParty !== "client"
      ),
      source: "mock" as const,
    };
  }

  const supabase = supabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("matters")
    .select("*, profiles:client_id(full_name)")
    .lt("next_action_due_date", today)
    .neq("responsible_party", "client")
    .neq("stage", "Completed")
    .neq("stage", "Archived")
    .order("next_action_due_date", { ascending: true });

  if (error) {
    console.error("Error fetching overdue matters:", error);
    return { data: [], source: "supabase" as const, error: error.message };
  }

  return {
    data: (data || []).map(mapMatter),
    source: "supabase" as const,
  };
}
```

**Step 2: Create NeedsAttention component**

Create file `src/components/dashboard/needs-attention.tsx`:

```tsx
import Link from "next/link";
import { AlertCircle, CheckCircle } from "lucide-react";
import { ContentCard, ContentCardHeader, ContentCardTitle, ContentCardContent } from "@/components/cards/content-card";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/ui/stage-badge";
import type { Matter } from "@/lib/data/queries";
import { formatDueDate, isOverdue } from "@/lib/utils";

interface NeedsAttentionProps {
  awaitingReview: Matter[];
  overdue: Matter[];
}

export function NeedsAttention({ awaitingReview, overdue }: NeedsAttentionProps) {
  const totalItems = awaitingReview.length + overdue.length;

  if (totalItems === 0) {
    return null;
  }

  return (
    <ContentCard className="border-amber-200 dark:border-amber-800">
      <ContentCardHeader>
        <ContentCardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          Needs Your Attention ({totalItems})
        </ContentCardTitle>
      </ContentCardHeader>
      <ContentCardContent>
        {awaitingReview.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              Awaiting Your Review ({awaitingReview.length})
            </h3>
            <div className="space-y-3">
              {awaitingReview.map((matter) => (
                <div
                  key={matter.id}
                  className="rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {matter.clientName} - {matter.matterType}
                        </h4>
                        <StageBadge stage={matter.stage} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDueDate(matter.updatedAt)}
                      </p>
                    </div>
                    <Link href={`/admin/intake?matterId=${matter.id}`}>
                      <Button size="sm" variant="default">
                        Review Intake
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {overdue.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              Overdue Next Actions ({overdue.length})
            </h3>
            <div className="space-y-3">
              {overdue.map((matter) => (
                <div
                  key={matter.id}
                  className="rounded-lg border border-red-200 dark:border-red-800 bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground truncate mb-1">
                        {matter.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-1">
                        Next: {matter.nextAction}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Overdue by {Math.abs(Math.floor((new Date(matter.nextActionDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
                      </p>
                    </div>
                    <Link href={`/matters/${matter.id}`}>
                      <Button size="sm" variant="outline">
                        View Matter
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ContentCardContent>
    </ContentCard>
  );
}
```

**Step 3: Create WaitingOnClient component**

Create file `src/components/dashboard/waiting-on-client.tsx`:

```tsx
import Link from "next/link";
import { Mail } from "lucide-react";
import { ContentCard, ContentCardHeader, ContentCardTitle, ContentCardContent } from "@/components/cards/content-card";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/ui/stage-badge";
import type { Matter } from "@/lib/data/queries";

interface WaitingOnClientProps {
  awaitingIntake: Matter[];
}

export function WaitingOnClient({ awaitingIntake }: WaitingOnClientProps) {
  if (awaitingIntake.length === 0) {
    return null;
  }

  return (
    <ContentCard className="border-blue-200 dark:border-blue-800">
      <ContentCardHeader>
        <ContentCardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Waiting on Client ({awaitingIntake.length})
        </ContentCardTitle>
      </ContentCardHeader>
      <ContentCardContent>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Awaiting Intake ({awaitingIntake.length})
          </h3>
          <div className="space-y-3">
            {awaitingIntake.map((matter) => {
              const daysWaiting = Math.floor(
                (Date.now() - new Date(matter.createdAt).getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={matter.id}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {matter.clientName} - {matter.matterType}
                        </h4>
                        <StageBadge stage={matter.stage} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Sent {daysWaiting} {daysWaiting === 1 ? "day" : "days"} ago
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/matters/${matter.id}`}>
                        <Button size="sm" variant="ghost">
                          View Matter
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ContentCardContent>
    </ContentCard>
  );
}
```

**Step 4: Update dashboard page to use new components**

In `src/app/dashboard/page.tsx`, add imports at top:

```typescript
import { fetchMattersAwaitingReview, fetchMattersAwaitingIntake, fetchOverdueMatters } from "@/lib/data/queries";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { WaitingOnClient } from "@/components/dashboard/waiting-on-client";
```

**Step 5: Fetch data in dashboard page**

In the page component function, add data fetching:

```typescript
const { data: awaitingReview } = await fetchMattersAwaitingReview();
const { data: awaitingIntake } = await fetchMattersAwaitingIntake();
const { data: overdue } = await fetchOverdueMatters();
```

**Step 6: Add sections to dashboard layout**

In the JSX, add sections at the top (before existing content):

```tsx
{/* Needs Attention Section */}
<NeedsAttention awaitingReview={awaitingReview} overdue={overdue} />

{/* Waiting on Client Section */}
<WaitingOnClient awaitingIntake={awaitingIntake} />
```

**Step 7: Test dashboard**

1. Start dev server
2. Navigate to `/dashboard`
3. Verify sections show matters in correct states
4. Create test data to populate each section

**Step 8: Commit**

```bash
git add src/lib/data/queries.ts src/components/dashboard/needs-attention.tsx src/components/dashboard/waiting-on-client.tsx src/app/dashboard/page.tsx
git commit -m "feat: add Needs Attention and Waiting on Client dashboard sections"
```

---

### Task 9: Add Intake Form Auto-Save

**Files:**
- Modify: `src/app/intake/[matterId]/intake-form-client.tsx`

**Step 1: Add auto-save state and effect**

In `src/app/intake/[matterId]/intake-form-client.tsx`, add state for last saved timestamp:

```typescript
const [lastSaved, setLastSaved] = useState<Date | null>(null);
```

**Step 2: Add auto-save effect**

Add useEffect for auto-saving:

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    if (Object.keys(values).length > 0) {
      await saveIntakeFormDraft(matterId, template.name, values);
      setLastSaved(new Date());
    }
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [values, matterId, template.name]);
```

**Step 3: Add last saved indicator to UI**

Add below the form header:

```tsx
{lastSaved && (
  <p className="text-xs text-muted-foreground">
    Last saved: {lastSaved.toLocaleTimeString()}
  </p>
)}
```

**Step 4: Test auto-save**

1. Navigate to intake form
2. Fill some fields
3. Wait 30 seconds
4. Verify "Last saved" appears
5. Refresh page and verify data persisted

**Step 5: Commit**

```bash
git add src/app/intake/[matterId]/intake-form-client.tsx
git commit -m "feat: add auto-save to intake forms every 30 seconds"
```

---

### Task 10: Create Thank You Page for Intake Submission

**Files:**
- Create: `src/app/intake/[matterId]/thank-you/page.tsx`

**Step 1: Create thank-you directory and page**

```bash
mkdir -p src/app/intake/[matterId]/thank-you
touch src/app/intake/[matterId]/thank-you/page.tsx
```

**Step 2: Write thank you page**

Add to `src/app/intake/[matterId]/thank-you/page.tsx`:

```tsx
import { CheckCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

interface ThankYouPageProps {
  params: Promise<{ matterId: string }>;
}

export default async function ThankYouPage({ params }: ThankYouPageProps) {
  const { matterId } = await params;

  // Get matter and lawyer details
  const supabase = supabaseAdmin();
  const { data: matter } = await supabase
    .from("matters")
    .select("title, profiles:owner_id(full_name)")
    .eq("id", matterId)
    .single();

  const lawyerName = (matter?.profiles as any)?.full_name || "your attorney";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Thank You!
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your intake form has been submitted successfully. We&apos;ve notified {lawyerName}.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            You&apos;ll hear from us within <strong>2 business days</strong>.
          </p>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          You can close this window or check your email for confirmation.
        </p>

        <Button
          variant="outline"
          onClick={() => window.close()}
          className="w-full"
        >
          Close Window
        </Button>
      </div>
    </div>
  );
}
```

**Step 3: Update intake form client to redirect on submit**

In `src/app/intake/[matterId]/intake-form-client.tsx`, update the submit handler:

Replace:
```typescript
const result = await submitIntakeForm(matterId, template.name, values);
if (result.error) {
  setError(result.error);
} else {
  // Success - could redirect or show message
}
```

With:
```typescript
const result = await submitIntakeForm(matterId, template.name, values);
if (result.error) {
  setError(result.error);
} else {
  // Redirect to thank you page
  window.location.href = `/intake/${matterId}/thank-you`;
}
```

**Step 4: Test thank you page**

1. Submit an intake form
2. Verify redirect to thank you page
3. Check content displays correctly

**Step 5: Commit**

```bash
git add src/app/intake/[matterId]/thank-you/page.tsx src/app/intake/[matterId]/intake-form-client.tsx
git commit -m "feat: add thank you page after intake submission"
```

---

### Task 11: End-to-End Testing

**Files:**
- Create: `tests/integration/intake-automation.test.tsx`

**Step 1: Create test file**

```bash
touch tests/integration/intake-automation.test.tsx
```

**Step 2: Write integration test**

Add to `tests/integration/intake-automation.test.tsx`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { createMatter } from "@/lib/data/actions";
import { submitIntakeForm, approveIntakeForm } from "@/lib/intake";
import { supabaseAdmin } from "@/lib/supabase/server";

describe("Intake Automation Flow", () => {
  let testMatterId: string;
  let testClientId: string;

  beforeAll(async () => {
    // Create test client
    const { data: { user } } = await supabaseAdmin().auth.admin.createUser({
      email: "testclient@example.com",
      password: "testpass123",
      email_confirm: true,
    });
    testClientId = user!.id;

    // Create profile
    await supabaseAdmin().from("profiles").insert({
      user_id: testClientId,
      full_name: "Test Client",
      role: "client",
    });
  });

  it("should auto-set intake fields when matter created with client", async () => {
    const formData = new FormData();
    formData.append("title", "Test Matter - Intake Automation");
    formData.append("clientId", testClientId);
    formData.append("matterType", "Contract Review");
    formData.append("billingModel", "hourly");
    formData.append("ownerId", testClientId);

    const result = await createMatter(formData);
    expect(result.ok).toBe(true);

    // Fetch created matter
    const { data: matter } = await supabaseAdmin()
      .from("matters")
      .select("*")
      .eq("client_id", testClientId)
      .single();

    testMatterId = matter!.id;

    expect(matter?.stage).toBe("Intake Sent");
    expect(matter?.responsible_party).toBe("client");
    expect(matter?.next_action).toBe("Complete intake form");
    expect(matter?.next_action_due_date).toBeTruthy();
  });

  it("should advance to Intake Received on form submission", async () => {
    const responses = {
      full_name: "Test Client",
      email: "testclient@example.com",
      company_name: "Test Corp",
    };

    const result = await submitIntakeForm(testMatterId, "Contract Review", responses);
    expect(result.ok).toBe(true);

    // Verify matter updated
    const { data: matter } = await supabaseAdmin()
      .from("matters")
      .select("*")
      .eq("id", testMatterId)
      .single();

    expect(matter?.stage).toBe("Intake Received");
    expect(matter?.responsible_party).toBe("lawyer");
    expect(matter?.next_action).toBe("Review intake form");
    expect(matter?.intake_received_at).toBeTruthy();
  });

  it("should advance to Under Review on approval", async () => {
    // Get intake response ID
    const { data: response } = await supabaseAdmin()
      .from("intake_responses")
      .select("id")
      .eq("matter_id", testMatterId)
      .single();

    const result = await approveIntakeForm(response!.id, testMatterId);
    expect(result.ok).toBe(true);

    // Verify matter updated
    const { data: matter } = await supabaseAdmin()
      .from("matters")
      .select("*")
      .eq("id", testMatterId)
      .single();

    expect(matter?.stage).toBe("Under Review");
    expect(matter?.next_action).toBe("Begin document review");
  });
});
```

**Step 3: Run integration test**

```bash
pnpm test tests/integration/intake-automation.test.tsx
```

Expected: All tests pass

**Step 4: Fix any failing tests**

Review test output and fix issues in implementation.

**Step 5: Commit**

```bash
git add tests/integration/intake-automation.test.tsx
git commit -m "test: add integration test for intake automation flow"
```

---

### Task 12: Manual Testing & Verification

**Testing Checklist:**

**Step 1: Matter Creation Flow**
- [ ] Navigate to `/matters`
- [ ] Create matter WITHOUT client → verify stage is "Lead Created", no email sent
- [ ] Create matter WITH client → verify stage is "Intake Sent", email sent
- [ ] Check email inbox → verify subject and intake link

**Step 2: Client Intake Flow**
- [ ] Click intake link from email
- [ ] Verify form loads with matter details
- [ ] Fill some fields and wait 30 seconds → verify auto-save indicator
- [ ] Refresh page → verify draft saved
- [ ] Complete and submit form → verify redirect to thank you page
- [ ] Check Supabase → verify matter stage is "Intake Received"

**Step 3: Lawyer Dashboard**
- [ ] Navigate to `/dashboard`
- [ ] Verify "Needs Your Attention" shows 1 item
- [ ] Click "Review Intake" → verify navigation
- [ ] Verify intake response displays correctly

**Step 4: Intake Approval**
- [ ] On intake review page, click "Approve & Advance"
- [ ] Verify matter advanced to "Under Review"
- [ ] Check dashboard → verify matter removed from "Needs Your Attention"
- [ ] Check audit logs → verify approval logged

**Step 5: Edge Cases**
- [ ] Submit intake with invalid data → verify validation
- [ ] Create overdue matter → verify shows in "Overdue" section
- [ ] Create multiple pending intakes → verify all show in dashboard

**Step 6: Document Issues**

Create `TESTING_NOTES.md` with any issues found:

```markdown
# Intake Automation MVP - Testing Notes

## Issues Found

1. [Issue description]
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Fix applied: [commit hash]

## Verified Working

- [Feature] ✅
- [Feature] ✅
```

**Step 7: Commit testing notes**

```bash
git add TESTING_NOTES.md
git commit -m "docs: add testing notes for intake automation MVP"
```

---

### Task 13: Documentation Updates

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Step 1: Update CLAUDE.md with intake automation details**

In `CLAUDE.md`, add section after "## Intake Form System":

```markdown
### Intake Automation Flow

**Automatic intake workflow** for solo practitioners:

1. **Matter Creation** → Auto-sets stage to "Intake Sent" when client specified
2. **Client Email** → Automatic email with intake form link
3. **Form Submission** → Auto-advances to "Intake Received", notifies lawyer
4. **Dashboard** → "Needs Review" section shows pending intakes
5. **Approval** → One-click advance to "Under Review"

**Key Features:**
- Auto-save every 30 seconds (prevent data loss)
- Thank you page after submission
- Stage badges with color coding
- Responsibility indicators (client vs lawyer)
- Overdue tracking and alerts

**Important:** Matter creation with client automatically triggers intake flow. To skip intake, create matter without clientId or manually change stage.
```

**Step 2: Update README with new features**

In `README.md`, update the features section:

```markdown
## Key Features

- ✅ **Automated Intake** - Email clients intake forms, auto-advance on submission
- ✅ **Dashboard Clarity** - "Needs Attention" and "Waiting on Client" sections
- ✅ **Matter Pipeline** - Fixed stages with clear next actions
- ✅ **Time Tracking** - < 2-click timer with persistence
- ✅ **Billing Integration** - Square sync for payments
- ✅ **Document Management** - Google Drive integration
- ✅ **Email Automation** - Transactional emails for all key events
```

**Step 3: Commit documentation updates**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update documentation with intake automation features"
```

---

### Task 14: Final Cleanup & Polish

**Step 1: Run linter**

```bash
pnpm lint
```

Fix any linting errors.

**Step 2: Run type checker**

```bash
pnpm typecheck
```

Fix any TypeScript errors.

**Step 3: Run all tests**

```bash
pnpm test
```

Verify all tests pass.

**Step 4: Build production bundle**

```bash
pnpm build
```

Verify build succeeds with no errors.

**Step 5: Create final commit if fixes were needed**

```bash
git add .
git commit -m "chore: fix linting and type errors"
```

**Step 6: Create summary commit**

```bash
git commit --allow-empty -m "feat: complete intake automation MVP

Implemented end-to-end intake automation workflow:
- Auto-set intake fields when matter created with client
- Email client with intake form link
- Auto-advance on submission
- Dashboard sections for 'Needs Review' and 'Waiting on Client'
- Visual indicators (stage badges, responsibility icons)
- Auto-save and thank you page
- Integration tests

Closes intake automation MVP milestone.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria Verification

After completing all tasks, verify these success criteria:

- [x] Lawyer creates matter in < 30 seconds
- [x] Client receives intake email within 1 minute
- [x] Client can complete form without lawyer assistance
- [x] Matter auto-advances to "Intake Received" on submission
- [x] Lawyer sees "Needs Review" on dashboard within seconds
- [x] Lawyer can approve intake in < 2 clicks
- [x] Complete flow works end-to-end with zero manual email/data entry

---

## Post-Implementation

**Next Steps:**

1. Deploy to staging environment
2. Test with real email (not just local preview)
3. Get feedback from solo practitioner
4. Iterate based on feedback
5. Consider Phase 2 features (see `2025-12-25-intake-automation-phase-2.md`)

**Monitoring:**

- Track email delivery rates
- Monitor intake completion rates
- Measure time-to-approval
- Collect user feedback

---

**Plan complete!** Ready to execute task-by-task.
