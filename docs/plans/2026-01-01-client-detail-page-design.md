# Client Detail Page Design

## Overview

Add admin functionality to view and edit client profiles with contact information, associated matters, intake submissions, and internal notes.

## Entry Points

1. **From `/clients` page** - New Active Clients table, click row to view
2. **From `/admin/users` page** - "View Client Details" action for client users
3. **From pipeline board cards** - "View Profile" link on client cards

## Database Schema

New columns added to `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_secondary text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_type text; -- 'mobile', 'business', 'home'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_secondary_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_contact_method text; -- 'email', 'phone', 'text'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS internal_notes text;
```

## Page Layout

Route: `/clients/[userId]`

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Clients                                          │
│                                                             │
│  John Smith                                    [Save Button]│
│  client@example.com                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────────┐ │
│  │ Contact Information     │  │ Associated Matters        │ │
│  │ ─────────────────────── │  │ ───────────────────────── │ │
│  │ Phone: [_____________]  │  │ • Smith Estate Planning   │ │
│  │ Type:  [Mobile      ▼]  │  │   Under Review            │ │
│  │ Secondary: [_________]  │  │ • Smith Trust Amendment   │ │
│  │ Company: [___________]  │  │   Completed               │ │
│  │                         │  │                           │ │
│  │ Address                 │  ├───────────────────────────┤ │
│  │ Street: [____________]  │  │ Intake Submissions        │ │
│  │ City: [____] State:[__] │  │ ───────────────────────── │ │
│  │ ZIP: [_____]            │  │ • Contract Review (Pending)│ │
│  │                         │  │ • Estate Planning (Approved)│
│  │ Emergency Contact       │  ├───────────────────────────┤ │
│  │ Name: [______________]  │  │ Info Requests             │ │
│  │ Phone: [_____________]  │  │ ───────────────────────── │ │
│  │                         │  │ • 2 questions (Awaiting)  │ │
│  │ Preferred: [Email    ▼] │  │ • 3 questions (Responded) │ │
│  └─────────────────────────┘  └───────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Internal Notes (only visible to staff)                  ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ [                                                      ]││
│  │ [  Client prefers morning calls. Referred by Jane D.   ]││
│  │ [                                                      ]││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

Two-column layout: editable form on left, read-only context on right. Internal notes span full width at bottom.

## Data Layer

### Query Functions (queries.ts)

```typescript
export async function getClientProfile(userId: string) {
  // Returns: profile fields + associated matters + intake responses + info requests
}

export async function getActiveClients() {
  // Returns: all users with role='client', their matter counts, last activity
}
```

### Server Action (actions.ts)

```typescript
export async function updateClientProfile(formData: FormData): Promise<ActionResult> {
  // Validates with Zod schema
  // Updates profiles table
  // Logs to audit_logs
  // Revalidates /clients/[userId] path
}
```

### Validation Schema (schemas.ts)

```typescript
export const updateClientProfileSchema = z.object({
  userId: z.string().uuid(),
  phone: z.string().optional(),
  phoneType: z.enum(['mobile', 'business', 'home']).optional(),
  phoneSecondary: z.string().optional(),
  phoneSecondaryType: z.enum(['mobile', 'business', 'home']).optional(),
  companyName: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  addressCountry: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  preferredContactMethod: z.enum(['email', 'phone', 'text']).optional(),
  internalNotes: z.string().max(10000).optional(),
});
```

## File Structure

```
src/
├── app/clients/[userId]/
│   ├── page.tsx                    # Server component, fetches data
│   └── client-detail-client.tsx    # Client component with form
├── components/clients/
│   ├── client-profile-form.tsx     # Editable contact fields form
│   ├── client-matters-list.tsx     # Read-only matters list
│   ├── client-intakes-list.tsx     # Read-only intake submissions
│   ├── client-info-requests-list.tsx  # Read-only info requests
│   └── active-clients-table.tsx    # Table for /clients page
├── lib/
│   ├── data/queries.ts             # + getClientProfile, getActiveClients
│   ├── data/actions.ts             # + updateClientProfile
│   └── validation/schemas.ts       # + updateClientProfileSchema
└── supabase/migrations/
    └── 20260101000001_add_client_contact_fields.sql
```

## Component Responsibilities

- **ClientProfileForm** - React Hook Form with all contact fields, Save button, loading states
- **ClientMattersList** - Maps matters to clickable links with stage badges
- **ClientIntakesList** - Shows intake submissions with status
- **ClientInfoRequestsList** - Shows info requests with response status
- **ActiveClientsTable** - Replaces placeholder in `/clients`, shows all clients with role='client'

## Entry Point Updates

### /clients page
- Replace `ActiveClientsSection` placeholder with `ActiveClientsTable`
- Table columns: Name, Email, Matters, Last Activity, Actions
- Row click navigates to `/clients/[userId]`

### /admin/users page
- Add "View Client Details" to dropdown menu for users with `role === 'client'`
- Links to `/clients/[userId]`

### Pipeline board cards
- Add "View Profile" link on client cards (invitations, intake submissions)
- Only shows if client has signed up (has userId)
