# MatterFlow UI/UX Architecture

**Document Purpose:** Define how UI components, workflows, business logic, and API patterns connect to create a cohesive legal practice management system.

**Last Updated:** 2025-12-31

---

## Table of Contents

1. [Overview & Design Philosophy](#overview--design-philosophy)
2. [User Roles & Capabilities](#user-roles--capabilities)
3. [Matter Lifecycle & Workflow](#matter-lifecycle--workflow)
4. [Core UI Patterns](#core-ui-patterns)
5. [API & Data Flow Architecture](#api--data-flow-architecture)
6. [Feature Integration Map](#feature-integration-map)
7. [Client Journey](#client-journey)
8. [Lawyer/Staff Journey](#lawyerstaff-journey)
9. [UI Components Reference](#ui-components-reference)

---

## Overview & Design Philosophy

### What MatterFlow Is

MatterFlow is a **workflow-first** legal practice management system designed for solo and small-firm lawyers. Unlike traditional legal software that focuses on document management or billing, MatterFlow prioritizes:

1. **Next Action Clarity** - Every matter always has a clear next action with a deadline
2. **Responsibility Tracking** - Always know who's responsible (lawyer, staff, or client)
3. **Pipeline Visibility** - Visual board shows matter stages and progress
4. **Minimal Clicks** - Common tasks (time tracking, status updates) require ≤ 2 clicks

### Design Principles

**Workflow Over Features**
- UI reflects legal workflows, not software features
- Every screen asks: "What needs to happen next?"
- Reduce context-switching between tasks

**Information Hierarchy**
1. **Critical**: Next action, responsible party, deadline
2. **Important**: Matter stage, client name, recent activity
3. **Detail**: Documents, time entries, billing history

**Progressive Disclosure**
- Dashboard shows high-level overview
- Matter detail pages show complete context
- Modals/sheets for focused tasks

---

## User Roles & Capabilities

### Role-Based Access Control (RBAC)

| Role | Capabilities | UI Access | Data Scope |
|------|-------------|-----------|------------|
| **Admin** | Full system access, user management, billing approval | All pages | All matters |
| **Staff** | Matter management, time tracking, client communication | Dashboard, matters, clients, time, tasks | All matters |
| **Client** | View assigned matters, submit intake forms, respond to requests | Client portal | Own matters only |

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User visits MatterFlow                                   │
│    ↓                                                         │
│ 2. Middleware checks auth cookie (sb-localhost-auth-token)  │
│    ↓                                                         │
│ 3. If not authenticated → /auth/sign-in                     │
│    If authenticated → Extract role from JWT                 │
│    ↓                                                         │
│ 4. Role-based routing:                                      │
│    - Admin/Staff → /dashboard                               │
│    - Client → /client (client portal)                       │
│    ↓                                                         │
│ 5. Middleware blocks client mutations (POST/PUT/PATCH)      │
│    RLS policies enforce database-level permissions          │
└─────────────────────────────────────────────────────────────┘
```

**Key Files:**
- `src/middleware.ts` - Route protection, role extraction
- `src/lib/supabase/server.ts` - `ensureStaffOrAdmin()` helper
- `supabase/migrations/*_init.sql` - RLS policies

---

## Matter Lifecycle & Workflow

### Matter Stages (Fixed Pipeline)

```
Lead Created → Intake Sent → Intake Received → Under Review →
Engagement Sent → Active → Work Complete → Billed → Completed → Archived
```

**Critical Design Decision:** Stages are **fixed** and **linear**. This creates predictability and standardizes workflows across all matter types.

### Stage Transitions & UI

| Stage | Next Action (Typical) | Responsible Party | UI Location |
|-------|----------------------|-------------------|-------------|
| Lead Created | "Send intake form" | Lawyer | Dashboard → "Needs Attention" |
| Intake Sent | "Complete intake form" | Client | Client Portal → "Action Needed" |
| Intake Received | "Review intake submission" | Lawyer | Dashboard → "Needs Review" |
| Under Review | "Send engagement letter" | Lawyer | Dashboard → "In Progress" |
| Engagement Sent | "Sign engagement letter" | Client | Client Portal → "Action Needed" |
| Active | Varies by matter | Lawyer/Staff | Dashboard → "Active Matters" |
| Work Complete | "Send invoice" | Lawyer | Dashboard → "Ready to Bill" |
| Billed | "Pay invoice" | Client | Client Portal → "Invoices" |
| Completed | N/A | N/A | Dashboard → "Completed" |
| Archived | N/A | N/A | Hidden (filter to view) |

### Next Action System

**Database Constraints:**
- `next_action` (TEXT, required)
- `next_action_due_date` (DATE, required)
- `responsible_party` (TEXT, required, CHECK: 'lawyer' | 'staff' | 'client')

**UI Implications:**
- Dashboard columns group by `responsible_party`
- Overdue items highlighted in red
- Due today/tomorrow highlighted in yellow
- Next action always visible on matter cards

**Validation in Actions:**
```typescript
// src/lib/data/actions.ts
export async function createMatter(formData: FormData) {
  // ...
  if (!validated.nextAction || !validated.nextActionDueDate) {
    return { success: false, error: 'Next action and due date required' }
  }
  // ...
}
```

---

## Core UI Patterns

### 1. Dashboard (Pipeline Board)

**Purpose:** Visual overview of all matters organized by workflow stage

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: Timer, Quick Actions, User Menu                     │
├──────────────────────────────────────────────────────────────┤
│ Filters: Stage, Type, Responsible Party, Search             │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │ Lead        │ │ Intake Sent │ │ Active      │  ...      │
│ │ Created     │ │             │ │             │           │
│ │             │ │             │ │             │           │
│ │ [Matter]    │ │ [Matter]    │ │ [Matter]    │           │
│ │ [Matter]    │ │             │ │ [Matter]    │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

**Data Flow:**
```typescript
// src/app/dashboard/page.tsx (Server Component)
async function DashboardPage() {
  const { data: matters } = await getMatters() // Query all matters
  return <PipelineBoard matters={matters} />
}

// src/components/pipeline-board.tsx (Client Component)
'use client'
export function PipelineBoard({ matters }) {
  const grouped = groupBy(matters, 'stage')
  return <DragDropContext>{/* Kanban columns */}</DragDropContext>
}
```

**Key Interactions:**
- Drag-and-drop to change stages (updates `stage` field)
- Click matter card → `/matters/[id]` (detail view)
- Filter by responsible party → Highlights lawyer/staff/client matters
- Search by client name or matter title → Real-time filter

**Files:**
- `src/app/dashboard/page.tsx`
- `src/components/pipeline-board.tsx`
- `src/components/matter-card.tsx`
- `src/components/matter-filters.tsx`

---

### 2. Matter Detail Page

**Purpose:** Single source of truth for all matter information

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: Matter Title, Client Name, Stage Badge              │
├──────────────────────────────────────────────────────────────┤
│ Tabs: Overview | Documents | Tasks | Time | Billing         │
├──────────────────────────────────────────────────────────────┤
│ Overview Tab:                                                │
│   ┌─────────────────────┐  ┌──────────────────────────┐    │
│   │ Next Action Card    │  │ Recent Activity          │    │
│   │ - Action            │  │ - Time entries           │    │
│   │ - Due date          │  │ - Document uploads       │    │
│   │ - Responsible       │  │ - Status changes         │    │
│   └─────────────────────┘  └──────────────────────────┘    │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ Matter Details                                       │  │
│   │ - Type, Billing Model, Owner                        │  │
│   │ - Client Info (with contact details)                │  │
│   └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Data Flow:**
```typescript
// src/app/matters/[id]/page.tsx (Server Component)
async function MatterPage({ params }) {
  const { id } = await params
  const { data: matter } = await getMatterById(id)
  const { data: timeEntries } = await getTimeEntries(id)
  const { data: tasks } = await getTasks({ matterId: id })

  return (
    <MatterDetail
      matter={matter}
      timeEntries={timeEntries}
      tasks={tasks}
    />
  )
}
```

**Key Interactions:**
- Edit matter details → Modal → Server action `updateMatter()`
- Add time entry → Quick add or timer → Server action `createTimeEntry()`
- Upload document → Google Drive integration → Server action `uploadDocument()`
- Change stage → Dropdown → Server action `updateMatter()` + revalidate

**Files:**
- `src/app/matters/[id]/page.tsx`
- `src/components/matter-detail.tsx`
- `src/components/time-entry-quick-add.tsx`

---

### 3. Client Intake System

**Purpose:** Automated client onboarding from invitation to matter creation

**Workflow:**
```
┌─────────────────────────────────────────────────────────────┐
│ 1. LAWYER CREATES INVITATION                                │
│    UI: /clients → "Invite Client" button → Modal           │
│    Action: inviteClient(formData)                           │
│    Result: Creates client_invitations record               │
│            Sends email with invite link                     │
│            Invite URL: /intake/invite/[code]                │
│                                                              │
│ 2. CLIENT CLICKS INVITE LINK                                │
│    UI: /intake/invite/[code] → Validates code              │
│    Logic: Check expiration, status, create matter if needed│
│    Result: Redirects to /intake/[matterId]                 │
│                                                              │
│ 3. CLIENT FILLS INTAKE FORM                                 │
│    UI: /intake/[matterId] → Dynamic form based on type     │
│    Features: Auto-save drafts every 30s                    │
│              File uploads (Google Drive)                    │
│              Validation (required fields)                   │
│    Action: submitIntakeForm(formData)                       │
│    Result: Creates intake_responses record                  │
│            Updates matter stage → "Intake Received"         │
│            Sends notification to lawyer                     │
│                                                              │
│ 4. LAWYER REVIEWS SUBMISSION                                │
│    UI: /admin/intake → List all submissions                │
│         /admin/intake/[id] → Detail view                   │
│    Actions: - Approve → Advances stage                     │
│             - Request more info → Phase 2 feature          │
│             - Decline → Sets decline_reason                │
│                                                              │
│ 5. (PHASE 2) REQUEST ADDITIONAL INFO                        │
│    UI: Info request composer modal                         │
│    Action: createInfoRequest(formData)                      │
│    Result: Creates info_requests record                     │
│            Sends email to client                            │
│            Client responds at /info-response/[id]           │
└─────────────────────────────────────────────────────────────┘
```

**Database Schema:**
```sql
-- Client invitation tracking
client_invitations
  - invite_code (unique, URL-safe)
  - client_email
  - expires_at
  - status ('pending' | 'completed' | 'cancelled')

-- Intake form responses
intake_responses
  - matter_id (FK to matters)
  - form_type (e.g., 'Contract Review', 'Employment Agreement')
  - responses (JSONB - flexible schema per form type)
  - status ('draft' | 'submitted' | 'approved')
  - review_status ('pending' | 'under_review' | 'accepted' | 'declined')

-- Phase 2: Follow-up info requests
info_requests
  - intake_response_id (FK to intake_responses)
  - questions (JSONB - array of structured questions)
  - message (TEXT - personal message from lawyer)
  - responses (JSONB - client's answers)
  - status ('pending' | 'completed')
```

**UI Components:**
- `src/components/clients/invite-client-modal.tsx` - Lawyer creates invitation
- `src/app/intake/invite/[code]/page.tsx` - Validates and redirects
- `src/app/intake/[matterId]/page.tsx` - Client fills form
- `src/components/intake/dynamic-form-renderer.tsx` - Renders form fields
- `src/app/admin/intake/page.tsx` - Lawyer views all submissions
- `src/app/admin/intake/[id]/page.tsx` - Lawyer reviews single submission

**Phase 2 Components:**
- `src/components/clients/question-builder.tsx` - Build structured questions
- `src/components/clients/info-request-composer.tsx` - Send follow-up questions
- `src/app/info-response/[id]/page.tsx` - Client response form
- `src/components/clients/info-response-form.tsx` - Dynamic question renderer

**Key Design Decisions:**

1. **Invite Code Pattern**: URL-safe random string instead of UUID for cleaner links
2. **Auto-Save Drafts**: Prevents data loss, stored in `localStorage` + database
3. **Matter Created Early**: Matter is created when invite is accepted (not when form is submitted) to ensure all intake responses link to a matter
4. **Review Status Separate**: `status` tracks form state, `review_status` tracks lawyer workflow
5. **Flexible Form Schema**: JSONB allows different form types without schema migrations

---

### 4. Time Tracking (< 2 Clicks)

**Purpose:** Make time tracking so easy lawyers actually do it

**Design Goal:** Start tracking time in ≤ 2 clicks from anywhere

**UI Patterns:**

**Pattern A: Header Timer (Always Visible)**
```
┌──────────────────────────────────────────────────────────────┐
│ [Timer Icon] 00:00:00  |  Matter: [Dropdown]  |  [Start]    │
└──────────────────────────────────────────────────────────────┘
```
**Clicks:** 1 (if matter is pre-selected) or 2 (select matter + start)

**Pattern B: Matter Card Quick Start**
```
┌─────────────────────────────┐
│ Contract Review - Acme Corp │
│ Next: Review documents      │
│ [⏱ Start Timer]             │
└─────────────────────────────┘
```
**Clicks:** 1 (context is already the matter)

**Pattern C: Recent Matters**
```
Recent:
  ┌─────────────────────┐
  │ Acme Corp [▶]       │ ← 1 click to start
  │ Smith Inc [▶]       │
  └─────────────────────┘
```

**Data Flow:**
```typescript
// Timer state: React Context (client-side)
// src/contexts/timer-context.tsx
const TimerContext = createContext({
  isRunning: false,
  elapsedSeconds: 0,
  matterId: null,
  taskId: null,
  description: '',
  startTimer: (matterId, taskId?, description?) => {},
  stopTimer: () => {},
})

// Persistence: Local storage + Database
useEffect(() => {
  localStorage.setItem('timer', JSON.stringify(timerState))
}, [timerState])

// On stop: Create time entry
async function stopTimer() {
  const entry = {
    matter_id: matterId,
    task_id: taskId,
    description: description,
    duration_seconds: elapsedSeconds,
    billable: true,
    approved: false,
  }
  await createTimeEntry(entry)
}
```

**Key Interactions:**
- Start timer → Updates context + localStorage
- Timer persists across page navigation (context + localStorage)
- Stop timer → Creates time_entries record
- Quick add → Manual entry without timer
- Edit entry → Before approval only
- Approve entry → Admin/staff only, enables billing

**Files:**
- `src/contexts/timer-context.tsx` - Global timer state
- `src/components/header-timer.tsx` - Header timer UI
- `src/components/time-entry-quick-add.tsx` - Manual entry modal
- `src/lib/data/actions.ts` - `createTimeEntry()`, `updateTimeEntry()`

---

## API & Data Flow Architecture

### Data Fetching Pattern

**Server Components (Default):**
```typescript
// src/app/matters/page.tsx
import { getMatters } from '@/lib/data/queries'

export default async function MattersPage() {
  const { data: matters } = await getMatters()
  return <MatterList matters={matters} />
}
```

**Benefits:**
- No loading states needed (Server Components)
- SEO-friendly (rendered on server)
- Direct database access (no API overhead)
- Type-safe (TypeScript types from Supabase)

**Client Components (When Needed):**
```typescript
// src/components/matter-filters.tsx
'use client'
import { useState } from 'react'

export function MatterFilters({ matters }) {
  const [filtered, setFiltered] = useState(matters)
  // Client-side filtering for instant feedback
  return <FilterUI />
}
```

**When to Use Client Components:**
- Interactive state (filters, search)
- Form inputs
- Real-time updates (timer, notifications)
- Third-party libraries requiring browser APIs

---

### Mutation Pattern (Server Actions)

**All Mutations via Server Actions:**

```typescript
// src/lib/data/actions.ts
'use server'

export async function createMatter(formData: FormData) {
  // 1. Authorization check
  await ensureStaffOrAdmin()

  // 2. Validate input
  const validated = matterSchema.parse({
    title: formData.get('title'),
    // ...
  })

  // 3. Database mutation (with admin client)
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('matters')
    .insert(validated)
    .select()
    .single()

  // 4. Audit logging
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'matter_created',
    resource_id: data.id,
  })

  // 5. Revalidate cache
  revalidatePath('/matters')
  revalidatePath('/dashboard')

  // 6. Return result
  return { success: true, data }
}
```

**Key Principles:**

1. **"use server" Directive**: Marks functions as server actions
2. **Authorization First**: `ensureStaffOrAdmin()` blocks unauthorized users
3. **Validation**: Zod schemas validate all input
4. **Admin Client**: `supabaseAdmin()` bypasses RLS for service operations
5. **Audit Trail**: All mutations logged to `audit_logs`
6. **Cache Invalidation**: `revalidatePath()` updates Next.js cache
7. **Consistent Returns**: `{ success: boolean, data?: T, error?: string }`

**Form Integration:**
```typescript
// Client component
<form action={createMatter}>
  <input name="title" />
  <button type="submit">Create</button>
</form>
```

**Progressive Enhancement**: Works without JavaScript!

---

### Query Pattern

**Two-Tier Architecture:**

1. **Query Functions** (`src/lib/data/queries.ts`)
   - Read-only operations
   - Used in Server Components
   - Graceful degradation if Supabase unavailable
   - Returns `{ data, source: 'supabase' | 'mock' }`

2. **Server Actions** (`src/lib/data/actions.ts`)
   - All mutations
   - Authorization enforced
   - Audit logging
   - Cache invalidation

**Example Query:**
```typescript
// src/lib/data/queries.ts
export async function getMatters() {
  try {
    const supabase = await supabaseServer()
    const { data, error } = await supabase
      .from('matters')
      .select(`
        *,
        client:client_id(user_id, full_name, email),
        owner:owner_id(user_id, full_name)
      `)
      .order('created_at', { ascending: false })

    return { data: data || [], source: 'supabase' }
  } catch (error) {
    console.error('getMatters error:', error)
    return { data: [], source: 'supabase' }
  }
}
```

**Benefits:**
- Type-safe joins with Supabase syntax
- Error handling returns empty data (not exceptions)
- Source tracking for debugging

---

### RLS (Row-Level Security) Policies

**Database-Level Authorization:**

```sql
-- Example: Matters table RLS
CREATE POLICY "Clients can view own matters"
  ON matters FOR SELECT
  USING (
    client_id = auth.uid() OR
    current_user_role() IN ('admin', 'staff')
  );

CREATE POLICY "Staff can create matters"
  ON matters FOR INSERT
  WITH CHECK (current_user_role() IN ('admin', 'staff'));
```

**Helper Function:**
```sql
CREATE FUNCTION current_user_role() RETURNS user_role AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Security Definer**: Bypasses RLS to read profiles table (prevents circular dependency)

**Why This Matters:**
- Defense in depth (middleware + RLS)
- Even if middleware fails, database blocks unauthorized access
- Consistent enforcement across API and database queries

---

## Feature Integration Map

### How Features Connect

```
┌──────────────────────────────────────────────────────────────┐
│                     MATTER (Central Entity)                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ INTAKE      │  │ DOCUMENTS   │  │ TIME        │         │
│  │ FORMS       │  │ (Drive)     │  │ TRACKING    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                 │                │
│         ├─────────────────┼─────────────────┤                │
│         │                 │                 │                │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │ TASKS       │  │ BILLING     │  │ AUDIT LOGS  │         │
│  │             │  │ (Square)    │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  All Features Link Back to Matter ID                        │
└──────────────────────────────────────────────────────────────┘
```

### Integration Points

**Intake → Matter:**
- Intake response creates/links to matter
- Matter stage auto-updates to "Intake Received"
- Client profile created from intake data

**Documents → Matter:**
- Google Drive folder per matter
- Document metadata stored in `documents` table
- Folder structure: `/Client Name/Matter Name/00 Intake, 01 Source Docs, ...`

**Time → Billing:**
- Time entries link to matter (and optionally task)
- Only approved entries can be billed
- Invoice line items reference time entry IDs
- Square sync creates invoice in payment system

**Tasks → Matter:**
- Tasks link to matter
- Task completion can trigger matter stage change
- Next action often comes from task list

**Everything → Audit Logs:**
- All mutations logged with actor, action, timestamp
- Filterable by matter, user, action type
- Immutable append-only log

---

## Client Journey

### From Invitation to Payment

```
1. RECEIVE INVITATION EMAIL
   ↓
   Click "Complete Intake Form" button
   ↓
2. LAND ON /intake/invite/[code]
   ↓
   System validates code → Creates/finds matter → Redirects
   ↓
3. FILL INTAKE FORM /intake/[matterId]
   ↓
   Auto-save drafts every 30s
   Upload documents (if required)
   ↓
4. SUBMIT FORM
   ↓
   Thank you page with next steps
   Lawyer receives notification
   ↓
5. (IF NEEDED) RESPOND TO INFO REQUEST
   ↓
   Receive email: "We need more information"
   Click link → /info-response/[id]
   Answer structured questions
   Submit responses
   ↓
6. RECEIVE ENGAGEMENT LETTER
   ↓
   Email with PDF attachment
   Review and sign (external DocuSign/HelloSign)
   ↓
7. MATTER IS ACTIVE
   ↓
   Lawyer works on case
   Client can view progress in client portal
   ↓
8. RECEIVE INVOICE
   ↓
   Email: "Your invoice is ready"
   Click "View & Pay Invoice"
   ↓
9. PAY INVOICE (Square)
   ↓
   Redirects to Square payment page
   Enter payment method
   Submit payment
   ↓
10. PAYMENT CONFIRMATION
    ↓
    Email receipt
    Invoice status → "Paid"
    Matter can move to "Completed"
```

**Key Touchpoints:**
- **Email**: All notifications (invite, info request, invoice)
- **Web Forms**: Intake, info response (no login required for first-time)
- **Client Portal**: View matters, documents, invoices (requires login)
- **External**: Square for payments

---

## Lawyer/Staff Journey

### Daily Workflow

```
1. LOGIN → DASHBOARD
   ↓
   Visual pipeline shows all matters by stage
   "Needs Attention" section highlights overdue/urgent items
   ↓
2. REVIEW PRIORITIES
   ↓
   Filter by "My Responsibility" (responsible_party = 'lawyer')
   Sort by next_action_due_date
   ↓
3. TRIAGE INBOX
   ↓
   New intake submissions → /admin/intake
   Review responses, approve or request more info
   ↓
4. WORK ON MATTER
   ↓
   Click matter → Detail page
   Start timer (1 click from matter card)
   Work on task
   Upload documents to Google Drive
   ↓
5. UPDATE STATUS
   ↓
   Complete task → Check off
   Update next action → "Send draft to client"
   Change responsible party → "Client" (waiting for response)
   ↓
6. TRACK TIME
   ↓
   Stop timer (automatically creates entry)
   OR manually add time entry
   Describe work performed
   ↓
7. PREPARE INVOICE
   ↓
   Navigate to /billing
   Filter unapproved time entries
   Review and approve entries for billing
   ↓
8. SEND INVOICE
   ↓
   Click "Create Invoice" for matter
   System generates line items from approved time entries
   Review total, adjust if needed
   Status → "Sent" (triggers Square sync)
   Client receives email with payment link
   ↓
9. MONITOR PAYMENT
   ↓
   Square webhook updates invoice status
   "Paid" invoices move matter to "Billed" stage
   ↓
10. CLOSE MATTER
    ↓
    All work complete + invoice paid
    Update stage → "Completed"
    Archive matter (hides from active dashboard)
```

**Key Interactions:**
- **Dashboard**: Central hub, visual pipeline
- **Matter Detail**: Single page for all matter context
- **Quick Actions**: Start timer, add document, update status
- **Bulk Operations**: Approve time entries, create invoices
- **Email Automation**: Intake reminders, invoice reminders

---

## UI Components Reference

### Component Hierarchy

```
App Shell (src/components/app-shell.tsx)
├── Header
│   ├── Logo
│   ├── Navigation (staff/admin only)
│   ├── Timer (HeaderTimer)
│   └── User Menu
│
├── Sidebar (Collapsible)
│   ├── Dashboard
│   ├── Matters
│   ├── Clients
│   ├── Tasks
│   ├── Time
│   ├── Billing
│   └── Admin (admin only)
│
└── Main Content
    ├── Page-specific content
    └── Modals/Sheets (overlay)
```

### Key Components

**Layout Components:**
- `AppShell` - Main application frame
- `Sidebar` - Navigation sidebar with collapse state
- `Header` - Top bar with timer and user menu

**Matter Components:**
- `PipelineBoard` - Kanban board for matters
- `MatterCard` - Card displaying matter summary
- `MatterFilters` - Filter controls for matter list
- `MatterDetail` - Full matter detail view

**Form Components:**
- `DynamicFormRenderer` - Renders intake forms
- `QuestionBuilder` - Build structured questions (Phase 2)
- `InfoRequestComposer` - Compose follow-up questions (Phase 2)
- `InfoResponseForm` - Client response form (Phase 2)

**Time Tracking:**
- `TimerContext` - Global timer state (React Context)
- `HeaderTimer` - Header timer display and controls
- `TimeEntryQuickAdd` - Manual time entry modal

**Modals:**
- `InviteClientModal` - Send client invitation
- `ScheduleCallModal` - Schedule consultation call (Phase 2)
- Various edit/create modals

**UI Primitives (shadcn/ui):**
- `Button`, `Input`, `Label`, `Textarea`
- `Select`, `Checkbox`, `RadioGroup`
- `Dialog`, `Sheet`, `Card`
- `Table`, `Tabs`, `Badge`

---

## Navigation Patterns

### URL Structure

```
/                          → Redirect to /dashboard or /auth/sign-in
/dashboard                 → Pipeline board (staff/admin)
/matters                   → List all matters
/matters/[id]              → Matter detail page
/matters/[id]/edit         → Edit matter
/clients                   → Client list (staff/admin)
/clients/[id]              → Client detail
/tasks                     → Task list
/time                      → Time entries list
/billing                   → Invoices and billing
/admin                     → Admin dashboard
/admin/users               → User management
/admin/intake              → Intake review list
/admin/intake/[id]         → Review single intake
/intake/invite/[code]      → Public invite redemption
/intake/[matterId]         → Public intake form
/info-response/[id]        → Public info response form (Phase 2)
/client                    → Client portal (client role)
/client/matters            → Client's matters
/client/invoices           → Client's invoices
/auth/sign-in              → Login page
/auth/sign-out             → Logout
```

### Deep Linking

**Matter Links:** `/matters/[uuid]` - Direct link to any matter
**Intake Links:** `/intake/[uuid]` - Direct link to intake form (shareable)
**Invite Links:** `/intake/invite/[code]` - One-time invitation link
**Info Request:** `/info-response/[uuid]` - Client response form (Phase 2)

**All public pages (intake, invite, info-response) work without authentication.**

---

## Data Flow Summary

### Server → Client

```
1. User requests page
   ↓
2. Server Component fetches data
   ↓  (Server-side query to Supabase)
   ↓
3. Data passed as props to Client Components
   ↓
4. Client Components render with data
   ↓
5. Interactive state managed in Client Components
```

### Client → Server (Mutations)

```
1. User submits form
   ↓
2. Form calls Server Action
   ↓  (Server-side mutation)
   ↓
3. Server Action:
   - Validates input
   - Checks authorization
   - Mutates database
   - Logs audit trail
   - Revalidates cache
   ↓
4. Returns result to client
   ↓
5. Client updates UI (toast notification, redirect, etc.)
```

### Real-time Updates (Timer)

```
1. Timer state stored in React Context
   ↓
2. useEffect syncs to localStorage
   ↓
3. Persists across page navigation
   ↓
4. On stop, creates time_entry via Server Action
```

---

## Performance Considerations

### Optimization Strategies

**Server Components (Default):**
- No JavaScript sent to client
- No hydration cost
- SEO-friendly
- Direct database access

**Client Components (Minimal):**
- Only for interactivity
- Code-split automatically
- Lazy load heavy components

**Database Queries:**
- Indexes on frequently queried columns
- RLS policies use indexed fields (`user_id`, `client_id`)
- Joins limited to essential relations
- Pagination for large lists (TODO)

**Caching:**
- Next.js App Router caches Server Component output
- `revalidatePath()` invalidates on mutations
- Static generation for public pages (intake forms)

**Asset Optimization:**
- Images optimized via Next.js Image component
- Fonts preloaded
- Critical CSS inlined

---

## Future Enhancements

### Phase 3: Calendar Integration

- Schedule calls directly in UI
- Sync with Google Calendar
- Automated meeting reminders
- Availability booking for clients

### Phase 4: Document Automation

- Template library (contracts, letters)
- Variable substitution (client name, matter details)
- PDF generation
- E-signature integration (DocuSign/HelloSign)

### Phase 5: Client Portal Enhancement

- Real-time chat with lawyer
- Document approval workflow
- Self-service status updates

### Phase 6: Analytics

- Matter velocity (time per stage)
- Revenue forecasting
- Utilization rates
- Client acquisition metrics

---

## Appendix: File Structure

```
src/
├── app/                       # Next.js App Router pages
│   ├── dashboard/             # Pipeline board
│   ├── matters/               # Matter management
│   ├── clients/               # Client list
│   ├── admin/                 # Admin pages
│   │   └── intake/            # Intake review
│   ├── intake/                # Public intake forms
│   │   └── invite/[code]/     # Invite redemption
│   ├── info-response/[id]/    # Client response form (Phase 2)
│   └── auth/                  # Authentication
│
├── components/                # React components
│   ├── ui/                    # shadcn/ui primitives
│   ├── clients/               # Client-specific components
│   │   ├── question-builder.tsx           (Phase 2)
│   │   ├── info-request-composer.tsx      (Phase 2)
│   │   ├── info-response-form.tsx         (Phase 2)
│   │   └── schedule-call-modal.tsx        (Phase 2)
│   ├── intake/                # Intake form components
│   ├── app-shell.tsx          # Main app layout
│   ├── sidebar.tsx            # Navigation sidebar
│   ├── header-timer.tsx       # Timer in header
│   └── pipeline-board.tsx     # Kanban board
│
├── lib/
│   ├── data/
│   │   ├── actions.ts         # Server actions (mutations)
│   │   └── queries.ts         # Query functions (reads)
│   ├── email/
│   │   ├── client.ts          # Email sending (Resend)
│   │   ├── gmail-client.ts    # Gmail + OAuth email
│   │   └── templates/         # React Email templates
│   ├── supabase/
│   │   ├── server.ts          # Server-side Supabase client
│   │   └── client.ts          # Client-side Supabase client
│   ├── validation/
│   │   ├── schemas.ts         # Zod validation schemas
│   │   └── info-request-schemas.ts  (Phase 2)
│   └── utils.ts               # Utility functions
│
├── contexts/
│   └── timer-context.tsx      # Timer React Context
│
├── types/
│   └── database.types.ts      # Generated from Supabase
│
└── middleware.ts              # Auth and routing middleware
```

---

**End of UI-UX.md**
