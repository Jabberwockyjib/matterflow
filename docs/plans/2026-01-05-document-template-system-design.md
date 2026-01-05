# Document Template System Design

## Overview

**Goal:** Create a document template system that allows lawyers to generate customized legal documents for therapist clients, with auto-fill capabilities, conditional sections, and version tracking.

**Users:**
- **Software users (admin/staff):** Lawyers who serve therapists
- **Clients:** Therapists and therapy practice owners
- **End output:** PDFs with fillable fields for therapist's patients

**Service Paths:**
| Path | Description |
|------|-------------|
| **Base Package** | Client buys standard templates → auto-generated from intake answers |
| **Custom Package** | Base + paid lawyer review/modification |
| **Document Review** | Client has existing docs → lawyer reviews → update or recommend templates |

---

## Core Data Model

### Templates & Sections

```sql
-- Master template record
document_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,                    -- "Informed Consent"
  description TEXT,
  category TEXT,                          -- "consent", "billing", "privacy"
  version TEXT NOT NULL,                  -- "2.1"
  status TEXT CHECK (status IN ('draft', 'active', 'archived')),
  original_file_url TEXT,                 -- Original uploaded Word doc
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Sections within a template
template_sections (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES document_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                     -- "Telehealth Services"
  content TEXT NOT NULL,                  -- Rich text with {{placeholders}}
  sort_order INTEGER NOT NULL,
  is_conditional BOOLEAN DEFAULT FALSE,
  condition_rules JSONB,                  -- When to show/hide
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Field Definitions

```sql
-- Fields used across templates
template_fields (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,              -- "practice_name"
  label TEXT NOT NULL,                    -- "Practice Name"
  field_type TEXT CHECK (field_type IN ('text', 'multi_line', 'date', 'currency', 'number', 'select', 'multi_select', 'checkbox')),
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  options JSONB,                          -- For select/multi_select types
  source_type TEXT CHECK (source_type IN ('intake', 'profile', 'matter', 'manual')),
  intake_question_id UUID,                -- Links to existing intake system
  output_type TEXT CHECK (output_type IN ('merge', 'fillable')) DEFAULT 'merge',
  -- merge = replaced with client data, locked in PDF
  -- fillable = becomes PDF form field for patients
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Junction: which fields are used in which templates
template_field_mappings (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES document_templates(id) ON DELETE CASCADE,
  field_id UUID REFERENCES template_fields(id) ON DELETE CASCADE,
  UNIQUE(template_id, field_id)
)
```

### Conditional Logic

Condition rules stored as JSON:

```json
// Simple condition
{
  "field": "offers_telehealth",
  "operator": "equals",
  "value": true
}

// Compound condition (all must be true)
{
  "all": [
    { "field": "offers_telehealth", "operator": "equals", "value": true },
    { "field": "state", "operator": "equals", "value": "California" }
  ]
}

// Compound condition (any must be true)
{
  "any": [
    { "field": "practice_type", "operator": "contains", "value": "couples" },
    { "field": "practice_type", "operator": "contains", "value": "family" }
  ]
}
```

**Supported operators:**
- `equals`, `not_equals`
- `contains`, `not_contains` (for multi-select)
- `greater_than`, `less_than` (for numbers)
- `is_empty`, `is_not_empty`

---

## Template Upload & AI Parsing

### Workflow

1. **Lawyer uploads Word doc** via UI
2. **AI agent parses document:**
   - Extracts text structure (headings, paragraphs)
   - Identifies placeholders (`[PRACTICE NAME]`, `{{client_name}}`, or suggests variable text)
   - Detects logical sections by headings/content breaks
   - Suggests which sections might be conditional
   - Maps placeholders to existing fields or proposes new ones
3. **Lawyer reviews & approves:**
   - See parsed sections with detected placeholders highlighted
   - Confirm/adjust field mappings
   - Mark sections as conditional, set condition rules
   - Save as structured template

### AI Parsing Hints

The AI should look for:
- Bracketed text: `[PRACTICE NAME]`, `[ADDRESS]`, `[RATE]`
- Mustache syntax: `{{practice_name}}`
- Common variable phrases: "Your practice", "the Therapist", "Client Name"
- Section headers that suggest conditionals: "Telehealth", "Insurance", "Couples"
- Signature/date lines → mark as fillable fields

---

## Field Mapping & Gap Detection

### Field Sources

| Source | Description |
|--------|-------------|
| `intake` | Linked to intake question → auto-populated from intake response |
| `profile` | Client profile fields (name, email, address) |
| `matter` | Matter details (type, dates) |
| `manual` | Lawyer enters during document prep |

### Gap Detection Flow

When lawyer starts document generation:

1. System identifies all required fields across selected templates
2. Checks what data is available:
   - ✅ Intake responses
   - ✅ Client profile
   - ✅ Matter details
   - ❌ Missing fields
3. Displays checklist to lawyer:
   ```
   Ready to generate:
   ✅ Practice Name (from intake)
   ✅ Therapist Name (from profile)
   ✅ Office Address (from intake)
   ❌ Session Rate - MISSING
   ❌ Cancellation Policy Hours - MISSING

   [Enter Missing Info] [Request from Client]
   ```

4. Lawyer can:
   - Enter missing info manually
   - Send follow-up request to client for specific fields

---

## Document Generation Flow

### Steps

```
Step 1: Select Templates
┌─────────────────────────────────────┐
│ Generate Documents for: Jane Smith  │
│                                     │
│ ☑ Informed Consent                  │
│ ☐ Informed Consent (Couples)        │
│ ☑ Privacy Policy                    │
│ ☑ Fee Structure                     │
│                                     │
│ [Check Requirements →]              │
└─────────────────────────────────────┘

Step 2: Gap Check
→ Shows missing fields
→ Lawyer fills gaps or requests from client

Step 3: Preview & Customize
┌─────────────────────────────────────┐
│ Preview: Informed Consent           │
│                                     │
│ Section 1: Introduction        [✓]  │
│ Section 2: Services Provided   [✓]  │
│ Section 3: Telehealth         [skip]│ ← condition not met
│ Section 4: Confidentiality     [✓]  │
│ Section 5: Fees               [edit]│ ← lawyer customizing
│                                     │
│ [Preview PDF] [Edit Section]        │
└─────────────────────────────────────┘

Step 4: Generate
→ Merge data into sections
→ Generate PDF with fillable fields
→ Store with version info
```

### Customization Options

At preview step, lawyer can:
- **Skip** a section (even if condition was met)
- **Force include** a section (even if condition wasn't met)
- **Edit section text** for this client only (tracked as customization)

---

## PDF Output

### Two Content Types

1. **Merge fields** (locked)
   - Replaced with client data at generation time
   - Cannot be edited in final PDF
   - The legal text the client paid for

2. **Fillable fields** (interactive)
   - Become PDF form fields
   - For therapist's patients to complete
   - Types: text input, checkbox, signature, date

### Template Syntax

```
I, {{patient_name:fillable}}, acknowledge that I have received
the Privacy Policy from {{practice_name:merge}}.

☐ I have read and understand the above {{acknowledgment_checkbox:fillable}}

Signature: {{patient_signature:fillable}}  Date: {{sign_date:fillable}}
```

### Output

Professional PDF form that therapist gives to their patients:
- Print and fill manually, OR
- Fill digitally (fillable PDF fields)

---

## Version Tracking & Client Documents

### Schema

```sql
-- Documents associated with a matter (template-based or custom)
matter_documents (
  id UUID PRIMARY KEY,
  matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                     -- "Informed Consent"
  document_type TEXT CHECK (document_type IN ('template', 'custom')),
  source TEXT CHECK (source IN ('generated', 'uploaded_lawyer', 'uploaded_client')),
  template_id UUID REFERENCES document_templates(id),  -- nullable for custom
  template_version TEXT,                  -- version at generation time
  status TEXT CHECK (status IN ('draft', 'review', 'final', 'delivered', 'needs_update')),
  pdf_url TEXT,
  customizations JSONB,                   -- Any edits lawyer made
  notes TEXT,
  generated_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- History of changes
matter_document_history (
  id UUID PRIMARY KEY,
  matter_document_id UUID REFERENCES matter_documents(id) ON DELETE CASCADE,
  action TEXT CHECK (action IN ('generated', 'edited', 'regenerated', 'delivered', 'status_changed')),
  changed_by UUID REFERENCES profiles(user_id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB,                          -- What changed
  previous_pdf_url TEXT                   -- For rollback
)
```

### Version Update Flow

When a template is updated (e.g., law changes):

1. Template version increments (2.1 → 2.2)
2. System flags all `matter_documents` using old version as `needs_update`
3. Lawyer sees dashboard notification:
   ```
   ⚠ 12 clients on Informed Consent v2.1 (current: v2.2)
   [View List] [Bulk Notify]
   ```
4. Lawyer can regenerate documents for affected clients

---

## Integration with MatterFlow

### Matter-Level Document Package

```sql
-- Optional document package settings per matter
matter_document_packages (
  id UUID PRIMARY KEY,
  matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
  package_type TEXT CHECK (package_type IN ('base', 'custom', 'review')),
  selected_template_ids UUID[],           -- Which templates to use
  status TEXT CHECK (status IN ('pending_info', 'ready', 'generating', 'delivered')),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Integration Points

| Feature | Integration |
|---------|-------------|
| **Intake forms** | Fields map to template placeholders, auto-populate |
| **Client profile** | Practice name, contact info pulled automatically |
| **Matter stages** | Optional stages: "Documents Pending", "Documents Delivered" |
| **Tasks** | Auto-create: "Review document package for [client]" |
| **Billing** | Track as billable service (base package vs. custom hours) |

### Matter Document View

```
Matter: Jane Smith Therapy Practice

[Documents Tab]
┌─────────────────────────────────────────────┐
│ Template Documents:                         │
│ • Informed Consent        [Generate]        │
│ • Privacy Policy          [Generate]        │
│ • Fee Structure           ⚠ Missing info    │
│ + Add template                              │
│                                             │
│ Custom Documents:                           │
│ • Retainer Agreement      ✅ Final          │
│ • Client's Existing Consent [Under Review]  │
│ + Upload document                           │
│                                             │
│ [Generate All Templates] [Deliver Package]  │
└─────────────────────────────────────────────┘
```

---

## Technical Implementation Notes

### Libraries/Tools

- **DOCX parsing:** `mammoth.js` or `docx` for extracting Word document content
- **PDF generation:** `pdf-lib` for creating PDFs with fillable fields
- **AI parsing:** Claude API for intelligent placeholder detection and section identification
- **Storage:** Supabase Storage for uploaded files and generated PDFs

### Key Components

1. **Template Upload API** - Handle Word doc uploads, trigger AI parsing
2. **Template Editor UI** - Review/edit parsed templates, manage sections and fields
3. **Field Manager** - Define and map fields across templates
4. **Document Generator** - Merge data, apply conditions, generate PDF
5. **Gap Detector** - Identify missing required fields per matter
6. **Version Tracker** - Monitor template versions, flag outdated client docs

---

## Initial Templates

The following 4 templates will be parsed and configured:

1. **Informed Consent** - Standard therapy consent form
2. **Informed Consent for Couples Therapy** - Couples-specific consent
3. **Privacy Policy** - HIPAA/privacy notices
4. **Fee Structure** - Payment terms and rates

These establish the initial template library. Lawyer can add more templates at any time using the upload flow.
