# Client Intake Management UI - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build intake-first client pipeline management with Kanban board, invitation flow, and intake review.

**Architecture:** Add /clients route with pipeline board showing invite → submission → review workflow. Use server actions for all mutations, React Email for templates, drag-and-drop disabled (status controlled by actions).

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + RLS), shadcn/ui, React Email, Resend

---

## Phase 1: Core Pipeline (MVP)

This plan implements the essential client pipeline: invite clients, track intake submissions, and review/approve intakes.

### Task 1: Database Schema - Client Invitations Table

**Files:**
- Create: `supabase/migrations/20251230000001_client_invitations.sql`

**Step 1: Write migration for client_invitations table**

```sql
-- Migration: Client Invitations & Enhanced Client Tracking
-- Creates tables for invite-first client workflow

-- Client invitations table
CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  matter_type TEXT,
  notes TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  invited_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add client status and contact fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS client_status TEXT CHECK (client_status IN ('invited', 'intake_submitted', 'under_review', 'active', 'past')),
  ADD COLUMN IF NOT EXISTS client_notes TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Add review tracking to intake_responses
ALTER TABLE intake_responses
  ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('pending', 'under_review', 'accepted', 'declined')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Indexes for performance
CREATE INDEX idx_client_invitations_status ON client_invitations(status);
CREATE INDEX idx_client_invitations_invited_by ON client_invitations(invited_by);
CREATE INDEX idx_client_invitations_expires_at ON client_invitations(expires_at);
CREATE INDEX idx_profiles_client_status ON profiles(client_status);
CREATE INDEX idx_intake_responses_review_status ON intake_responses(review_status);

-- RLS Policies for client_invitations
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

-- Staff and admins can see all invitations
CREATE POLICY "Staff and admins can view all invitations"
  ON client_invitations FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('admin', 'staff')
  );

-- Staff and admins can create invitations
CREATE POLICY "Staff and admins can create invitations"
  ON client_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('admin', 'staff')
  );

-- Staff and admins can update invitations
CREATE POLICY "Staff and admins can update invitations"
  ON client_invitations FOR UPDATE
  TO authenticated
  USING (
    current_user_role() IN ('admin', 'staff')
  );

COMMENT ON TABLE client_invitations IS 'Tracks client invitation codes and status for intake-first workflow';
COMMENT ON COLUMN profiles.client_status IS 'Current client lifecycle stage';
COMMENT ON COLUMN intake_responses.review_status IS 'Lawyer review status of intake submission';
```

**Step 2: Apply migration locally**

Run: `supabase db push --local`
Expected: Migration succeeds, tables created

**Step 3: Verify schema**

Run: `supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'client_invitations';" --local`
Expected: Shows all columns

**Step 4: Generate TypeScript types**

Run: `supabase gen types typescript --local > src/types/database.types.ts`
Expected: Types file updated

**Step 5: Commit**

```bash
git add supabase/migrations/20251230000001_client_invitations.sql src/types/database.types.ts
git commit -m "feat(db): add client invitations and enhanced client tracking"
```

---

### Task 2: Server Actions - Invite Client

**Files:**
- Modify: `src/lib/data/actions.ts` (add at bottom)
- Test: `tests/lib/data/client-actions.test.ts` (new file)

**Step 1: Write failing test for inviteClient action**

Create: `tests/lib/data/client-actions.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inviteClient } from '@/lib/data/actions'
import * as server from '@/lib/supabase/server'
import * as auth from '@/lib/auth/server'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/email/client', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue({ ok: true }),
}))

describe('inviteClient', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-1',
              invite_code: 'ABC123',
              client_name: 'Test Client',
              client_email: 'test@example.com',
            },
            error: null,
          }),
        })),
      })),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(mockSupabase as any)
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'user-1' } } as any,
      profile: { role: 'admin', full_name: 'Admin' },
    } as any)
  })

  it('creates invitation and returns invite code', async () => {
    const formData = new FormData()
    formData.set('clientName', 'Test Client')
    formData.set('clientEmail', 'test@example.com')
    formData.set('matterType', 'Contract Review')
    formData.set('notes', 'From phone call')

    const result = await inviteClient(formData)

    expect(result.ok).toBe(true)
    expect(result.inviteCode).toBeTruthy()
    expect(result.inviteLink).toContain('/intake/invite/')
  })

  it('validates required fields', async () => {
    const formData = new FormData()
    formData.set('clientName', '')
    formData.set('clientEmail', 'test@example.com')

    const result = await inviteClient(formData)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Client name is required')
  })

  it('validates email format', async () => {
    const formData = new FormData()
    formData.set('clientName', 'Test')
    formData.set('clientEmail', 'invalid-email')

    const result = await inviteClient(formData)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Valid email is required')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/data/client-actions.test.ts`
