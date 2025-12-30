# Client Setup, Intake & Management UI/UX Design

**Date:** 2025-12-30
**Status:** Design Complete - Ready for Implementation
**Scope:** Complete client lifecycle management from invitation through matter management

---

## Overview

This design transforms MatterFlow from a matter-centric tool into a complete client relationship management system. The core philosophy: **intake-first by default** (clients self-serve through invite codes), with flexibility for lawyers to manually create clients/matters when needed.

---

## Design Principles

1. **Intake-first default** - Prospective clients complete structured intake forms before lawyer commitment
2. **Flexible entry points** - Support manual client/matter creation when intake doesn't fit
3. **Visual pipeline** - Kanban board shows client journey from invitation to active client
4. **Personal touch** - Personalized emails and context throughout (solo practitioner focus)
5. **Iterative refinement** - Request additional information from clients as needed
6. **Clean transitions** - Past clients easily reactivate when new matters arise

---

## Navigation & Information Architecture

### New Top-Level Navigation

**Add "Clients" to main sidebar:**
- Position: Between "Dashboard" and "Matters"
- Icon: Users/People icon
- Route: `/clients`

### Clients Page Structure

```
/clients
├── Header
│   ├── "Clients" title
│   ├── Stats bar (Total invited, Under review, Active, Past)
│   └── Actions: "Invite New Client" (primary), "Add Client Manually" (secondary)
│
├── Pipeline Board (Kanban - always visible)
│   ├── Invited Column
│   ├── Intake Submitted Column
│   └── Under Review Column
│
├── Active Clients Section (expandable, expanded by default)
│   ├── Search/filter bar
│   └── Grid of client cards
│
└── Past Clients Section (expandable, collapsed by default)
    └── Grid of client cards
```

---

## Core Flows

### 1. Invite New Client Flow (Primary)

**Entry Point:** "Invite New Client" button on Clients page

**Invite Form Modal:**
```
Fields:
- Full Name (required, text)
- Email Address (required, email)
- Matter Type (required, dropdown):
  - Contract Review
  - Employment Agreement
  - Policy Review
  - Unknown / Not Yet Determined (default)
  - [other practice matter types]
- Notes (optional, textarea)
  - Placeholder: "Add context that will appear in the email (e.g., 'Following up on our phone call about...')"
  - Character limit: 500
- Attach Documents (optional, file upload)
  - Purpose: Reference materials, engagement letters, etc.
  - Max 5 files, 10MB each

Actions:
- "Send Invitation" (primary) - Generates code, sends email, creates "Invited" card
- "Cancel" (secondary)
```

**System Actions on Submit:**
1. Generate unique invite code (UUID-based, secure)
2. Create client record with status "invited"
3. Send personalized email to client
4. Create card in "Invited" column
5. Show success message with copy-able invite link (backup)

**Invite Email Template:**
```
Subject: Complete Your Intake Form for [Firm Name]

Hi [Client Name],

[Your personalized notes if provided]

I've created a secure intake form for you to complete. This helps me understand your situation and determine how I can best help you.

Matter Type: [Matter Type]
Estimated Time: 10-15 minutes

[Big CTA Button: Complete Your Intake Form]

This link expires in 7 days. If you have any questions, feel free to reply to this email.

Best regards,
[Lawyer Name]
[Firm Name]
[Contact Info]
```

---

### 2. Pipeline Board (Kanban View)

**Three Columns with Drag-and-Drop:**

#### Column 1: Invited
**Purpose:** Track sent invitations awaiting client submission

**Card Content:**
- Client name (bold)
- Email address (muted)
- Matter type badge
- Days since invited (e.g., "Invited 2 days ago")
- Icon: envelope

**Card Actions (on hover/click):**
- Resend Invitation
- Copy Invite Link
- Cancel Invitation
- View Details

**Empty State:**
"No pending invitations. Click 'Invite New Client' to get started."

#### Column 2: Intake Submitted
**Purpose:** New intake submissions awaiting first review

**Card Content:**
- Client name (bold)
- Matter type badge
- Submission date/time
- Preview snippet (first 100 chars of intake response)
- Icon: document with checkmark
- "NEW" badge if submitted within 24 hours

