# MatterFlow Launch Scope Design

**Date:** 2026-01-27
**Status:** Approved
**Stakeholders:** Brian (Developer), Client (Solo Practitioner)

## Executive Summary

This document defines the launch scope for MatterFlow, refined from the original PRD through client collaboration. The goal is to replace CaseFox as the single source of truth for matter management, billing, and client communication.

**Target User:** Solo practitioner lawyer serving therapists and professional practices.

**Primary Workflows:**
- Policy Review (highest volume) - Hourly billing
- Contract Review - Hourly billing
- Wills / Professional Wills - Flat fee billing

## What's Ready for Launch

These features are built and tested:

### Core Matter Management
- Matter pipeline (11 stages: Lead Created → Archived)
- Next Action + Due Date (required per matter)
- Responsible Party tracking (Lawyer vs Client)
- Matter types: Policy Review, Contract Review, Wills

### Billing & Time Tracking
- Timer-based time tracking (< 2 clicks to start/stop)
- Timer persists across page navigation
- Manual time entry
- Hourly and flat fee billing models
- Invoice creation with line items
- Square sync on invoice send
- Payment webhooks update status automatically
- Payment confirmation emails

### Client Portal
- Client authentication
- View own matters and status
- View and pay invoices via Square link
- Upload documents
- Complete intake forms (dynamic per matter type)
- Draft saving for intake forms

### Email System (Sending)
- Matter created notification
- Intake reminders (24h)
- Client/Lawyer activity reminders
- Invoice sent with payment link
- Invoice overdue reminders (3, 7, 14 days)
- Payment received confirmation
- Task assignment notifications
- Configurable branding (firm name, logo, colors) - *needs commit*

### Document Management
- Google Drive OAuth integration
- Auto-create folder structure per matter
- Upload documents to correct folder
- Document metadata stored in database
- Share documents with clients

### Dashboard
- "Waiting on me" view (primary)
- "Waiting on client" view
- Tasks due today / overdue
- Unpaid invoices
- New leads aging

## Features to Build (Required for Launch)

### Feature 1: Gmail Incoming Email Sync

**Purpose:** Unified communication timeline per matter.

**Implementation:**

1. **Gmail API Integration**
   - Use existing Google OAuth credentials
   - Request `gmail.readonly` scope
   - Store consent in user profile

2. **Sync Logic**
   - Background job runs every 15 minutes
   - Query Gmail for emails TO/FROM client email addresses
   - Match client email → matter via `profiles.email`
   - Store in new `matter_emails` table

3. **Data Stored Per Email**
   - `gmail_message_id` (unique identifier)
   - `matter_id` (linked matter)
   - `direction` (sent/received)
   - `from_email`, `to_email`
   - `subject`
   - `snippet` (first ~200 chars from Gmail)
   - `ai_summary` (1-2 sentence summary)
   - `action_needed` (boolean: does this need response?)
   - `gmail_date`
   - `synced_at`

4. **AI Summary Generation**
   - Process on first sync
   - Input: subject + snippet
   - Output: Plain language summary + action flag
   - Example: "Client confirmed she'll send the employee handbook by Friday. Waiting on her action."

5. **UI: Communications Tab**
   - New tab on matter detail page
   - Chronological list (newest first)
   - Shows: direction icon, date, from, subject, AI summary
   - "Open in Gmail" link per email
   - "Refresh" button for manual sync

**Database Schema:**
```sql
CREATE TABLE matter_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id),
  gmail_message_id TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  ai_summary TEXT,
  action_needed BOOLEAN DEFAULT FALSE,
  gmail_date TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matter_emails_matter ON matter_emails(matter_id);
CREATE INDEX idx_matter_emails_gmail_date ON matter_emails(gmail_date DESC);
```

---

### Feature 2: Automation Configuration UI

**Purpose:** Admin control over reminder timing without code changes.

**Implementation:**

1. **Settings Storage**
   - Use existing `firm_settings` table
   - Add automation-specific keys

