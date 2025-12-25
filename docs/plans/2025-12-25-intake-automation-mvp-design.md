# Intake Automation MVP - Design Document

**Date:** 2025-12-25
**Status:** Approved for Implementation
**Target Users:** Solo practitioners currently doing manual email intake + data entry

## Executive Summary

This design eliminates manual email tennis and data entry for client intake. When a lawyer creates a matter, the system automatically emails the client an intake form link, client fills it out, and the matter auto-advances with lawyer notification. Dashboard clearly shows what needs attention.

**Core Value Proposition:** "You create a matter, we email your client, they fill the form themselves, and it shows up ready for you to review. Zero data entry."

## Success Criteria

- Lawyer creates matter in < 30 seconds
- Client receives intake email within 1 minute
- Client can complete form without lawyer assistance
- Matter auto-advances to "Intake Received" on submission
- Lawyer sees "Needs Review" on dashboard within seconds
- Lawyer can approve intake in < 2 clicks
- Complete flow works end-to-end with zero manual email/data entry

## User Story Flow

### 1. Lawyer Creates Matter

**Location:** `/matters` page
**User:** Lawyer (admin/staff role)

**Current Behavior:**
- Matter creation form requires all fields including `next_action` and `next_action_due_date`
- No automatic stage setting
- Email sends to `/matters/${matterId}` (wrong link)

**New Behavior:**

When lawyer creates matter WITH `clientId`:
- **Automatic field population:**
  - `stage = "Intake Sent"`
  - `responsible_party = "client"`
  - `next_action = "Complete intake form"`
  - `next_action_due_date = today + 3 days`

- **Email sent to client:**
  - Subject: "Complete Your Intake Form - [Matter Title]"
  - Body: Clear explanation + big CTA button
  - Link: `/intake/${matterId}` ✅ (not `/matters/${matterId}`)

- **Visual feedback on form:**
  - Show: "✉️ Client will receive intake form email"
  - Optional checkbox: "Skip intake" (sets stage to "Lead Created", no email)

**Implementation Notes:**
- Modify `createMatter()` in `src/lib/data/actions.ts:60`
- Update `MatterCreatedEmail` template in `src/lib/email/templates/matter-created.tsx`
- Add conditional logic: if `clientId` exists, auto-populate fields above

---

### 2. Client Receives Email

**Email Template:** `MatterCreatedEmail`
**Recipient:** Client email from `auth.users`

**Email Content Changes:**

**Subject:**
```
Complete Your Intake Form - [Matter Title]
```

**Body Structure:**
```
Hi [Client Name],

Welcome! We're ready to start working on your [Matter Type].

To get started, please complete your intake form. This helps us understand
your situation and provide the best possible service.

**What to expect:**
- Takes about 10-15 minutes
- You can save your progress anytime
- We'll review it within 2 business days

[BIG BUTTON: Complete Intake Form]
(Links to: /intake/[matterId])

Questions? Reply to this email or contact [Lawyer Name].

Thank you,
[Lawyer Name]
```

**Implementation Notes:**
- Update `src/lib/email/templates/matter-created.tsx`
- Change button href from `matterLink` to `intakeLink`
- Pass `intakeLink` instead of `matterLink` from action
- Add copy explaining the intake process

---

### 3. Client Fills Form

**Location:** `/intake/[matterId]`
**User:** Client (via email link, no auth required for MVP)

**Current Behavior:**
- Page exists ✅
- Form renders from template ✅
- Client can save draft ✅
- Client can submit ✅
- Validation happens server-side ✅

**Enhanced Behavior:**

**Landing Page:**
- Show matter details at top:
  - Matter title
  - Matter type
  - Lawyer name
  - Firm name
- Progress saved indicator: "Last saved: 2 minutes ago"
- "Save Draft" button always visible
- Clear "Submit" CTA at bottom

**Form Behavior:**
- Auto-save draft every 30 seconds (prevent data loss)
- Inline validation errors (not just on submit)
- File uploads integrate with Google Drive
- Show character counts for text areas
- Disable submit until required fields complete