**Card Actions:**
- Click card → Opens Intake Review Modal (primary action)
- Quick actions: Accept, Request Info, Decline

**Empty State:**
"No submissions awaiting review."

#### Column 3: Under Review
**Purpose:** Intakes with follow-up questions, awaiting additional info or decision

**Card Content:**
- Client name (bold)
- Matter type badge
- Status indicator:
  - "Waiting on Client" (yellow)
  - "Info Received" (green)
  - "Scheduled Call on [date]" (blue)
- Days in review
- Icon: hourglass or calendar

**Card Actions:**
- Click card → Opens Intake Review Modal
- Quick actions: Accept, Request More Info, Schedule Call

**Empty State:**
"No intakes under review."

**Drag Behavior:**
- Cannot drag between pipeline columns (status controlled by actions)
- Can drag within column to reorder priority
- Accepting moves card out of pipeline to Active Clients

---

### 3. Intake Review Modal

**Layout:** Full-screen modal or slide-over (right side)

**Header:**
- Client name
- Matter type
- Submission date
- Close button

**Action Bar (sticky at top):**
```
[Accept as Client]  [Decline]  [Request More Info]  [Schedule Call]
```

**Content Sections:**

**Section 1: Client Information**
- Name, email, phone (from intake form)
- Editable fields (in case client made typos)

**Section 2: Intake Responses**
- All form questions and answers
- Clean layout with labels and responses
- File attachments (if any) shown as downloadable cards
- Highlight empty/skipped questions

**Section 3: Additional Information (if requested)**
- Shows follow-up questions you sent
- Client's responses
- Timestamp of each exchange
- History of all info requests (expandable)

**Section 4: Internal Notes**
- Private notes section (not visible to client)
- Add observations, red flags, next steps
- Auto-saves as you type

**Section 5: Documents**
- Any documents client uploaded
- Any documents you attached to info requests
- Download all as ZIP option

---

### 4. Request Additional Information

**Triggered by:** "Request More Info" button in Intake Review Modal

**Information Request Composer (Modal/Slide-over):**

**Section 1: Add Structured Questions (Optional)**
```
[+ Add Question] button

Question Types:
- Short text (single line input)
- Long text (textarea)
- Multiple choice (radio buttons)
- Checkboxes (multi-select)
- File upload
- Date picker

Each question has:
- Question text (required)
- Help text (optional, shows below question)
- Required toggle
- Delete button
- Drag handle (reorder)
```

**Section 2: Personal Message (Optional)**
```
Rich text editor

Placeholder:
"Add a personal message explaining what you need and why. This will appear at the top of the email to the client."

Example:
"Thanks for your initial submission. I have a few follow-up questions to better understand your situation..."
```

**Section 3: Attach Documents (Optional)**
```
File upload zone

Purpose: Send context documents (engagement letters, contracts to review, etc.)
Max 5 files, 10MB each
```

**Section 4: Response Deadline**
```
Date picker
Default: 3 days from now
Label: "Client should respond by:"
```

**Preview & Send:**
- Shows preview of email client will receive
- "Send Request" button
- "Save as Draft" button

**System Actions on Send:**
1. Update status to "Under Review (Waiting on Client)"
2. Send email with structured form link
3. Create notification for you when client responds
4. Track in activity timeline

**Follow-Up Email Template:**
```
Subject: Additional Information Needed - [Matter Type]

Hi [Client Name],

[Your personal message]

I need a bit more information to proceed. Please complete this short follow-up form:

[CTA Button: Provide Additional Information]

Please respond by [Date]. If you have questions, reply to this email.

[Attached Documents section if any]

Best regards,
[Lawyer Name]
```

**Client Response Handling:**
- Updates status to "Under Review (Info Received)"
- Notification sent to lawyer
- Responses appear in Intake Review Modal
- Can request more info again (iterative process)

---

### 5. Intake Decision Actions

#### Action: Accept as Client
**Behavior:**
1. Creates client profile in `profiles` table
2. Creates matter record linked to client
3. Sets matter stage to "Intake Received"
4. Removes card from pipeline
5. Adds card to "Active Clients" section
6. Sends confirmation email to client
7. Creates timeline entry