2. **Configurable Values**
   | Key | Default | Description |
   |-----|---------|-------------|
   | `automation_intake_reminder_enabled` | true | Toggle intake reminders |
   | `automation_intake_reminder_hours` | 24 | Hours after matter created |
   | `automation_client_idle_enabled` | true | Toggle client idle reminders |
   | `automation_client_idle_days` | 3 | Days of inactivity |
   | `automation_lawyer_idle_enabled` | true | Toggle lawyer idle alerts |
   | `automation_lawyer_idle_days` | 7 | Days of inactivity |
   | `automation_invoice_reminder_enabled` | true | Toggle invoice reminders |
   | `automation_invoice_reminder_days` | [3,7,14] | Days overdue to send |

3. **UI: `/admin/settings/automations`**
   - Checkbox to enable/disable each automation
   - Number input for timing values
   - Save button with success confirmation
   - Preview of what each automation does

4. **Cron Job Updates**
   - Modify `/api/cron/email-automations` to read from `firm_settings`
   - Respect enabled/disabled flags
   - Use configured timing values

---

### Feature 3: AI Document Summary

**Purpose:** Auto-identify document type and summarize on upload.

**Implementation:**

1. **Trigger**
   - Runs after successful Google Drive upload
   - Before returning success to user

2. **Text Extraction**
   - PDF: Use `pdf-parse` or Google Drive API native extraction
   - Word docs: Use `mammoth` or Drive API
   - Images: Use Google Cloud Vision OCR (or defer OCR to v2)

3. **AI Analysis**
   - Input: First 2000 chars of extracted text + filename
   - Output:
     - `document_type`: Enum (Contract, Policy, Employee Handbook, Insurance Form, Correspondence, Invoice, Other)
     - `summary`: 2-3 sentences describing the document
     - `suggested_folder`: Based on type (01 Source Docs, 02 Work Product, etc.)

4. **Database Updates**
   - Add columns to `documents` table:
   ```sql
   ALTER TABLE documents ADD COLUMN document_type TEXT;
   ALTER TABLE documents ADD COLUMN ai_summary TEXT;
   ALTER TABLE documents ADD COLUMN suggested_folder TEXT;
   ALTER TABLE documents ADD COLUMN ai_processed_at TIMESTAMPTZ;
   ```

5. **UI Updates**
   - Document list shows type badge and summary
   - Upload confirmation shows AI analysis
   - "Move to suggested folder" button if not already there

---

## Features Cut from Original PRD

| Feature | PRD Section | Reason |
|---------|-------------|--------|
| Staff/Paralegal role | 3. Target Users | Solo practice, no staff needed |
| Conflict Check AI Agent | 5.3 | Manual is sufficient for known clients |
| Package auto-task generation | 5.6 | Hourly billing primary, flat fee is simple |
| Hybrid billing model | 5.6 | Not in use |
| Review Pack Generator AI | 6. AI Agents | Deferred to post-launch |
| Matter Copilot AI | 6. AI Agents | Deferred to post-launch |
| Billable vs non-billable reports | 5.10 | Nice-to-have, not launch critical |
| Revenue by matter type reports | 5.10 | Nice-to-have, not launch critical |

---

## Pre-Launch Checklist

Before launch, complete these items:

### Code Changes
- [ ] Commit email branding feature (22 modified, 3 new files)
- [ ] Implement Gmail incoming sync
- [ ] Implement automation config UI
- [ ] Implement AI document summary
- [ ] Run full test suite

### Configuration
- [ ] Set up production Supabase instance
- [ ] Configure production Google OAuth credentials
- [ ] Configure production Square credentials
- [ ] Set up Resend for production email
- [ ] Configure cron job for email automations
- [ ] Configure cron job for Gmail sync

### Data Migration
- [ ] Export data from CaseFox
- [ ] Import clients to MatterFlow
- [ ] Import active matters
- [ ] Verify all data migrated correctly

### Testing
- [ ] End-to-end: Create matter → intake → time tracking → invoice → payment
- [ ] Test Gmail sync with real emails
- [ ] Test all email automations fire correctly
- [ ] Test client portal flow
- [ ] Test on mobile device

---

## Success Criteria

Launch is successful when:

1. All active matters from CaseFox are in MatterFlow
2. New matters created only in MatterFlow
3. Invoices created only in MatterFlow, synced to Square
4. Time tracked in MatterFlow (< 2 clicks to start/stop)
5. Client communications visible in matter timeline
6. Documents organized in Google Drive automatically
7. Dashboard shows "what do I need to do today" clearly
8. CaseFox is no longer needed for daily operations