Expected: FAIL - inviteClient is not defined

**Step 3: Implement inviteClient action**

Add to `src/lib/data/actions.ts`:

```typescript
/**
 * Invite a new client via email with intake form link
 */
export async function inviteClient(formData: FormData): Promise<{
  ok: boolean
  inviteCode?: string
  inviteLink?: string
  error?: string
}> {
  try {
    // Validate authentication
    const { session, profile } = await getSessionWithProfile()
    if (!session) {
      return { ok: false, error: 'Not authenticated' }
    }

    // Ensure staff or admin
    if (!profile || !['admin', 'staff'].includes(profile.role)) {
      return { ok: false, error: 'Only staff and admins can invite clients' }
    }

    // Extract and validate fields
    const clientName = formData.get('clientName')?.toString().trim()
    const clientEmail = formData.get('clientEmail')?.toString().trim()
    const matterType = formData.get('matterType')?.toString() || null
    const notes = formData.get('notes')?.toString().trim() || null

    if (!clientName) {
      return { ok: false, error: 'Client name is required' }
    }

    if (!clientEmail || !clientEmail.includes('@')) {
      return { ok: false, error: 'Valid email is required' }
    }

    // Generate unique invite code (8 characters, URL-safe)
    const inviteCode = crypto.randomUUID().split('-')[0].toUpperCase()

    // Create invitation record
    const supabase = supabaseAdmin()
    const { data: invitation, error } = await supabase
      .from('client_invitations')
      .insert({
        invite_code: inviteCode,
        client_name: clientName,
        client_email: clientEmail,
        matter_type: matterType,
        notes: notes,
        status: 'pending',
        invited_by: session.user.id,
      })
      .select()
      .single()

    if (error || !invitation) {
      console.error('Error creating invitation:', error)
      return { ok: false, error: error?.message || 'Failed to create invitation' }
    }

    // Generate invite link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${appUrl}/intake/invite/${inviteCode}`

    // Send invitation email (non-blocking)
    try {
      await sendInvitationEmail({
        to: clientEmail,
        clientName: clientName,
        matterType: matterType || 'your matter',
        inviteLink: inviteLink,
        personalNotes: notes || undefined,
        lawyerName: profile.full_name || 'Your Lawyer',
      })
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the whole operation if email fails
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: session.user.id,
      action: 'client_invited',
      details: {
        invitation_id: invitation.id,
        client_email: clientEmail,
        matter_type: matterType,
      },
    })

    revalidatePath('/clients')

    return {
      ok: true,
      inviteCode: inviteCode,
      inviteLink: inviteLink,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('inviteClient error:', message)
    return { ok: false, error: message }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/data/client-actions.test.ts`
Expected: PASS - all tests passing

**Step 5: Commit**

```bash
git add src/lib/data/actions.ts tests/lib/data/client-actions.test.ts
git commit -m "feat(actions): add inviteClient server action with validation"
```

---

### Task 3: Email Template - Invitation Email

**Files:**
- Create: `src/lib/email/templates/invitation-email.tsx`
- Create: `src/lib/email/client.ts` (if doesn't exist)
- Test: `tests/lib/email/invitation-email.test.ts`

**Step 1: Write failing test for invitation email template**

Create: `tests/lib/email/invitation-email.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import InvitationEmail from '@/lib/email/templates/invitation-email'

describe('InvitationEmail', () => {
  it('renders invitation email with all props', () => {
    const html = render(
      <InvitationEmail
        clientName="John Doe"
        matterType="Contract Review"
        inviteLink="https://app.example.com/intake/invite/ABC123"
        lawyerName="Jane Smith"
        firmName="Smith Law"
        personalNotes="Looking forward to reviewing your contract."
      />
    )

    expect(html).toContain('John Doe')
    expect(html).toContain('Contract Review')
    expect(html).toContain('intake/invite/ABC123')
    expect(html).toContain('Looking forward to reviewing your contract')
  })

  it('renders without optional personalNotes', () => {
    const html = render(
      <InvitationEmail
        clientName="John Doe"
        matterType="Contract Review"
        inviteLink="https://app.example.com/intake/invite/ABC123"
        lawyerName="Jane Smith"
      />
    )

    expect(html).toContain('John Doe')
    expect(html).toContain('Complete Your Intake Form')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/email/invitation-email.test.ts`
Expected: FAIL - InvitationEmail not found

**Step 3: Implement invitation email template**

Create: `src/lib/email/templates/invitation-email.tsx`

```typescript
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Button,
  Hr,
} from '@react-email/components'

interface InvitationEmailProps {
  clientName: string
  matterType: string
  inviteLink: string
  lawyerName: string
  firmName?: string
  personalNotes?: string
}

export default function InvitationEmail({
  clientName,
  matterType,
  inviteLink,
  lawyerName,
  firmName = 'MatterFlow',
  personalNotes,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Complete your intake form for {firmName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={heading}>Complete Your Intake Form</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi {clientName},</Text>

            {personalNotes && (
              <Text style={paragraph}>{personalNotes}</Text>
            )}

            <Text style={paragraph}>
              I've created a secure intake form for you to complete. This helps me
              understand your {matterType.toLowerCase()} matter and determine how I
              can best help you.
            </Text>

            <Text style={paragraph}>
              <strong>Matter Type:</strong> {matterType}
              <br />
              <strong>Estimated Time:</strong> 10-15 minutes
            </Text>

            <Button style={button} href={inviteLink}>
              Complete Your Intake Form
            </Button>

            <Text style={note}>
              This link is secure and expires in 7 days. If you have any questions,
              feel free to reply to this email.
            </Text>

            <Hr style={divider} />

            <Text style={signature}>
              Best regards,
              <br />
              {lawyerName}
              <br />
              {firmName}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
}

const header = {
  backgroundColor: '#1e293b',
  padding: '24px',
  borderRadius: '8px 8px 0 0',
}

const heading = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: 0,
  textAlign: 'center' as const,
}

const content = {
  backgroundColor: '#ffffff',
  padding: '32px',
  borderRadius: '0 0 8px 8px',
}

const greeting = {
  fontSize: '18px',
  marginBottom: '16px',
  color: '#1e293b',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#475569',
  marginBottom: '16px',
}

const button = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '16px',
  display: 'inline-block',
  margin: '24px 0',
}

const note = {
  fontSize: '14px',
  color: '#64748b',
  fontStyle: 'italic',
  marginTop: '16px',
}

const divider = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
}

const signature = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '20px',
}
```

Create: `src/lib/email/client.ts`

```typescript
import { Resend } from 'resend'
import InvitationEmail from './templates/invitation-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendInvitationEmailParams {
  to: string
  clientName: string
  matterType: string
  inviteLink: string
  personalNotes?: string
  lawyerName: string
  firmName?: string
}

export async function sendInvitationEmail(params: SendInvitationEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: params.to,
      subject: `Complete Your Intake Form for ${params.firmName || 'MatterFlow'}`,
      react: InvitationEmail(params),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Email sending error:', message)
    return { ok: false, error: message }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/email/invitation-email.test.ts`
Expected: PASS

**Step 5: Preview email template**

Run: `pnpm email`
Open: http://localhost:3001
Expected: Can preview InvitationEmail template

**Step 6: Commit**

```bash
git add src/lib/email/templates/invitation-email.tsx src/lib/email/client.ts tests/lib/email/invitation-email.test.ts
git commit -m "feat(email): add invitation email template with Resend"
```

---

### Task 4: Query Functions - Fetch Client Invitations

**Files:**
- Modify: `src/lib/data/queries.ts` (add at bottom)
- Test: `tests/lib/data/client-queries.test.ts`

**Step 1: Write failing test for fetchClientInvitations**

Create: `tests/lib/data/client-queries.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchClientInvitations, fetchIntakesByReviewStatus } from '@/lib/data/queries'
import * as server from '@/lib/supabase/server'

vi.mock('@/lib/auth/server', () => ({
  getSessionWithProfile: vi.fn().mockResolvedValue({
    session: { user: { id: 'user-1' } },
    profile: { role: 'admin' },
  }),
}))

describe('fetchClientInvitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns invitations grouped by status', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                invite_code: 'ABC123',
                client_name: 'Test Client',
                client_email: 'test@example.com',
                matter_type: 'Contract Review',
                status: 'pending',
                invited_at: '2025-12-28T10:00:00Z',
              },
            ],
            error: null,
          }),
        })),
      })),
    } as any)

    const result = await fetchClientInvitations()

    expect(result.pending).toHaveLength(1)
    expect(result.pending[0].clientName).toBe('Test Client')
  })

  it('returns mock data when Supabase not ready', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(false)

    const result = await fetchClientInvitations()

    expect(result.source).toBe('mock')
  })
})