**Confirmation Email:**
```
Subject: Welcome to [Firm Name]

Hi [Client Name],

I'm pleased to let you know I'll be taking on your [Matter Type] matter.

Next Steps:
[Lawyer adds custom next steps or uses template]

I'll be in touch soon with next steps.

Best regards,
[Lawyer Name]
```

#### Action: Decline
**Opens Decline Modal:**
```
Fields:
- Reason (optional dropdown):
  - Conflict of interest
  - Outside practice area
  - Capacity constraints
  - Other
- Personal message (optional textarea)
- Send decline email (checkbox, checked by default)

Actions:
- "Send Decline & Archive" (primary)
- "Cancel" (secondary)
```

**Behavior:**
1. Archives intake record
2. Sends decline email (if checked)
3. Removes from pipeline
4. Adds to archived intakes (accessible via filters)

**Decline Email Template:**
```
Subject: Update on Your Intake Submission

Hi [Client Name],

Thank you for taking the time to complete the intake form.

[Your personal message or template]

I wish you the best in resolving this matter. [Optional: Here are some referrals...]

Best regards,
[Lawyer Name]
```

#### Action: Schedule Call
**Behavior:**
1. Opens calendar integration (if configured) OR
2. Generates scheduling link (Calendly-style) OR
3. Shows modal to manually enter appointment details

**Manual Appointment Modal:**
```
Fields:
- Date & Time
- Duration (30/60/90 minutes)
- Meeting type (Phone, Video, In-person)
- Meeting link (for video)
- Notes to client

Actions:
- "Send Calendar Invite" (primary)
- "Just Save (No Email)" (secondary)
```

**Behavior:**
1. Updates status to "Under Review (Call Scheduled)"
2. Sends calendar invite to client
3. Adds appointment to your calendar (if integrated)
4. Shows appointment date on pipeline card

---

### 6. Manual Client Creation Flow

**Entry Point:** "Add Client Manually" button on Clients page (secondary button)

**Use Case:** Phone consultations, walk-ins, referrals where intake form doesn't fit

**Manual Client Form:**
```
Fields:
- Full Name (required)
- Email (optional) - Note: "Some clients don't use email"
- Phone (optional)
- Address (optional) - Useful for estate planning, real estate
- Initial Notes (optional, textarea)

Checkbox:
☐ Create first matter immediately

Actions:
- "Create Client" (primary)
- "Cancel" (secondary)
```

**Behavior:**
1. Creates client profile with status "active"
2. Skips pipeline entirely (goes straight to Active Clients)
3. If "Create first matter immediately" checked:
   - After creating client, opens Matter Creation Modal
   - Client pre-filled in matter form

---

### 7. Active Clients Section

**Layout:** Grid or list view (user toggle)

**Search & Filter Bar:**
```
[Search by name...]  [Filter: All | Recent Activity | Matter Type]  [Sort: ↓ Recent]

Filters:
- All (default)
- Active matters only
- Recently contacted (7 days)
- By matter type
- Overdue actions

Sort Options:
- Recent activity (default)
- Name A-Z
- Name Z-A
- Most matters
- Oldest first
```

**Client Card (Grid View):**
```
┌─────────────────────────────┐
│ [Avatar] Client Name        │
│                             │
│ 2 Active Matters    [Badge] │
│ Last activity: 2 days ago   │
│                             │
│ [View] [New Matter] [···]   │
└─────────────────────────────┘
```

**Client Card Actions:**
- **View** - Goes to client detail page
- **New Matter** - Opens matter creation modal (client pre-filled)
- **···** Menu:
  - Send message
  - View documents
  - View billing
  - Mark as past client

**Empty State:**
"No active clients yet. Invite your first client to get started."

---

### 8. Client Detail Page

**Route:** `/clients/[clientId]`

**Layout:** Dashboard with cards

**Header:**
```
← Back to Clients

[Client Name]                                [Edit] [···]
Last activity: 2 days ago

[New Matter] [Upload Document] [Send Message]
```

**Dashboard Cards:**

