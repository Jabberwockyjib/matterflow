# Email Template Editor Design

**Date:** 2026-02-05
**Status:** Approved
**Branch:** `feature/email-template-editor`

## Overview

Admin users can edit email templates via a WYSIWYG editor with draggable/clickable placeholder tokens. Each system action (matter created, invoice sent, etc.) has one template that can be customized and enabled/disabled.

## Requirements

- Simple WYSIWYG editor (TipTap, fallback to Unlayer if issues)
- Clickable/draggable placeholder tokens for dynamic data
- One template per action with enable/disable toggles
- All placeholders shown in sidebar, unavailable ones grayed out
- Database storage with version history for reverting
- Located under Settings > Email Templates tab
- Live preview, send test email, and device preview (desktop/mobile)

## Data Model

### email_templates

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| email_type | text | Unique key matching EmailType enum |
| name | text | Display name |
| subject | text | Email subject with placeholder support |
| body_html | text | TipTap-generated HTML body |
| body_json | jsonb | TipTap document JSON (for re-editing) |
| is_enabled | boolean | Whether this email is sent (default: true) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### email_template_versions

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| template_id | uuid | FK to email_templates |
| version | integer | Auto-incrementing version number |
| subject | text | Subject at this version |
| body_html | text | HTML at this version |
| body_json | jsonb | TipTap JSON at this version |
| created_at | timestamptz | When this version was saved |
| created_by | uuid | FK to profiles (who edited) |

## Placeholder Tokens

### Global (all templates)

| Token | Source |
|-------|--------|
| `{{practiceName}}` | practice_settings.firm_name |
| `{{practiceLogo}}` | firm_settings (key: logo_url) |
| `{{practiceEmail}}` | practice_settings.contact_email |
| `{{practicePhone}}` | practice_settings.contact_phone |
| `{{practiceAddress}}` | practice_settings.address |
| `{{currentYear}}` | Runtime |

### Context-dependent (grayed when N/A, render blank if no data)

| Token | Available in | Source |
|-------|--------------|--------|
| `{{clientName}}` | Most emails | profiles.full_name |
| `{{clientEmail}}` | Most emails | auth.users.email |
| `{{matterTitle}}` | Matter-related | matters.title |
| `{{matterType}}` | Matter-related | matters.matter_type |
| `{{lawyerName}}` | Most emails | Owner profile name |
| `{{invoiceAmount}}` | Invoice emails | Formatted from invoices.total_cents |
| `{{invoiceNumber}}` | Invoice emails | Generated or invoice ID |
| `{{dueDate}}` | Invoice/Task | invoices.due_date or tasks.due_date |
| `{{paymentLink}}` | Invoice emails | Square payment URL |
| `{{taskTitle}}` | Task emails | tasks.title |
| `{{taskLink}}` | Task emails | Generated URL |
| `{{intakeLink}}` | Intake emails | Generated URL |
| `{{actionButton}}` | Special | Primary CTA button (URL + text configurable) |

## UI Layout

### Template List (Settings > Email Templates)

- Table with columns: Enabled toggle, Template name, Edit button, Last edited
- Toggle enables/disables sending for that email type
- Click "Edit" to open editor

### Template Editor

- Header: Back button, template name, Save button, Versions button
- Left sidebar: Placeholder tokens grouped by category (Practice, Client, Matter, etc.)
  - Available tokens: clickable/draggable
  - Unavailable tokens: grayed out
  - Send Test Email button at bottom
- Center: Subject input + TipTap WYSIWYG editor
  - Toolbar: Bold, Italic, Underline, Link, Button
  - Placeholders render as pills/chips in editor
- Right/Bottom: Live preview panel
  - Device toggle: mobile/desktop
  - Renders with sample data

### Version Drawer

- Opens from "Versions" button
- List of past versions with timestamp and editor name
- Click to preview, "Restore" button to revert

## File Structure

```
src/
├── app/admin/settings/
│   └── email-templates/
│       ├── page.tsx                    # Template list view
│       └── [emailType]/
│           └── page.tsx                # Edit view for specific template
├── components/email-templates/
│   ├── template-list.tsx               # List with enable/disable toggles
│   ├── template-editor.tsx             # Main editor component
│   ├── tiptap-editor.tsx               # TipTap setup with custom extensions
│   ├── placeholder-sidebar.tsx         # Draggable/clickable tokens
│   ├── email-preview.tsx               # Rendered preview with device toggle
│   └── version-drawer.tsx              # Version history sidebar
├── lib/email-templates/
│   ├── types.ts                        # EmailTemplate, EmailTemplateVersion types
│   ├── actions.ts                      # Server actions (save, toggle, restore)
│   ├── queries.ts                      # Fetch templates, versions
│   ├── placeholders.ts                 # Placeholder definitions & availability map
│   ├── renderer.ts                     # Replace placeholders with actual data
│   └── seed.ts                         # Default templates from current .tsx files
└── lib/email/
    └── service.ts                      # Modified to fetch from DB instead of .tsx
```

## Email Flow Changes

1. `sendTemplateEmail()` checks `email_templates` table first
2. If template exists and is_enabled → use DB template with placeholder replacement
3. If is_enabled = false → skip sending entirely
4. Fallback to current `.tsx` templates if no DB record (safety during migration)

## Templates to Seed (16 total)

| email_type | Name | Current file |
|------------|------|--------------|
| `matter_created` | Matter Created | matter-created.tsx |
| `invoice_sent` | Invoice Sent | invoice-sent.tsx |
| `invoice_reminder` | Invoice Reminder | invoice-sent.tsx |
| `task_assigned` | Task Assigned | task-assigned.tsx |
| `task_response_submitted` | Task Response Submitted | task-response-submitted.tsx |
| `task_approved` | Task Approved | task-approved.tsx |
| `task_revision_requested` | Task Revision Requested | task-revision-requested.tsx |
| `intake_reminder` | Intake Reminder | intake-reminder.tsx |
| `intake_submitted` | Intake Submitted | intake-submitted.tsx |
| `intake_declined` | Intake Declined | intake-declined.tsx |
| `client_activity_reminder` | Client Activity Reminder | activity-reminder.tsx |
| `lawyer_activity_reminder` | Lawyer Activity Reminder | activity-reminder.tsx |
| `payment_received` | Payment Received | payment-received.tsx |
| `info_request` | Information Request | info-request.tsx |
| `info_request_response` | Info Response Received | info-response-received.tsx |
| `user_invitation` | User Invitation | user-invitation.tsx |

## TipTap Extensions

- Custom "placeholder" node type (renders as pill/chip)
- Button block for CTAs
- Image block for logo

## Testing with Production Supabase

Development will use the production Supabase instance for testing. The feature branch will be isolated but migrations will be applied to production via the Supabase MCP.

## Implementation Phases

1. **Database**: Create tables, seed defaults
2. **Core lib**: Types, queries, actions, placeholder renderer
3. **TipTap editor**: Custom extensions for placeholders
4. **UI components**: List, editor, preview, version drawer
5. **Integration**: Update email service to use DB templates
6. **Testing**: Manual testing with production data