**Post-Submit Redirect:**
- Show simple "Thank You" page (not dashboard)
- Message: "Thank you! Your attorney will review this shortly."
- Info: "We've notified [Lawyer Name]. You'll hear from us within 2 business days."
- "You can close this window" instruction

**Implementation Notes:**
- Current client component at `src/app/intake/[matterId]/intake-form-client.tsx` already handles most of this
- Add auto-save logic with `saveIntakeFormDraft()` on interval
- Create `/intake/[matterId]/thank-you` route for post-submit
- Add inline validation to form fields

---

### 4. System Auto-Advances

**Trigger:** Client submits intake form
**Action:** `submitIntakeForm()` in `src/lib/intake/actions.ts:152`

**Current Behavior:**
- Validates form ✅
- Saves to `intake_responses` table ✅
- Advances "Intake Sent" → "Intake Received" ✅
- Sends email to lawyer ✅

**Enhanced Behavior:**

**Stage Transition:**
```javascript
// When submitIntakeForm() succeeds:
{
  stage: "Intake Sent" → "Intake Received",
  responsible_party: "client" → "lawyer",
  next_action: "Review intake form",
  next_action_due_date: submitted_date + 2 days,
  intake_received_at: new Date().toISOString() // for metrics
}
```

**Lawyer Notification Email:**
- **Subject:** "Intake Form Submitted - [Client Name]"
- **Body:**
  - "New intake form ready for review"
  - Quick summary: client name, matter type, submission time
  - Key field preview (1-2 important answers)
  - Big CTA: "Review Intake Form" → `/admin/intake/[intakeResponseId]`

**Audit Log:**
```javascript
{
  event_type: "intake_form_submitted",
  actor_id: clientUserId,
  entity_type: "matter",
  entity_id: matterId,
  metadata: {
    form_type: formType,
    field_count: Object.keys(responses).length,
    submitted_at: timestamp
  }
}
```

**Implementation Notes:**
- Most logic already exists in `submitIntakeForm()`
- Add `intake_received_at` field to matters table (migration)
- Enhance lawyer notification email template `IntakeSubmittedEmail`
- Add key field preview logic to email

---

### 5. Lawyer Sees Dashboard

**Location:** `/dashboard`
**User:** Lawyer (admin/staff role)

**Current Behavior:**
- Shows matters, tasks, time, billing in separate cards
- No clear priority or "what needs attention" view

**New Behavior:**

**Section 1: "Needs Your Attention" (Top Priority)**

```
┌─────────────────────────────────────────────────────┐
│ 🔔 NEEDS YOUR ATTENTION                             │
├─────────────────────────────────────────────────────┤
│ ✅ Awaiting Your Review (2)                         │
│   • Sarah Johnson - Contract Review                 │
│     Submitted 3 hours ago                           │
│     [Review Intake →]                               │
│                                                      │
│   • Mike Thompson - Employment Agreement            │
│     Submitted 1 day ago                             │
│     [Review Intake →]                               │
├─────────────────────────────────────────────────────┤
│ ⚠️ Overdue Next Actions (1)                         │
│   • Davis Estate Planning                           │
│     Next: "Send draft will to client"               │
│     Overdue by 2 days                               │
│     [View Matter →]                                 │
└─────────────────────────────────────────────────────┘
```

**Section 2: "Waiting on Client"**

```
┌─────────────────────────────────────────────────────┐
│ 📧 WAITING ON CLIENT                                │
├─────────────────────────────────────────────────────┤
│ ⏳ Awaiting Intake (3)                              │
│   • Alex Rivera - Policy Review                     │
│     Sent 1 day ago                                  │
│     [Send Reminder] [View Matter]                   │
│                                                      │
│   • Jordan Kim - Compliance                         │
│     Sent 5 days ago                                 │
│     Reminder sent 2 days ago                        │
│     [Send Reminder] [View Matter]                   │
├─────────────────────────────────────────────────────┤
│ 👤 Client Action Required (2)                       │
│   • Martinez Trust - Review draft documents         │
│     Waiting 4 days                                  │
│     [View Matter →]                                 │
└─────────────────────────────────────────────────────┘
```