#### Card 1: Contact Information (Top Left)
```
┌─────────────────────────────┐
│ Contact Information         │
├─────────────────────────────┤
│ Email: client@example.com   │
│ Phone: (555) 123-4567       │
│ Address: [if provided]      │
│                             │
│ Internal Notes (expandable) │
│ [Private notes section]     │
│                             │
│ [Edit Contact Info]         │
└─────────────────────────────┘
```

#### Card 2: Active Matters (Top Right)
```
┌─────────────────────────────┐
│ Active Matters (2)          │
├─────────────────────────────┤
│ Contract Review             │
│ ├─ Stage: Under Review      │
│ └─ Next: Review draft       │
│                             │
│ Employment Agreement        │
│ ├─ Stage: Draft Ready       │
│ └─ Next: Send to client     │
│                             │
│ [+ New Matter]              │
└─────────────────────────────┘
```

#### Card 3: Documents (Middle Left)
```
┌─────────────────────────────┐
│ Recent Documents            │
├─────────────────────────────┤
│ [Matter Filter: All ▼]      │
│                             │
│ contract-v2.pdf             │
│ └─ Contract Review · 2d ago │
│                             │
│ engagement-letter.pdf       │
│ └─ Employment · 5d ago      │
│                             │
│ [View All Documents]        │
└─────────────────────────────┘
```

#### Card 4: Billing Summary (Middle Right)
```
┌─────────────────────────────┐
│ Billing Summary             │
├─────────────────────────────┤
│ Total Billed:    $5,200     │
│ Paid:            $3,000     │
│ Outstanding:     $2,200     │
│                             │
│ Recent Invoices:            │
│ INV-001 · $2,200 · Sent     │
│ INV-002 · $3,000 · Paid     │
│                             │
│ [View All Invoices]         │
└─────────────────────────────┘
```

#### Card 5: Activity Timeline (Bottom, Full Width)
```
┌──────────────────────────────────────────────┐
│ Timeline                    [Expand ▼]       │
├──────────────────────────────────────────────┤
│ Today                                        │
│ • Document uploaded: contract-v2.pdf         │
│                                              │
│ 2 days ago                                   │
│ • Matter status updated: Under Review        │
│                                              │
│ 5 days ago                                   │
│ • Invoice sent: INV-001 ($2,200)            │
│                                              │
│ [Show All Activity]                          │
└──────────────────────────────────────────────┘

When expanded:
- Shows all events (intake, matters, documents, invoices, emails)
- Filter by event type
- Search timeline
```

---

### 9. Matter Creation (Updated Flow)

**Entry Points:**
1. Matters page → "Create New Matter" (existing)
2. Client detail page → "New Matter" button
3. Dashboard → Quick action
4. After manual client creation (if checkbox selected)

**Updated Matter Creation Form:**

**Client Selection:**
```
Client (Required)
┌─────────────────────────────────────┐
│ [Select existing client ▼]         │
│                                     │
│ Options:                            │
│ - List of existing clients          │
│ - "+ Create new client"             │
│ - "No client (lead only)"           │
└─────────────────────────────────────┘

If "+ Create new client" selected:
→ Inline mini-form appears:
  - Name (required)
  - Email (optional)
  - Phone (optional)
  → "Create & Continue" saves client, returns to matter form

If client selected:
→ Shows client context card:
  "Creating matter for: [Client Name]"
  "Existing matters: [count]"
```

**Rest of Form:** (similar to current, with improvements)
```
- Matter Title (required)
- Matter Type (required dropdown)
- Billing Model (hourly/flat/contingency)
- Responsible Party (lawyer/staff/client)
- Next Action (required)
- Next Action Due Date (required)

New Options:
☐ Skip intake (if client selected)
  - If unchecked: Auto-sets stage to "Intake Sent"
  - If checked: Choose starting stage

☐ Initialize Google Drive folders immediately
```

---

### 10. Past Clients Section

**Purpose:** Track clients with no active matters

**When Client Becomes "Past":**
- All their matters are in "Completed" or "Archived" stage
- Automatically moves from "Active" to "Past"
- No manual action required

**Past Clients Display:**
```
Collapsed by default on Clients page

When expanded:
┌─────────────────────────────┐
│ Past Clients (12)           │
├─────────────────────────────┤
│                             │
│ [Search past clients...]    │
│                             │
│ Grid of past client cards:  │
│                             │
│ [Avatar] Client Name        │
│ Last matter: 6 months ago   │
│ 3 Completed matters         │
│ [Reactivate] [View History] │
└─────────────────────────────┘
```

