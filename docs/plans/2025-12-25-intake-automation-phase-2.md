# Intake Automation - Phase 2 Features

**Date:** 2025-12-25
**Status:** Future Roadmap (Post-MVP)
**Prerequisite:** MVP must be validated by users first

## DO NOT BUILD UNTIL MVP IS COMPLETE AND VALIDATED

This document contains advanced features that were explicitly excluded from the MVP to maintain focus and speed. These features should only be considered after:

1. ✅ MVP is fully implemented and tested
2. ✅ Real lawyers have used it for at least 2 weeks
3. ✅ We have feedback confirming the core flow works
4. ✅ Users are asking for these specific features

**DO NOT START ANY OF THESE FEATURES WITHOUT EXPLICIT APPROVAL.**

---

## Phase 2 Feature List

### 1. AI Document-Based Intake Extraction

**Problem:** For existing clients or when lawyers already have documents, they shouldn't manually fill intake forms.

**Solution:** Upload documents → AI extracts data → Pre-fills intake form → Lawyer reviews → Saves as submitted

**User Flow:**

1. Lawyer creates matter (without sending client email)
2. Lawyer navigates to intake tab on matter detail page
3. Uploads documents (contract, previous correspondence, etc.)
4. Clicks "Extract Intake Data from Documents"
5. AI processes documents and fills form fields
6. Lawyer reviews AI-extracted data in form preview
7. Edits any incorrect/missing fields
8. Clicks "Approve as Submitted"
9. Matter advances to "Under Review" (skips client email entirely)

**Technical Requirements:**

- **Document Processing:**
  - Parse PDFs, DOCX, emails
  - Extract text with layout preservation
  - OCR for scanned documents

- **AI Extraction:**
  - Use Claude to map document content to intake form fields
  - Confidence scoring per field
  - Flag low-confidence fields for manual review

- **UI Components:**
  - Document upload zone on matter page
  - "Extract with AI" button
  - Field-by-field review interface
  - Confidence indicators (high/medium/low)

**Success Criteria:**
- 80%+ field accuracy for standard contracts
- < 2 minutes to review and approve AI extraction
- Lawyers prefer this over manual entry

**Estimated Effort:** 2-3 weeks

---

### 2. Automated Conflict Checking

**Problem:** Manual conflict checking is time-consuming and error-prone.

**Solution:** AI scans client names, organizations, and related parties across all matters to detect potential conflicts.

**User Flow:**

**Automatic (Background):**
1. Intake form submitted → triggers background conflict check
2. AI scans:
   - Client name + aliases
   - Organizations mentioned
   - Related party names from documents
   - Previous matters with similar parties
3. If no conflicts found → auto-advance to "Under Review"
4. If potential conflicts → stop at "Conflict Check" stage

**Manual Review (When Conflicts Detected):**
1. Lawyer sees "Potential Conflict Detected" on dashboard
2. Opens conflict review page
3. Sees:
   - Match list with confidence scores
   - Similar client/party names
   - Past matters involved
   - Relationship explanation
4. Lawyer chooses:
   - "No conflict - proceed"
   - "Conflict exists - decline matter"
   - "Need more info - investigate"

**Technical Requirements:**

- **Conflict Detection Algorithm:**
  - Fuzzy name matching (handle misspellings, variations)
  - Organization matching across matters
  - Parse party names from intake responses
  - Parse party names from uploaded documents
  - Cross-reference against all historical matters

- **Confidence Scoring:**
  - Exact match: 100%
  - Slight variation (John Smith vs Jon Smith): 85%
  - Different but related org: 60%
  - Family member relationship: 70%

- **Database Changes:**
  - `conflict_checks` table
  - Store matches, confidence scores, resolution
  - Link to matters

**UI Components:**
- Conflict review dashboard page
- Match comparison view
- One-click resolution actions

**Success Criteria:**
- Catch 95%+ true conflicts
- < 10% false positive rate
- < 30 seconds for lawyer to review and resolve