**Visual Indicators:**

**Stage Badges:**
- 🔵 Blue: "Intake Sent" (waiting on client)
- 🟢 Green: "Intake Received" (needs your review)
- 🟡 Yellow: "Waiting on Client" (other stages)
- ⚪ Gray: "Completed" / "Archived"

**Responsibility Icons:**
- 👤 "Your turn" (lawyer/staff responsible)
- 📧 "Client's turn" (client responsible)

**Time Indicators:**
- 🟠 "Due today" (amber warning)
- 🔴 "Overdue 3 days" (red alert)
- Normal text: "Due in 2 days"

**Implementation Notes:**
- Major refactor of `/dashboard/page.tsx`
- Query matters with filters:
  - `stage = "Intake Received"` for "Awaiting Review"
  - `stage = "Intake Sent"` for "Awaiting Intake"
  - `responsible_party = "lawyer" AND next_action_due_date < today` for "Overdue"
- Create new components: `AttentionSection`, `WaitingOnClientSection`
- Add stage badge component with color mapping
- Add responsibility icon component

---

### 6. Lawyer Reviews & Approves

**Location:** `/admin/intake/[intakeResponseId]`
**User:** Lawyer (admin/staff role)

**Current Behavior:**
- Page exists ✅
- Shows intake form responses ✅
- `approveIntakeForm()` action exists ✅

**Enhanced Behavior:**

**Review Page UI:**

```
┌─────────────────────────────────────────────────────┐
│ Contract Review - Sarah Johnson                     │
│ Submitted: Dec 24, 2025 at 3:45 PM                  │
│ Status: [Submitted]                                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│ PERSONAL INFORMATION                                │
│ ────────────────────────────────────────            │
│ Full Name: Sarah Johnson                            │
│ Email: sarah@example.com                            │
│ Phone: (555) 123-4567                               │
│                                                      │
│ CONTRACT DETAILS                                    │
│ ────────────────────────────────────────            │
│ Contract Type: Employment Agreement                 │
│ Parties Involved: Sarah Johnson, TechCorp Inc.      │
│ Contract Date: December 1, 2025                     │
│                                                      │
│ UPLOADED DOCUMENTS                                  │
│ ────────────────────────────────────────            │
│ 📄 employment_contract.pdf (2.3 MB)                 │
│    [Download] [View in Drive]                       │
│                                                      │
├─────────────────────────────────────────────────────┤
│ [Approve & Advance] [View Matter] [Download PDF]    │
└─────────────────────────────────────────────────────┘
```

**Approval Action:**

When lawyer clicks "Approve & Advance":

1. **Update intake response:**
   - `status = "approved"`
   - `approved_at = now()`
   - `approved_by = lawyer_user_id`

2. **Update matter:**
   - `stage = "Intake Received" → "Under Review"`
   - `responsible_party = "lawyer"`
   - `next_action = "Begin document review"`
   - `next_action_due_date = approval_date + 2 days`

3. **Audit log:**
   ```javascript
   {
     event_type: "intake_form_approved",
     actor_id: lawyerUserId,
     entity_type: "matter",
     entity_id: matterId,
     metadata: {
       intake_response_id: intakeResponseId,
       approved_at: timestamp
     }
   }
   ```

4. **Success feedback:**
   - Toast/banner: "✓ Intake approved. Matter advanced to Under Review."
   - Options:
     - "Review next intake" (if more pending)
     - "Back to dashboard"

**Implementation Notes:**
- Update `approveIntakeForm()` in `src/lib/intake/actions.ts`
- Add stage transition logic: "Intake Received" → "Under Review"
- Update next action and responsible party
- Add success toast/notification component
- Enhance review page UI with better formatting

---

## Technical Implementation Checklist

### Database Changes

**Add field to `matters` table:**
```sql
ALTER TABLE matters
ADD COLUMN intake_received_at TIMESTAMPTZ;
```

