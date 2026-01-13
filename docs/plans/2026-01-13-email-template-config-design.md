# Email Template Configuration Design

**Date**: 2026-01-13
**Status**: Approved

## Overview

Allow admins to customize email branding (firm name, logo, colors, footer) via a settings UI instead of hardcoded values in templates.

## Database Schema

```sql
CREATE TABLE firm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(user_id)
);

-- Initial settings
INSERT INTO firm_settings (key, value) VALUES
  ('firm_name', 'MatterFlow'),
  ('tagline', 'Workflow-first legal practice system'),
  ('logo_url', NULL),
  ('primary_color', '#1e293b'),
  ('reply_to_email', NULL),
  ('footer_text', NULL);
```

**RLS**: Only admins can read/write.

## Data Access Layer

```typescript
// src/lib/data/queries.ts
export async function getFirmSettings(): Promise<Record<string, string | null>> {
  // Returns: { firm_name: "Smith & Co", logo_url: null, ... }
  // Cached in memory for 5 minutes to avoid DB hits on every email
}

// src/lib/data/actions.ts
export async function updateFirmSettings(
  settings: Record<string, string | null>
): Promise<ActionResult> {
  // Admin-only, validates keys, logs to audit_logs
}
```

**Caching**: Settings cached in-memory with 5-minute TTL since they change rarely.

**Validation**: Only allow known setting keys to prevent junk data.

## Template Integration

```typescript
// src/lib/email/templates/base-layout.tsx
interface BaseLayoutProps {
  preview: string;
  heading: string;
  children: React.ReactNode;
  settings: FirmSettings;
}

export const BaseLayout = ({ preview, heading, children, settings }: BaseLayoutProps) => (
  <Html>
    ...
    <Heading style={h1}>{settings.firm_name}</Heading>
    {settings.logo_url && <Img src={settings.logo_url} />}
    ...
    <Text style={{ color: settings.primary_color }}>...</Text>
    <Text>{settings.footer_text || defaultFooter}</Text>
  </Html>
);
```

**Flow**:
1. Email action fetches settings (from cache)
2. Passes settings to template
3. Template renders with firm's branding

Templates remain pure (no DB calls inside) and testable.

## Admin UI

**Route**: `/admin/settings`

```
┌─────────────────────────────────────────────┐
│  Firm Settings                              │
├─────────────────────────────────────────────┤
│                                             │
│  Email Branding                             │
│  ─────────────────                          │
│  Firm Name:     [Smith & Associates    ]    │
│  Tagline:       [Your trusted partner  ]    │
│  Logo URL:      [https://...           ]    │
│  Primary Color: [#1e40af] [■]               │
│  Reply-To:      [contact@firm.com      ]    │
│  Footer Text:   [Custom disclaimer...  ]    │
│                                             │
│  [Preview Email]        [Save Changes]      │
│                                             │
└─────────────────────────────────────────────┘
```

**Features**:
- Live color picker for primary color
- "Preview Email" button opens sample email in new tab
- Form validation (valid hex color, valid email, valid URL)
- Toast notification on save

## Implementation Plan

| Component | Files | Effort |
|-----------|-------|--------|
| Migration | `supabase/migrations/XXXX_firm_settings.sql` | Small |
| Queries/Actions | `src/lib/data/queries.ts`, `actions.ts` | Small |
| Settings type | `src/types/firm-settings.ts` | Small |
| Base layout update | `src/lib/email/templates/base-layout.tsx` | Small |
| Email actions update | `src/lib/email/actions.ts` (pass settings) | Medium |
| Admin UI | `src/app/admin/settings/page.tsx` | Medium |
| Preview endpoint | `src/app/api/email-preview/route.ts` | Small |

## Out of Scope (YAGNI)

- Per-template customization (all emails share same branding)
- Multiple firm profiles (single-tenant assumption)
- Email template versioning
