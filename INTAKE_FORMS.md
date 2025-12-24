# Intake Forms - Implementation Guide

Complete intake form system for dynamic, customizable client intake forms.

## Overview

The intake form system provides:

1. **Dynamic Forms Per Matter Type** - Each matter type can have custom intake forms
2. **Flexible Field Types** - Text, email, phone, select, multiselect, file uploads, etc.
3. **Conditional Logic** - Show/hide fields based on other responses
4. **Validation** - Built-in validation for required fields, email, phone, file types
5. **Draft Saving** - Clients can save progress and return later
6. **Email Notifications** - Lawyers notified when forms submitted
7. **Admin Review & Approval** - Staff can review and approve submissions

## How It Works

```
1. Lawyer creates matter → Moves to "Intake Sent"
2. Client receives intake form link
3. Client fills form (can save draft)
4. Client submits form
5. Matter stage → "Intake Received"
6. Lawyer notified via email
7. Lawyer reviews and approves
8. Matter stage → "Under Review"
```

## Form Templates

### Pre-Built Templates

Three templates included for common legal matters:

**1. Contract Review Intake**
- Client information
- Contract type and details
- File upload for contract document
- Review scope and focus areas
- Negotiation assistance preference

**2. Employment Agreement Intake**
- Practice information
- Position details (title, type, compensation)
- Agreement provisions (non-compete, confidentiality, etc.)
- Special requirements

**3. Policy Review Intake**
- Practice information and type
- Policies to review (HIPAA, telehealth, billing, etc.)
- Current policy document uploads
- Compliance concerns

### Creating Custom Templates

```typescript
import type { IntakeFormTemplate } from "@/lib/intake";

const customTemplate: IntakeFormTemplate = {
  id: "custom-form-v1",
  name: "Custom Intake Form",
  matterType: "Custom Matter Type",
  version: 1,
  sections: [
    {
      id: "section-1",
      title: "Basic Information",
      fields: [
        {
          id: "client_name",
          type: "text",
          label: "Full Name",
          required: true,
        },
        {
          id: "client_email",
          type: "email",
          label: "Email Address",
          required: true,
        },
      ],
    },
  ],
};
```

## Field Types

### Text Fields

```typescript
{
  id: "description",
  type: "text",
  label: "Brief Description",
  required: true,
  placeholder: "Enter description...",
  validation: {
    minLength: 10,
    maxLength: 500,
  },
}
```

### Select/Dropdown

```typescript
{
  id: "business_type",
  type: "select",
  label: "Business Type",
  required: true,
  options: [
    { value: "llc", label: "LLC" },
    { value: "corporation", label: "Corporation" },
    { value: "sole_proprietor", label: "Sole Proprietor" },
  ],
}
```

### Multi-Select (Checkboxes)

```typescript
{
  id: "services_needed",
  type: "multiselect",
  label: "Services Needed",
  required: true,
  options: [
    { value: "contract_review", label: "Contract Review" },
    { value: "negotiation", label: "Negotiation Assistance" },
    { value: "drafting", label: "Document Drafting" },
  ],
}
```

### File Upload

```typescript
{
  id: "contract_document",
  type: "file",
  label: "Upload Contract",
  required: true,
  fileConfig: {
    maxSize: 10 * 1024 * 1024, // 10MB
    acceptedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxFiles: 5,
  },
}
```

### Conditional Fields

```typescript
{
  id: "contract_type",
  type: "select",
  label: "Contract Type",
  options: [
    { value: "employment", label: "Employment" },
    { value: "vendor", label: "Vendor" },
    { value: "other", label: "Other" },
  ],
},
{
  id: "other_description",
  type: "text",
  label: "Please specify",
  required: true,
  conditionalDisplay: {
    field: "contract_type",
    value: "other",
  },
}
```

## Using the Intake System

### Get Intake Form for Matter

```typescript
import { getIntakeForm } from "@/lib/intake";

const result = await getIntakeForm(matterId);

if (result.ok) {
  const { response, template } = result.data;
  // response: existing intake response (or null if new)
  // template: form template for this matter type
}
```

### Save Draft

```typescript
import { saveIntakeFormDraft } from "@/lib/intake";

const responses = {
  client_name: "Jane Doe",
  client_email: "jane@example.com",
  // ... other fields
};

const result = await saveIntakeFormDraft(
  matterId,
  "Contract Review Intake",
  responses
);

if (result.ok) {
  console.log("Draft saved!");
}
```

### Submit Form

```typescript
import { submitIntakeForm } from "@/lib/intake";

const responses = {
  client_name: "Jane Doe",
  client_email: "jane@example.com",
  contract_type: "employment",
  contract_file: [
    {
      id: "file-1",
      fileName: "contract.pdf",
      fileSize: 524288,
      mimeType: "application/pdf",
      driveFileId: "google-drive-file-id",
      uploadedAt: new Date().toISOString(),
    },
  ],
  // ... all required fields
};

const result = await submitIntakeForm(
  matterId,
  "Contract Review Intake",
  responses
);

if (result.ok) {
  console.log("Form submitted successfully!");
  // Email sent to lawyer
  // Matter stage updated to "Intake Received"
}
```