**Reactivation Flow:**

**Option 1: Click "Reactivate"**
- Opens "New Matter" modal with client pre-filled
- On save: Client moves back to "Active Clients"
- All history preserved

**Option 2: Click "New Matter" on past client**
- Same behavior as "Reactivate"

**View History:**
- Goes to client detail page (read-only view)
- Shows all completed matters
- Shows all documents, invoices, timeline
- "Reactivate" button in header

---

## Email Templates & Branding

### System Emails

**1. Invitation Email**
```
Subject: Complete Your Intake Form for [Firm Name]

Hi [Client Name],

[Personalized notes from lawyer if provided]

I've created a secure intake form for you to complete. This helps me understand your [Matter Type] matter and determine how I can best help you.

Estimated Time: 10-15 minutes

[Big CTA Button: Complete Your Intake Form]

This link is secure and expires in 7 days. If you have any questions, feel free to reply to this email.

Best regards,
[Lawyer Name]
[Firm Name]
[Email Signature]
```

**2. Additional Information Request**
```
Subject: Additional Information Needed - [Matter Type]

Hi [Client Name],

[Lawyer's personal message]

I need some additional information to proceed with your matter. Please complete this follow-up form by [Date]:

[CTA Button: Provide Additional Information]

[If documents attached]
I've also attached [number] document(s) for your reference.

If you have any questions, please reply to this email.

Best regards,
[Lawyer Name]
```

**3. Intake Received Confirmation**
```
Subject: Intake Form Received - [Firm Name]

Hi [Client Name],

Thank you for completing your intake form. I've received your submission and will review it shortly.

I'll be in touch within [timeframe, e.g., 2 business days] with next steps.

Best regards,
[Lawyer Name]
```

**4. Client Acceptance Email**
```
Subject: Welcome to [Firm Name]

Hi [Client Name],

I'm pleased to let you know I'll be taking on your [Matter Type] matter.

Next Steps:
[Lawyer adds custom next steps or uses template]

I look forward to working with you.

Best regards,
[Lawyer Name]
[Email Signature]
```

**5. Decline Email**
```
Subject: Update on Your Intake Submission

Hi [Client Name],

Thank you for taking the time to complete the intake form for your [Matter Type] matter.

[Lawyer's personalized message or template]

I wish you the best in resolving this matter.

[Optional: Referral section]
You may want to contact:
- [Referral 1]
- [Referral 2]

Best regards,
[Lawyer Name]
```

**6. Appointment Scheduled**
```
Subject: Appointment Scheduled - [Firm Name]

Hi [Client Name],

Your appointment has been scheduled:

Date & Time: [Date] at [Time]
Duration: [Duration]
Type: [Phone/Video/In-person]
[If video: Meeting Link: [Link]]

I look forward to speaking with you.

[Calendar invite attached]

Best regards,
[Lawyer Name]
```

### Email Customization Settings

**Location:** Settings → Email

**Customizable Elements:**
- Firm logo (appears in header)
- Primary color (for buttons/accents)
- Email signature (appended to all emails)
- "From" name (defaults to firm name from practice settings)
- Reply-to email
- Footer text (legal disclaimers, unsubscribe link)

**Template Editing:**
- Each email type has editable template
- Variables available: {client_name}, {matter_type}, {lawyer_name}, {firm_name}, {date}, {link}
- Preview before saving
- Reset to default option

---

## Data Model Changes

### New Tables