**Estimated Effort:** 3-4 weeks

---

### 3. Client Portal Access

**Problem:** Clients should be able to view their matter status, not just fill intake forms.

**Solution:** Give clients read-only dashboard access to see matter progress, documents, and invoices.

**Features:**

**Client Dashboard:**
- Current matter status and stage
- Next action (what they need to do)
- Document list (view-only, download)
- Invoice history with payment links
- Communication timeline
- Upload additional documents

**Client Matter Detail Page:**
- Full matter timeline
- Task list (client-assigned tasks only)
- Document library organized by folder
- Billing summary

**Technical Requirements:**

- **Authentication:**
  - Client role already exists ✅
  - Add client-specific dashboard route
  - RLS policies already restrict to own matters ✅

- **UI Components:**
  - Client-facing dashboard (simplified, non-technical)
  - Matter progress tracker visual
  - Document viewer/download
  - File upload widget

- **Permissions:**
  - Clients can only see their own matters
  - Cannot edit anything except upload documents
  - Cannot see internal notes/tasks

**Success Criteria:**
- Clients check status themselves (reduce "what's the status?" emails)
- Clients can find documents without asking
- Clients pay invoices faster (direct access to payment links)

**Estimated Effort:** 2-3 weeks

---

### 4. Automated Intake Reminders

**Problem:** Clients forget to complete intake forms. Lawyers manually send reminder emails.

**Solution:** Automated email reminders based on time elapsed since "Intake Sent"

**Reminder Schedule:**

- **24 hours after sent:** "Friendly reminder to complete intake"
- **3 days after sent:** "We're waiting on your intake form"
- **7 days after sent:** "Final reminder - please complete intake"
- **After 7 days:** Lawyer gets notification "Client hasn't completed intake in 7+ days"

**User Flow:**

1. Cron job runs daily at 9am
2. Queries matters in "Intake Sent" stage
3. Checks `created_at` timestamp
4. Sends reminder if threshold crossed
5. Logs reminder sent to prevent duplicates
6. Lawyer can manually send reminder from dashboard anytime

**Technical Requirements:**

- **Cron Job:**
  - `/api/cron/intake-reminders` endpoint
  - Run daily via Vercel Cron or external scheduler
  - Query matters with reminders due
  - Send emails via Resend

- **Reminder Tracking:**
  - Add `intake_reminders_sent` JSONB field to matters
  - Store: `[{ sent_at, reminder_type: "24h" | "3d" | "7d" }]`
  - Prevent duplicate reminders

- **Email Templates:**
  - 24h reminder: Friendly, helpful tone
  - 3d reminder: More urgent, offer help
  - 7d reminder: "We need this to proceed" tone

- **Manual Override:**
  - "Send Reminder Now" button on dashboard
  - Lawyer can customize reminder message

**Success Criteria:**
- Intake completion rate increases by 20%+
- Reduce time-to-completion from avg 4 days to 2 days
- Lawyers rarely need to send manual reminders

**Estimated Effort:** 1-2 weeks

---

### 5. "Request Changes" Workflow

**Problem:** Sometimes intake responses are incomplete or need clarification. Lawyer has to email client manually.

**Solution:** Lawyer can request specific changes from intake review page, system emails client with direct link to edit.

**User Flow:**

1. Lawyer reviews intake form
2. Sees missing/incorrect fields
3. Clicks "Request Changes"
4. Adds comments per field:
   - "Please clarify the contract start date"
   - "Missing signature page - please upload"
5. Clicks "Send Change Request"
6. Client receives email with:
   - List of requested changes
   - Link to edit form (pre-filled with existing data)
   - Highlighted fields needing attention
7. Client edits and resubmits
8. Matter stays in "Intake Received" stage
9. Lawyer gets notification "Changes submitted"
10. Lawyer reviews again

**Technical Requirements:**