### Review and Approve (Admin/Staff Only)

```typescript
import { approveIntakeForm } from "@/lib/intake";

const result = await approveIntakeForm(intakeResponseId);

if (result.ok) {
  console.log("Intake approved!");
  // Matter stage updated to "Under Review"
}
```

### Get All Intake Responses (Admin View)

```typescript
import { getAllIntakeResponses } from "@/lib/intake";

const { data, error } = await getAllIntakeResponses();

if (data) {
  data.forEach((response) => {
    console.log(response.status); // draft | submitted | approved
    console.log(response.form_type);
    console.log(response.responses); // Form data
  });
}
```

## Validation

Forms are automatically validated on submission:

```typescript
import { validateFormResponse } from "@/lib/intake";

const validation = validateFormResponse(template, responses);

if (!validation.valid) {
  validation.errors.forEach((error) => {
    console.log(`${error.field}: ${error.message}`);
  });
}
```

**Validation Rules**:
- **Required fields**: Must have a value
- **Email**: Must be valid email format
- **Phone**: Must be 10-15 digits
- **Number**: Must be numeric, respect min/max
- **Text/Textarea**: Respect minLength/maxLength
- **Select/Radio**: Value must be in options list
- **Multiselect**: All values must be in options list
- **File**: Respect maxSize, acceptedTypes, maxFiles

## File Uploads

File uploads integrate with Google Drive:

1. Client selects files in form
2. Files uploaded to matter's Google Drive folder
3. File metadata stored in responses
4. Links to files available in admin review

**File Object Structure**:
```typescript
{
  id: "file-1",
  fileName: "contract.pdf",
  fileSize: 524288, // in bytes
  mimeType: "application/pdf",
  driveFileId: "google-drive-file-id",
  uploadedAt: "2024-01-15T10:30:00Z",
}
```

## Database Schema

### intake_responses Table

```sql
CREATE TABLE intake_responses (
  id UUID PRIMARY KEY,
  matter_id UUID REFERENCES matters(id),
  form_type TEXT NOT NULL,
  responses JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft', -- draft | submitted | approved
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies**:
- Clients can view/edit their own matter's intake
- Staff/admin can view/edit all intakes
- Follows matter visibility rules

## Email Notifications

### Intake Submitted Email

Automatically sent to lawyer when client submits intake form.

**Template**: `intake-submitted.tsx`

**Includes**:
- Client name
- Form type
- Matter ID
- Direct link to review intake

**Triggered**: When `submitIntakeForm()` is called successfully

## Architecture

### File Structure

```
src/lib/intake/
├── types.ts           # TypeScript interfaces
├── templates.ts       # Pre-built form templates
├── validation.ts      # Form validation logic
├── actions.ts         # Server actions
└── index.ts           # Public exports

src/lib/email/templates/
└── intake-submitted.tsx   # Email template
```

### Data Flow

#### Form Submission Flow

```
Client fills form → submitIntakeForm()
  ↓
Validate responses against template
  ↓
Insert/Update intake_responses table
  ↓
Update matter stage to "Intake Received"
  ↓
Send email to lawyer
  ↓
Revalidate paths
```

#### Approval Flow

```
Lawyer reviews intake → approveIntakeForm()
  ↓
Update intake_responses.status = "approved"
  ↓
Update matter stage to "Under Review"
  ↓