#### `client_invitations`
```sql
CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  matter_type TEXT,
  notes TEXT,
  documents JSONB, -- Array of document metadata
  status TEXT NOT NULL, -- 'pending', 'completed', 'expired', 'cancelled'
  invited_by UUID REFERENCES profiles(user_id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `info_requests`
```sql
CREATE TABLE info_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_response_id UUID REFERENCES intake_responses(id),
  requested_by UUID REFERENCES profiles(user_id),
  questions JSONB NOT NULL, -- Array of structured questions
  message TEXT, -- Free-form message
  documents JSONB, -- Attached documents
  response_deadline TIMESTAMPTZ,
  status TEXT NOT NULL, -- 'pending', 'completed'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responses JSONB, -- Client's responses
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `client_timeline`
```sql
CREATE TABLE client_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(user_id),
  event_type TEXT NOT NULL, -- 'invited', 'intake_submitted', 'accepted', 'matter_created', 'document_uploaded', 'invoice_sent', etc.
  event_data JSONB, -- Flexible metadata per event type
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Modified Tables

#### `profiles` (add client status field)
```sql
ALTER TABLE profiles
  ADD COLUMN client_status TEXT, -- 'invited', 'intake_submitted', 'under_review', 'active', 'past'
  ADD COLUMN client_notes TEXT, -- Internal notes about client
  ADD COLUMN phone TEXT,
  ADD COLUMN address TEXT;
```

#### `intake_responses` (add status tracking)
```sql
ALTER TABLE intake_responses
  ADD COLUMN review_status TEXT, -- 'pending', 'under_review', 'accepted', 'declined'
  ADD COLUMN reviewed_by UUID REFERENCES profiles(user_id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN internal_notes TEXT, -- Lawyer's private notes
  ADD COLUMN decline_reason TEXT;
```

---

## Component Architecture

### New Components

**1. `/clients/page.tsx`** - Main clients page with pipeline board
**2. `/clients/[clientId]/page.tsx`** - Client detail dashboard
**3. `/components/clients/pipeline-board.tsx`** - Kanban board component
**4. `/components/clients/client-card.tsx`** - Reusable client card
**5. `/components/clients/invite-modal.tsx`** - New client invitation form
**6. `/components/clients/intake-review-modal.tsx`** - Full intake review interface
**7. `/components/clients/info-request-composer.tsx`** - Additional info request builder
**8. `/components/clients/client-detail-dashboard.tsx`** - Dashboard layout with cards
**9. `/components/clients/manual-client-form.tsx`** - Manual client creation
**10. `/components/clients/decline-modal.tsx`** - Decline with reason

### Updated Components

**1. `/app/matters/page.tsx`** - Enhanced matter creation with inline client creation
**2. `/components/app-shell.tsx`** - Add "Clients" to navigation
**3. `/lib/data/actions.ts`** - New actions for invitations, info requests, client management
**4. `/lib/data/queries.ts`** - New queries for clients, pipeline states

---

## Implementation Notes

### Phase 1: Core Pipeline (Week 1)
- Add "Clients" navigation
- Build pipeline board (Kanban)
- Implement invite flow (form + email)
- Create Intake Review modal
- Accept/Decline actions

### Phase 2: Enhanced Review (Week 2)
- Info request composer
- Structured + free-form questions
- Client response handling
- Schedule call integration

### Phase 3: Client Management (Week 3)
- Active/Past clients sections
- Client detail dashboard
- Manual client creation
- Reactivation flow

### Phase 4: Polish & Integration (Week 4)
- Email templates customization
- Timeline/activity feed
- Search/filter improvements
- Updated matter creation flow

---

## Success Metrics

**Efficiency:**
- Time from invitation to accepted client < 3 days
- Reduction in back-and-forth emails via structured info requests

**User Experience:**
- Clear visual status of all prospects (pipeline)
- One-click access to client context
- Minimal clicks to perform common actions

**Data Quality:**
- Structured intake data vs. email threads
- Complete client contact information
- Documented decision rationale (notes)

---

## Open Questions / Future Enhancements

1. **Bulk operations** - Accept multiple intakes at once?
2. **Tags/labels** - Categorize clients beyond matter type?
3. **Client portal** - Let clients log in to see their matters?
4. **Automated reminders** - Remind clients to complete intake if expired?
5. **Analytics** - Conversion rate from invited → active?
6. **Mobile optimization** - Pipeline board on mobile?
7. **Conflict checking** - Integrate conflict check in review flow?

---

## Conclusion

This design transforms client intake from an ad-hoc email process into a structured, visual workflow. The pipeline board gives immediate visibility into the client acquisition funnel, while flexible manual entry points preserve autonomy for edge cases. Personalized communication maintains the solo practitioner's relationship-focused approach at scale.
