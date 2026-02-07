# Google Form Import + Intake Form Builder

**Date:** 2026-02-06
**Status:** Approved

## Summary

Add the ability to import Google Forms as intake form templates and provide a visual form builder for admin users to edit templates in Settings > Intake Forms.

## Architecture

### Google Forms API Integration

- **OAuth scope:** `https://www.googleapis.com/auth/forms.body.readonly` added to existing Google OAuth flow
- **One-time import:** Admin pastes a Google Form URL/ID, we fetch the structure and convert to our `IntakeFormTemplate` format
- **No live sync:** Changes to Google Form after import are not reflected

### Field Type Mapping

| Google Forms Type | MatterFlow Type |
|---|---|
| `textQuestion` (short) | `text` |
| `textQuestion` (paragraph) | `textarea` |
| `choiceQuestion` (RADIO) | `radio` |
| `choiceQuestion` (CHECKBOX) | `multiselect` |
| `choiceQuestion` (DROP_DOWN) | `select` |
| `dateQuestion` | `date` |
| `scaleQuestion` | `select` (generated options) |
| `timeQuestion` | `text` (time hint) |
| `fileUploadQuestion` | `file` |
| `ratingQuestion` | `select` (1-5 options) |
| `pageBreakItem` | `section_header` |

### Database

New table `intake_form_templates`:

```sql
CREATE TABLE intake_form_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  matter_type   text,
  sections      jsonb NOT NULL DEFAULT '[]',
  version       integer DEFAULT 1,
  is_default    boolean DEFAULT false,
  is_active     boolean DEFAULT true,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  source        text DEFAULT 'custom',
  source_form_id text
);
```

Existing hardcoded templates seeded with `source: 'seed'`.

### UI: Settings > Intake Forms

1. **Template list:** Card grid with import/create buttons
2. **Import modal:** Paste Google Form URL → preview → import
3. **Visual editor:** Drag-and-drop fields, property editor panel, section management, preview mode

## Implementation Plan

### Phase 1: Database + Migration
- Create `intake_form_templates` table with RLS policies
- Seed 4 existing templates
- Update `getIntakeForm()` to read from DB

### Phase 2: Google Forms API
- Add `forms.body.readonly` scope to OAuth flow
- Create `src/lib/google-forms/client.ts` for API calls
- Create `src/lib/google-forms/converter.ts` for field mapping
- API route `POST /api/google/forms/import` to fetch + convert

### Phase 3: Settings UI - Template List
- Add "Intake Forms" tab to Settings page
- Template list with cards (name, type, field count, source)
- Import button + modal with URL input + preview

### Phase 4: Form Builder Editor
- Visual editor with drag-and-drop (`@dnd-kit/core`)
- Field property editor (label, type, required, options, validation, conditional logic)
- Section management (add/remove/reorder)
- Save + preview functionality

### Phase 5: Wire Up
- Template selection when creating matters
- Handle template versioning (responses reference template version)
- Admin-only access enforcement
