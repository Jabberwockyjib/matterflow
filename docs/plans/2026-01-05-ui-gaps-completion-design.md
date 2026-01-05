# UI Gaps Completion Design

**Date:** 2026-01-05
**Status:** Approved

## Overview

Complete the remaining UI gaps to achieve a production-ready MVP:

1. **Document Template Admin UI** - Upload Word docs, AI parsing, template management
2. **Invoice Detail Page** - View invoice, payment status, actions
3. **Add Task/Time Entry Modals** - Enable inline actions on matter detail page

---

## 1. Document Template Admin UI

### Route Structure

```
/admin/templates              → Template list (grid/table view)
/admin/templates/new          → Upload new template
/admin/templates/[id]         → View/edit template details
/admin/templates/[id]/edit    → Edit sections and fields
```

### Upload-First Flow

1. **Upload page** (`/admin/templates/new`)
   - Drag-and-drop zone for .docx files
   - Upload to Supabase Storage
   - Show loading spinner: "Analyzing document..."

2. **AI Parsing** (server action)
   - Extract text using mammoth.js (DOCX → HTML/text)
   - Send to Claude API with structured prompt
   - Return `ParsedTemplate` with sections + placeholders
   - **Critical:** Never modify original wording - content preserved verbatim

3. **Review page** (after parsing)
   - Show extracted sections with original content
   - List detected placeholders with AI suggestions (field name, type, source)
   - Lawyer reviews, adjusts field mappings, saves
   - Status starts as "draft"

### AI Parsing Behavior

The AI analyzes documents to:
- **Extract sections** - Identify logical sections (headers, paragraphs)
- **Find placeholders** - Detect patterns like `{{client_name}}`, `[PRACTICE NAME]`, `_________` blanks
- **Suggest field types** - Infer text, date, currency, checkbox based on context
- **Detect conditionals** - Flag sections that might be conditional (e.g., "If offering telehealth...")
- **Classify output type** - Suggest `merge` (lawyer fills) vs `fillable` (patient fills in PDF)

**Constraint:** AI can only analyze and extract. It cannot change any verbiage. Changes only happen if the lawyer explicitly requests them.

### Template List View

| Column | Content |
|--------|---------|
| Name | Template name + category badge |
| Version | e.g., "1.2" |
| Status | Draft / Active / Archived |
| Fields | Count of mapped fields |
| Actions | Edit, Duplicate, Archive |

### File Structure

```
src/app/admin/templates/
├── page.tsx                    # Template list
├── new/
│   └── page.tsx                # Upload new template
├── [id]/
│   ├── page.tsx                # View template details
│   └── edit/
│       └── page.tsx            # Edit sections/fields

src/components/templates/
├── template-list.tsx           # Grid/table of templates
├── template-upload-zone.tsx    # Drag-drop upload
├── template-review-form.tsx    # Review AI-parsed results
├── section-editor.tsx          # Edit section content
├── field-mapping-table.tsx     # Map fields to sources
└── placeholder-preview.tsx     # Show detected placeholders

src/lib/document-templates/
├── parsing.ts                  # mammoth.js + Claude API parsing
└── (existing files)
```

### Dependencies to Add

```bash
pnpm add mammoth @anthropic-ai/sdk
```

---

## 2. Invoice Detail Page

### Route

```
/billing/[invoiceId]          → Invoice detail (admin-only)
```

Clients pay via Square payment links sent in emails. This page is admin-only.

### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Billing                                          │
│                                                             │
│  Invoice #INV-2024-0042                    [Resend Email]   │
│  Smith Estate Planning                      [Mark Paid]     │
│  john@example.com                                           │
│                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────────┐ │
│  │ Status: SENT            │  │ Amount Due: $1,250.00     │ │
│  │ Issued: Jan 3, 2026     │  │ Paid: $0.00               │ │
│  │ Due: Jan 17, 2026       │  │ Balance: $1,250.00        │ │
│  └─────────────────────────┘  └───────────────────────────┘ │
│                                                             │
│  Line Items                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Description              │ Hours │ Rate   │ Amount     ││
│  │ Initial consultation     │ 1.5   │ $200   │ $300.00    ││
│  │ Document review          │ 2.0   │ $200   │ $400.00    ││
│  │ Contract drafting        │ 2.75  │ $200   │ $550.00    ││
│  ├─────────────────────────────────────────────────────────┤│
│  │                                   Total:   $1,250.00    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Payment Link                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ https://squareup.com/pay/inv/xxxxx         [Copy]       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Activity                                                   │
│  • Jan 3 - Invoice created                                  │
│  • Jan 3 - Email sent to john@example.com                   │
│  • Jan 5 - Payment reminder sent                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Requirements

- Fetch invoice with line items (time entries)
- Fetch Square payment URL if synced (`square_invoice_id`)
- Fetch audit log entries for activity timeline

### Actions

| Action | Behavior |
|--------|----------|
| Resend Email | Calls existing `sendInvoiceEmail` action |
| Mark Paid | Updates status to "paid" manually (for cash/check) |
| Copy Link | Copies Square payment URL to clipboard |

### File Structure

```
src/app/billing/[invoiceId]/
└── page.tsx                    # Invoice detail page

src/components/billing/
├── invoice-header.tsx          # Title, client, status
├── invoice-summary-cards.tsx   # Status + amounts cards
├── invoice-line-items.tsx      # Line items table
├── invoice-payment-link.tsx    # Square link with copy
├── invoice-activity.tsx        # Audit log timeline
└── invoice-actions.tsx         # Resend, Mark Paid buttons
```

---

## 3. Add Task & Add Time Entry Modals

### Add Task Modal

**Trigger:** "Add Task" button on `/matters/[id]` Tasks tab

**Form Fields:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| Title | Text input | Yes | - |
| Due Date | Date picker | No | - |
| Responsible Party | Select | Yes | "lawyer" |
| Priority | Select | No | "medium" |
| Notes | Textarea | No | - |

**On Submit:**
- Call `createTask` action
- Revalidate `/matters/[id]` path
- Close modal, task appears in list
- Show success toast

### Add Time Entry Modal

**Trigger:** "Add Time Entry" button on `/matters/[id]` Time tab

**Form Fields:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| Description | Textarea | Yes | - |
| Duration | Number input | Yes | - (hours) |
| Date | Date picker | Yes | Today |
| Billable | Checkbox | Yes | Checked |
| Task | Select | No | - (optional link) |

**On Submit:**
- Call `createTimeEntry` action
- Revalidate `/matters/[id]` path
- Close modal, entry appears in list
- Stats (Total Hours, Billable) update
- Show success toast

### Shared Modal Pattern

Both modals follow existing app patterns:
- `Dialog` component from shadcn/ui
- React Hook Form + Zod validation
- Loading state on submit button
- Toast notification on success/error

### File Structure

```
src/components/matters/
├── add-task-modal.tsx          # Add task dialog
├── add-time-entry-modal.tsx    # Add time entry dialog
└── (update matter detail page to use these)
```

---

## Implementation Priority

1. **Add Task/Time Entry Modals** - Quickest win, improves existing page
2. **Invoice Detail Page** - Medium complexity, standalone page
3. **Document Template Admin** - Most complex, requires new dependencies + AI integration

---

## Technical Notes

### Existing Assets to Leverage

- `src/lib/document-templates/` - Actions, queries, types already exist
- `template_docs/` - 4 sample Word templates ready for testing
- `src/lib/square/` - Square integration for payment links
- `src/lib/data/actions.ts` - Task and time entry actions may exist

### New Dependencies

```bash
pnpm add mammoth @anthropic-ai/sdk
```

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...  # For Claude API document parsing
```