Revalidate paths
```

## API Reference

### Server Actions

#### `getIntakeForm(matterId): Promise<ActionResult>`

Get intake form template and existing response for a matter.

**Returns**:
```typescript
{
  ok: true,
  data: {
    response: IntakeFormResponse | null,
    template: IntakeFormTemplate
  }
}
```

#### `saveIntakeFormDraft(matterId, formType, responses): Promise<ActionResult>`

Save partial form responses without validation.

**Parameters**:
- `matterId`: UUID of matter
- `formType`: Template name
- `responses`: Partial form data

#### `submitIntakeForm(matterId, formType, responses): Promise<ActionResult>`

Submit complete form with validation.

**Triggers**:
- Form validation
- Matter stage update
- Email notification

#### `approveIntakeForm(intakeResponseId): Promise<ActionResult>`

Approve submitted intake (admin/staff only).

**Triggers**:
- Matter stage update to "Under Review"

#### `getAllIntakeResponses(): Promise<{ data?, error? }>`

Get all intake responses (admin/staff only).

#### `getIntakeResponseByMatterId(matterId): Promise<{ data?, error? }>`

Get specific intake response by matter ID.

### Validation Functions

#### `validateFormResponse(template, responses): FormValidationResult`

Validate responses against template schema.

**Returns**:
```typescript
{
  valid: boolean,
  errors: Array<{
    field: string,
    message: string
  }>
}
```

### Template Functions

#### `getTemplateForMatterType(matterType): IntakeFormTemplate | null`

Get template for specific matter type.

#### `getAllTemplates(): IntakeFormTemplate[]`

Get all available templates.

## Best Practices

1. **Template Versioning**: Increment version when updating templates
2. **Required Fields**: Only mark truly essential fields as required
3. **File Uploads**: Set reasonable file size limits (5-10MB)
4. **Conditional Fields**: Use sparingly to avoid confusing users
5. **Section Organization**: Group related fields into logical sections
6. **Validation Messages**: Provide clear, helpful error messages
7. **Draft Saving**: Auto-save drafts periodically
8. **Mobile Friendly**: Keep forms mobile-responsive

## Customization

### Adding New Templates

1. Create template in `templates.ts`:
```typescript
export const newTemplate: IntakeFormTemplate = { ... };
```

2. Add to template registry:
```typescript
export const INTAKE_FORM_TEMPLATES: Record<string, IntakeFormTemplate> = {
  "New Matter Type": newTemplate,
  ...
};
```

### Custom Field Types

To add new field types:

1. Add type to `IntakeFormFieldType` in `types.ts`
2. Add validation logic in `validation.ts`
3. Create renderer component for UI
4. Update form builder

## Security

- **RLS Enforcement**: All database access follows RLS policies
- **File Validation**: Files validated by type and size
- **XSS Protection**: All user input sanitized
- **Access Control**: Only staff can approve intakes
- **Audit Trail**: All submissions logged with timestamps

## Future Enhancements

Planned features for future releases:

- [ ] **Form Builder UI** - Visual form editor for lawyers
- [ ] **E-Signature Integration** - DocuSign/HelloSign for agreements
- [ ] **Multi-Page Forms** - Break long forms into steps
- [ ] **Progress Indicator** - Show completion percentage
- [ ] **Auto-Save** - Automatically save drafts every 30 seconds
- [ ] **PDF Generation** - Generate PDF of submitted form
- [ ] **Form Analytics** - Track completion rates and drop-off points
- [ ] **Conditional Sections** - Show/hide entire sections
- [ ] **Custom Validation Rules** - Advanced validation logic
- [ ] **Form Branching** - Different paths based on responses

## Troubleshooting

### "Form template not found"

**Cause**: No template defined for matter type.

**Fix**:
1. Check matter type matches template name exactly
2. Add template to `INTAKE_FORM_TEMPLATES` registry
3. Or create custom template for this matter type

### "Validation failed"

**Cause**: Required fields missing or invalid data.

**Fix**:
1. Check validation errors array for specific fields
2. Ensure all required fields have values
3. Verify email/phone format is correct
4. Check file sizes within limits

### "Email not sent"

**Cause**: Email configuration issue or user not found.

**Fix**:
1. Verify RESEND_API_KEY is set
2. Check lawyer user has valid email
3. Review server logs for email errors
4. Note: Form submission succeeds even if email fails

### File upload fails

**Cause**: File too large or wrong type.

**Fix**:
1. Check file size is under maxSize limit
2. Verify file type is in acceptedTypes list
3. Ensure Google Drive integration is configured
4. Check Google Drive quota not exceeded

## Testing

### Manual Testing

1. **Create matter** with specific matter type
2. **Get form**: Call `getIntakeForm(matterId)`
3. **Fill form**: Provide test responses
4. **Save draft**: Test draft saving
5. **Submit**: Test full submission
6. **Verify**: Check matter stage updated
7. **Email**: Check lawyer received notification
8. **Approve**: Test admin approval flow

### Test Data

```typescript
const testResponses = {
  client_name: "Test Client",
  client_email: "test@example.com",
  client_phone: "5551234567",
  business_type: "llc",
  contract_type: "employment",
  contract_file: [
    {
      id: "test-file",
      fileName: "test-contract.pdf",
      fileSize: 100000,
      mimeType: "application/pdf",
      driveFileId: "test-drive-id",
      uploadedAt: new Date().toISOString(),
    },
  ],
};
```

## Support Resources

- **PRD**: See `project.md` section 5.3 for requirements
- **Database Schema**: See `supabase/migrations/0001_init.sql`
- **Email Templates**: See `src/lib/email/templates/`
- **Type Definitions**: See `src/lib/intake/types.ts`

---

**Implementation Status**: ✅ Complete (Backend + Server Actions + UI Components)
**UI Components**: ✅ Complete
**Last Updated**: December 2024

## UI Components

The intake form system includes complete UI components:

### Client-Side Components

**`/intake/[matterId]`** - Client intake form submission page
- Dynamic form renderer based on matter type
- Draft auto-save functionality
- File upload support
- Real-time validation
- Mobile-responsive design

**`DynamicFormRenderer`** - Reusable form component (`src/components/intake/dynamic-form-renderer.tsx`)
- Supports all 13 field types
- Conditional field display logic
- Client-side validation
- Read-only mode for approved forms

### Admin Components

**`/admin/intake`** - Intake response list page
- Summary dashboard with counts
- Filterable list (Pending, Drafts, Approved)
- Quick access to review forms

**`/admin/intake/[intakeId]`** - Detailed intake review page
- Full form response display
- One-click approval
- Matter and client information
- Status tracking

### UI Primitives

New shadcn-style components added:
- `Input` - Text input fields
- `Label` - Form labels
- `Textarea` - Multi-line text input