describe('fetchIntakesByReviewStatus', () => {
  it('returns intakes grouped by review status', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                matter_id: 'matter-1',
                form_type: 'Contract Review',
                review_status: 'pending',
                submitted_at: '2025-12-29T10:00:00Z',
                responses: { client_name: 'John Doe' },
              },
            ],
            error: null,
          }),
        })),
      })),
    } as any)

    const result = await fetchIntakesByReviewStatus()

    expect(result.pending).toHaveLength(1)
    expect(result.pending[0].formType).toBe('Contract Review')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/data/client-queries.test.ts`
Expected: FAIL - functions not defined

**Step 3: Implement query functions**

Add to `src/lib/data/queries.ts`:

```typescript
// Add these types near the other type definitions
export type ClientInvitation = {
  id: string
  inviteCode: string
  clientName: string
  clientEmail: string
  matterType: string | null
  notes: string | null
  status: string
  invitedAt: string
  expiresAt: string
  daysAgo: number
}

export type IntakeReview = {
  id: string
  matterId: string
  formType: string
  reviewStatus: string
  submittedAt: string
  responses: Record<string, any>
  internalNotes: string | null
  isNew: boolean
}

/**
 * Fetch client invitations grouped by status
 */
export async function fetchClientInvitations(): Promise<{
  pending: ClientInvitation[]
  completed: ClientInvitation[]
  expired: ClientInvitation[]
  source: DataSource
  error?: string
}> {
  const { session } = await getSessionWithProfile()

  if (!session) {
    return { pending: [], completed: [], expired: [], source: 'mock' }
  }

  if (!supabaseEnvReady()) {
    // Mock data for development
    const mockInvitation: ClientInvitation = {
      id: 'mock-invite-1',
      inviteCode: 'ABC123',
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      matterType: 'Contract Review',
      notes: 'Phone consultation follow-up',
      status: 'pending',
      invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      daysAgo: 2,
    }

    return {
      pending: [mockInvitation],
      completed: [],
      expired: [],
      source: 'mock',
    }
  }

  try {
    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from('client_invitations')
      .select('*')
      .order('invited_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return {
        pending: [],
        completed: [],
        expired: [],
        source: 'supabase',
        error: error.message,
      }
    }

    const now = new Date()
    const mapped = (data || []).map((inv) => ({
      id: inv.id,
      inviteCode: inv.invite_code,
      clientName: inv.client_name,
      clientEmail: inv.client_email,
      matterType: inv.matter_type,
      notes: inv.notes,
      status: inv.status,
      invitedAt: inv.invited_at,
      expiresAt: inv.expires_at,
      daysAgo: Math.floor(
        (now.getTime() - new Date(inv.invited_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))

    return {
      pending: mapped.filter((i) => i.status === 'pending'),
      completed: mapped.filter((i) => i.status === 'completed'),
      expired: mapped.filter((i) => i.status === 'expired'),
      source: 'supabase',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      pending: [],
      completed: [],
      expired: [],
      source: 'supabase',
      error: message,
    }
  }
}

/**
 * Fetch intake submissions grouped by review status
 */
export async function fetchIntakesByReviewStatus(): Promise<{
  pending: IntakeReview[]
  underReview: IntakeReview[]
  source: DataSource
  error?: string
}> {
  const { session } = await getSessionWithProfile()

  if (!session) {
    return { pending: [], underReview: [], source: 'mock' }
  }

  if (!supabaseEnvReady()) {
    // Mock data
    const mockIntake: IntakeReview = {
      id: 'mock-intake-1',
      matterId: 'mock-matter-1',
      formType: 'Contract Review',
      reviewStatus: 'pending',
      submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      responses: {
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        company_name: 'Acme Corp',
      },
      internalNotes: null,
      isNew: true,
    }

    return {
      pending: [mockIntake],
      underReview: [],
      source: 'mock',
    }
  }

  try {
    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from('intake_responses')
      .select('*')
      .in('review_status', ['pending', 'under_review'])
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching intake reviews:', error)
      return {
        pending: [],
        underReview: [],
        source: 'supabase',
        error: error.message,
      }
    }

    const now = new Date()
    const mapped = (data || []).map((intake) => ({
      id: intake.id,
      matterId: intake.matter_id,
      formType: intake.form_type,
      reviewStatus: intake.review_status,
      submittedAt: intake.submitted_at || '',
      responses: intake.responses || {},
      internalNotes: intake.internal_notes,
      isNew:
        intake.submitted_at &&
        now.getTime() - new Date(intake.submitted_at).getTime() < 24 * 60 * 60 * 1000,
    }))

    return {
      pending: mapped.filter((i) => i.reviewStatus === 'pending'),
      underReview: mapped.filter((i) => i.reviewStatus === 'under_review'),
      source: 'supabase',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { pending: [], underReview: [], source: 'supabase', error: message }
  }
}
```

**Step 4: Run tests**

Run: `pnpm test tests/lib/data/client-queries.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/data/queries.ts tests/lib/data/client-queries.test.ts
git commit -m "feat(queries): add client invitations and intake review queries"
```

---

### Task 5: Clients Page - Route & Layout

**Files:**
- Create: `src/app/clients/page.tsx`
- Modify: `src/components/app-shell.tsx` (add Clients to nav)

**Step 1: Add Clients to navigation**

Modify `src/components/app-shell.tsx`:

```typescript
const links = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" }, // Add this line
  { href: "/matters", label: "Matters" },
  { href: "/tasks", label: "Tasks" },
  { href: "/time", label: "Time" },
  { href: "/billing", label: "Billing" },
];
```

**Step 2: Create Clients page**

Create: `src/app/clients/page.tsx`

```typescript
import { Suspense } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PipelineBoard } from '@/components/clients/pipeline-board'
import { ActiveClientsSection } from '@/components/clients/active-clients-section'
import { InviteClientModal } from '@/components/clients/invite-client-modal'
import {
  fetchClientInvitations,
  fetchIntakesByReviewStatus,
} from '@/lib/data/queries'

export default async function ClientsPage() {
  const [invitations, intakes] = await Promise.all([
    fetchClientInvitations(),
    fetchIntakesByReviewStatus(),
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Clients
          </h1>
          <p className="text-slate-600 mt-1">
            Manage client invitations, intake reviews, and active clients
          </p>
        </div>

        <div className="flex gap-2">
          <InviteClientModal />
          <Button variant="outline">Add Client Manually</Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Invited</div>
          <div className="text-2xl font-bold text-slate-900">
            {invitations.pending.length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Under Review</div>
          <div className="text-2xl font-bold text-slate-900">
            {intakes.pending.length + intakes.underReview.length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Active</div>
          <div className="text-2xl font-bold text-slate-900">0</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Past</div>
          <div className="text-2xl font-bold text-slate-900">0</div>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Client Pipeline
        </h2>
        <Suspense fallback={<div>Loading pipeline...</div>}>
          <PipelineBoard
            invitations={invitations}
            intakes={intakes}
          />
        </Suspense>
      </div>

      {/* Active Clients Section */}
      <ActiveClientsSection />
    </div>
  )
}
```

**Step 3: Test navigation**

Run: `pnpm dev`
Navigate to: http://localhost:3000/clients
Expected: Page loads (components not implemented yet, will show errors)

**Step 4: Commit**

```bash
git add src/app/clients/page.tsx src/components/app-shell.tsx
git commit -m "feat(ui): add /clients route and navigation"
```

---

### Task 6: Pipeline Board Component

**Files:**
- Create: `src/components/clients/pipeline-board.tsx`
- Create: `src/components/clients/pipeline-card.tsx`
- Test: `tests/components/pipeline-board.test.tsx`

**Step 1: Write failing test**

Create: `tests/components/pipeline-board.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PipelineBoard } from '@/components/clients/pipeline-board'

describe('PipelineBoard', () => {
  it('renders three columns', () => {
    render(
      <PipelineBoard
        invitations={{ pending: [], completed: [], expired: [], source: 'mock' }}
        intakes={{ pending: [], underReview: [], source: 'mock' }}
      />
    )

    expect(screen.getByText('Invited')).toBeInTheDocument()
    expect(screen.getByText('Intake Submitted')).toBeInTheDocument()
    expect(screen.getByText('Under Review')).toBeInTheDocument()
  })

  it('displays invitation cards in Invited column', () => {
    const mockInvitations = {
      pending: [
        {
          id: '1',
          inviteCode: 'ABC123',
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
          matterType: 'Contract Review',
          notes: null,
          status: 'pending',
          invitedAt: '2025-12-28T10:00:00Z',
          expiresAt: '2026-01-04T10:00:00Z',
          daysAgo: 2,
        },
      ],
      completed: [],
      expired: [],
      source: 'mock' as const,
    }

    render(
      <PipelineBoard
        invitations={mockInvitations}
        intakes={{ pending: [], underReview: [], source: 'mock' }}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/components/pipeline-board.test.tsx`
Expected: FAIL - component not found

**Step 3: Implement PipelineBoard component**

Create: `src/components/clients/pipeline-board.tsx`

```typescript
'use client'

import { Mail, FileCheck, Clock } from 'lucide-react'
import { PipelineCard } from './pipeline-card'
import type { ClientInvitation, IntakeReview } from '@/lib/data/queries'

interface PipelineBoardProps {
  invitations: {
    pending: ClientInvitation[]
    completed: ClientInvitation[]
    expired: ClientInvitation[]
    source: 'supabase' | 'mock'
  }
  intakes: {
    pending: IntakeReview[]
    underReview: IntakeReview[]
    source: 'supabase' | 'mock'
  }
}

export function PipelineBoard({ invitations, intakes }: PipelineBoardProps) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Column 1: Invited */}
      <PipelineColumn
        title="Invited"
        icon={<Mail className="h-5 w-5" />}
        count={invitations.pending.length}
        emptyMessage="No pending invitations"
      >
        {invitations.pending.map((invitation) => (
          <PipelineCard
            key={invitation.id}
            type="invitation"
            data={invitation}
          />
        ))}
      </PipelineColumn>

      {/* Column 2: Intake Submitted */}
      <PipelineColumn
        title="Intake Submitted"
        icon={<FileCheck className="h-5 w-5" />}
        count={intakes.pending.length}
        emptyMessage="No submissions awaiting review"
      >
        {intakes.pending.map((intake) => (
          <PipelineCard key={intake.id} type="intake-submitted" data={intake} />
        ))}
      </PipelineColumn>

      {/* Column 3: Under Review */}
      <PipelineColumn
        title="Under Review"
        icon={<Clock className="h-5 w-5" />}
        count={intakes.underReview.length}
        emptyMessage="No intakes under review"
      >
        {intakes.underReview.map((intake) => (
          <PipelineCard key={intake.id} type="under-review" data={intake} />
        ))}
      </PipelineColumn>
    </div>
  )
}

function PipelineColumn({
  title,
  icon,
  count,
  emptyMessage,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  emptyMessage: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-slate-600">{icon}</div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full text-sm font-medium">
          {count}
        </div>
      </div>

      {/* Cards Container */}
      <div className="space-y-3">
        {count === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
```

Create: `src/components/clients/pipeline-card.tsx`

```typescript
'use client'

import { Mail, Copy, X, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ClientInvitation, IntakeReview } from '@/lib/data/queries'

type PipelineCardProps =
  | {
      type: 'invitation'
      data: ClientInvitation
    }
  | {
      type: 'intake-submitted' | 'under-review'
      data: IntakeReview
    }

export function PipelineCard({ type, data }: PipelineCardProps) {
  if (type === 'invitation') {
    const invitation = data as ClientInvitation
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="font-semibold text-slate-900">
              {invitation.clientName}
            </div>
            <div className="text-sm text-slate-600">{invitation.clientEmail}</div>
          </div>
          <Mail className="h-4 w-4 text-slate-400" />
        </div>

        {invitation.matterType && (
          <Badge variant="secondary" className="mb-2">
            {invitation.matterType}
          </Badge>
        )}

        <div className="text-xs text-slate-500">
          Invited {invitation.daysAgo} day{invitation.daysAgo !== 1 ? 's' : ''} ago
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="ghost" className="flex-1">
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button size="sm" variant="ghost">
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  const intake = data as IntakeReview
  const isNew = intake.isNew

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-semibold text-slate-900 flex items-center gap-2">
            {intake.responses.full_name || 'Unknown'}
            {isNew && (
              <Badge variant="destructive" className="text-xs">
                NEW
              </Badge>
            )}
          </div>
          <div className="text-sm text-slate-600">
            {intake.responses.email || 'No email provided'}
          </div>
        </div>
      </div>

      <Badge variant="secondary" className="mb-2">
        {intake.formType}
      </Badge>

      <div className="text-xs text-slate-500 mb-3">
        {type === 'under-review' && 'Waiting on client response'}
      </div>

      <Button size="sm" className="w-full">
        Review Intake
      </Button>
    </div>
  )
}
```

**Step 4: Run tests**

Run: `pnpm test tests/components/pipeline-board.test.tsx`
Expected: PASS

**Step 5: Test UI**

Run: `pnpm dev`
Navigate: http://localhost:3000/clients
Expected: Pipeline board renders with 3 columns

**Step 6: Commit**

```bash
git add src/components/clients/pipeline-board.tsx src/components/clients/pipeline-card.tsx tests/components/pipeline-board.test.tsx
git commit -m "feat(ui): add pipeline board with three-column layout"
```

---

### Task 7: Invite Client Modal

**Files:**
- Create: `src/components/clients/invite-client-modal.tsx`
- Test: `tests/components/invite-client-modal.test.tsx`

**Step 1: Write failing test**

Create: `tests/components/invite-client-modal.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteClientModal } from '@/components/clients/invite-client-modal'

// Mock server action
vi.mock('@/lib/data/actions', () => ({
  inviteClient: vi.fn().mockResolvedValue({
    ok: true,
    inviteCode: 'ABC123',
    inviteLink: 'http://localhost:3000/intake/invite/ABC123',
  }),
}))

describe('InviteClientModal', () => {
  it('opens modal on button click', async () => {
    const user = userEvent.setup()
    render(<InviteClientModal />)

    await user.click(screen.getByText('Invite New Client'))

    expect(screen.getByLabelText(/client name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<InviteClientModal />)

    await user.click(screen.getByText('Invite New Client'))
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => {
      expect(screen.getByText(/client name is required/i)).toBeInTheDocument()
    })
  })

  it('submits form successfully', async () => {
    const user = userEvent.setup()
    const { inviteClient } = await import('@/lib/data/actions')

    render(<InviteClientModal />)

    await user.click(screen.getByText('Invite New Client'))
    await user.type(screen.getByLabelText(/client name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => {
      expect(inviteClient).toHaveBeenCalled()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/components/invite-client-modal.test.tsx`
Expected: FAIL

**Step 3: Implement InviteClientModal**

Create: `src/components/clients/invite-client-modal.tsx`

```typescript
'use client'

import { useState } from 'react'
import { UserPlus, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { inviteClient } from '@/lib/data/actions'

export function InviteClientModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ code: string; link: string } | null>(
    null
  )
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await inviteClient(formData)

    if (!result.ok) {
      setError(result.error || 'Failed to send invitation')
      setLoading(false)
      return
    }

    // Show success state with invite link
    setSuccess({
      code: result.inviteCode!,
      link: result.inviteLink!,
    })
    setLoading(false)
  }

  function handleClose() {
    setOpen(false)
    setError(null)
    setSuccess(null)
    setCopied(false)
  }

  async function copyLink() {
    if (success?.link) {
      await navigator.clipboard.writeText(success.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite New Client
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite New Client</DialogTitle>
          <DialogDescription>
            Send a personalized intake form to a prospective client
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="font-semibold text-green-900 mb-2">
                ✓ Invitation sent!
              </div>
              <div className="text-sm text-green-700">
                Email sent with intake form link. You can also share this link
                manually:
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input value={success.link} readOnly className="flex-1" />
              <Button
                onClick={copyLink}
                variant="outline"
                size="icon"
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="clientName">
                Client Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clientName"
                name="clientName"
                required
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="clientEmail">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clientEmail"
                name="clientEmail"
                type="email"
                required
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="matterType">Matter Type</Label>
              <Select name="matterType">
                <SelectTrigger>
                  <SelectValue placeholder="Select matter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contract Review">Contract Review</SelectItem>
                  <SelectItem value="Employment Agreement">
                    Employment Agreement
                  </SelectItem>
                  <SelectItem value="Policy Review">Policy Review</SelectItem>
                  <SelectItem value="Unknown">
                    Unknown / Not Yet Determined
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">
                Personal Notes <span className="text-slate-500">(Optional)</span>
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Following up on our phone call about..."
                maxLength={500}
                rows={3}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

**Step 4: Run tests**

Run: `pnpm test tests/components/invite-client-modal.test.tsx`
Expected: PASS

**Step 5: Test UI**

Run: `pnpm dev`
Navigate: http://localhost:3000/clients
Click: "Invite New Client"
Expected: Modal opens with form

**Step 6: Commit**

```bash
git add src/components/clients/invite-client-modal.tsx tests/components/invite-client-modal.test.tsx
git commit -m "feat(ui): add invite client modal with form validation"
```

---

### Task 8: Stub Remaining Components

**Files:**
- Create: `src/components/clients/active-clients-section.tsx`
- Create: `src/components/clients/intake-review-modal.tsx`

**Step 1: Create ActiveClientsSection stub**

Create: `src/components/clients/active-clients-section.tsx`

```typescript
export function ActiveClientsSection() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        Active Clients
      </h2>
      <div className="text-center py-12 text-slate-500">
        <p>Active clients section - to be implemented in Phase 3</p>
      </div>
    </div>
  )
}
```

**Step 2: Create IntakeReviewModal stub**

Create: `src/components/clients/intake-review-modal.tsx`

```typescript
'use client'

export function IntakeReviewModal() {
  return (
    <div>
      {/* To be implemented: Full intake review modal with accept/decline actions */}
    </div>
  )
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/clients/active-clients-section.tsx src/components/clients/intake-review-modal.tsx
git commit -m "feat(ui): add stub components for active clients and intake review"
```

---

## Implementation Complete!

This plan provides the foundation for Phase 1: Core Pipeline. Next phases would include:

- **Phase 2:** Intake Review Modal with Accept/Decline actions
- **Phase 3:** Active/Past Clients Management
- **Phase 4:** Enhanced features (info requests, scheduling, etc.)

## Testing Strategy

Run full test suite before considering complete:
```bash
pnpm test
pnpm typecheck
pnpm build
```

## Documentation

Update CLAUDE.md with:
- New /clients route
- Client invitation workflow
- Database schema changes

---