- **Database Changes:**
  - `intake_change_requests` table
  - Store: matter_id, requested_by, requested_at, comments, status

- **UI Changes:**
  - "Request Changes" button on review page
  - Modal to add field-specific comments
  - Highlight requested fields on client form

- **Email Template:**
  - "Your attorney requested some changes to your intake form"
  - List specific fields and comments
  - CTA to edit form

- **Form Pre-filling:**
  - Client sees existing responses
  - Requested fields highlighted in yellow
  - Comments shown inline

**Success Criteria:**
- Reduce back-and-forth email by 50%
- Clients know exactly what to fix
- Changes submitted within 24 hours

**Estimated Effort:** 2 weeks

---

### 6. Multi-Page Intake Forms

**Problem:** Long intake forms are overwhelming. Better UX to break into sections.

**Solution:** Paginated intake forms with progress indicator and section-based validation.

**Features:**

- **Form Structure:**
  - Split templates into sections/pages
  - "Personal Info" → "Matter Details" → "Documents" → "Review"
  - Progress bar: "Page 2 of 4"
  - "Next" / "Previous" buttons

- **Validation:**
  - Per-page validation (can't advance with errors)
  - Overall progress saved
  - Can jump to any completed page

- **Draft Saving:**
  - Auto-save after each page
  - "You've completed 2 of 4 sections"

**Technical Requirements:**

- **Template Schema Changes:**
  - Add `sections` array to templates
  - Each section has fields + title + description

- **Client UI:**
  - Page navigation component
  - Progress bar component
  - Section-based form renderer

- **State Management:**
  - Track current page
  - Track completed sections
  - Validate per section

**Success Criteria:**
- Higher completion rate for long forms
- Lower abandonment rate
- Positive client feedback on UX

**Estimated Effort:** 1-2 weeks

---

### 7. Conditional Field Logic

**Problem:** Not all questions apply to all clients. Showing irrelevant fields is confusing.

**Solution:** Show/hide fields based on previous answers.

**Examples:**

- "Do you have an existing contract?" → Yes → Show "Upload contract"
- "Entity type?" → LLC → Show "LLC formation date", hide "S-corp" fields
- "Are there other parties?" → Yes → Show "Party names" field

**Technical Requirements:**

- **Template Schema:**
  - Add `conditional` property to fields:
    ```json
    {
      "field": "upload_contract",
      "showIf": {
        "field": "has_existing_contract",
        "equals": "yes"
      }
    }
    ```

- **Client UI:**
  - Real-time show/hide based on answers
  - Validation only applies to visible fields
  - Clear UX when fields appear/disappear

**Success Criteria:**
- Forms feel personalized
- Clients skip irrelevant questions
- Faster completion time

**Estimated Effort:** 1-2 weeks

---

## Prioritization After MVP

Once MVP is validated, prioritize Phase 2 features based on:

1. **User feedback** - what are lawyers asking for most?
2. **Impact** - which saves the most time?
3. **Effort** - quick wins vs long-term investments

**Suggested Order:**

1. **Automated Intake Reminders** (quick win, high impact)
2. **AI Document Extraction** (huge time-saver, differentiator)
3. **Automated Conflict Checking** (reduces risk, saves time)
4. **Client Portal Access** (reduces "status update" emails)
5. **Request Changes Workflow** (quality improvement)
6. **Multi-Page Forms** (UX enhancement)
7. **Conditional Fields** (nice-to-have polish)

---

## Notes on AI Features

Both AI-powered features (document extraction, conflict checking) require:

- **Claude API integration** (already have SDK access)
- **Prompt engineering** and testing
- **Human-in-the-loop** design (AI suggests, human approves)
- **Audit logging** of all AI actions
- **Cost monitoring** (API calls add up)

**Important:** Never let AI auto-execute legal decisions. Always require lawyer approval.

---

**Remember:** DO NOT BUILD ANY OF THESE UNTIL MVP IS VALIDATED BY REAL USERS.