### Code Changes

**1. Matter Creation (`src/lib/data/actions.ts`)**
- [ ] Detect if `clientId` exists in form data
- [ ] Auto-set `stage = "Intake Sent"` when client exists
- [ ] Auto-set `responsible_party = "client"`
- [ ] Auto-set `next_action = "Complete intake form"`
- [ ] Auto-set `next_action_due_date = today + 3 days`
- [ ] Pass `intakeLink` to email instead of `matterLink`

**2. Email Template (`src/lib/email/templates/matter-created.tsx`)**
- [ ] Update subject line
- [ ] Rewrite body copy to focus on intake form
- [ ] Change button text to "Complete Intake Form"
- [ ] Change button href to use `intakeLink` prop
- [ ] Add intake process explanation

**3. Intake Form Client (`src/app/intake/[matterId]/intake-form-client.tsx`)**
- [ ] Add auto-save on 30-second interval
- [ ] Add "last saved" indicator
- [ ] Add inline validation
- [ ] Redirect to thank-you page on submit

**4. Intake Form Submission (`src/lib/intake/actions.ts`)**
- [ ] Update `submitIntakeForm()` to set `intake_received_at`
- [ ] Update next action fields on matter
- [ ] Enhance lawyer notification email with field preview
- [ ] Add audit log entry

**5. Intake Approval (`src/lib/intake/actions.ts`)**
- [ ] Update `approveIntakeForm()` to advance stage to "Under Review"
- [ ] Set next action and due date
- [ ] Add audit log entry
- [ ] Return success message

**6. Dashboard (`src/app/dashboard/page.tsx`)**
- [ ] Create "Needs Your Attention" section
- [ ] Create "Waiting on Client" section
- [ ] Add queries for each section
- [ ] Create stage badge component
- [ ] Create responsibility icon component
- [ ] Add time indicator logic (overdue, due today, etc.)
- [ ] Add click handlers to navigate to review/matter pages

**7. Intake Review Page (`src/app/admin/intake/[intakeId]/page.tsx`)**
- [ ] Improve response display formatting
- [ ] Add "Approve & Advance" button
- [ ] Add success notification on approval
- [ ] Add "Review next" navigation option

### Testing Checklist

**End-to-End Flow:**
- [ ] Create matter with client email
- [ ] Verify email received with correct intake link
- [ ] Open intake form as client
- [ ] Fill and submit form
- [ ] Verify matter advanced to "Intake Received"
- [ ] Verify lawyer received notification email
- [ ] Check dashboard shows intake in "Needs Review"
- [ ] Open review page and approve
- [ ] Verify matter advanced to "Under Review"
- [ ] Verify dashboard updated

**Edge Cases:**
- [ ] Matter created without client (should skip intake)
- [ ] Client saves draft but doesn't submit
- [ ] Client submits with invalid data (validation works)
- [ ] Email fails to send (matter still created)
- [ ] Multiple pending intakes (dashboard shows all)
- [ ] Lawyer approves twice (idempotent)

## Success Metrics (Post-Launch)

**Quantitative:**
- Time to create matter: < 30 seconds
- Intake completion rate: > 80%
- Time to approve intake: < 2 minutes
- Email delivery rate: > 99%

**Qualitative:**
- Lawyer feedback: "Saves me hours per week"
- Client feedback: "Easy to understand and complete"
- Zero lost intake forms
- Zero duplicate data entry

## Out of Scope (See Phase 2 Document)

❌ AI conflict checking
❌ AI intake extraction from documents
❌ Client portal beyond intake form
❌ Intake reminder automations (cron)
❌ "Request Changes" workflow
❌ Multi-page intake forms
❌ Conditional field logic

These features are documented in `2025-12-25-intake-automation-phase-2.md` and will be considered after MVP validation.

---

**Next Steps:**
1. Review and approve this design ✅
2. Create implementation plan with task breakdown
3. Set up git worktree for isolated development
4. Begin implementation following checklist above
5. Test thoroughly before demo
