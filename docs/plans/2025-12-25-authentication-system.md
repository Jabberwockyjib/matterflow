# Authentication System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build complete admin-controlled authentication system with user management, invitation flow, password reset, and secure session handling.

**Architecture:** Admin-only invitation model using Supabase Auth + custom user management. Temporary passwords on invite, forced change on first login, self-service password reset. All auth events logged to audit trail.

**Tech Stack:** Next.js 15 App Router, Supabase Auth (@supabase/ssr), React Hook Form, Zod validation, Resend for emails, React Email templates

---

## Task 1: Database Migration - Add Auth Columns to Profiles

**Files:**
- Create: `supabase/migrations/20251225000001_add_auth_columns.sql`

**Step 1: Write migration SQL**

```sql
-- Add authentication management columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'inactive')),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Create index on last_login for sorting
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login);

-- Update RLS policies for admin user management
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id OR
         (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

-- Users can update own profile (basic fields only)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

-- Update audit_logs with new event types
COMMENT ON TABLE audit_logs IS 'Audit trail for all system events including: user.invited, user.first_login, user.password_changed, user.password_reset_requested, user.password_reset_completed, user.role_changed, user.deactivated, user.reactivated, auth.failed_login';
```

**Step 2: Apply migration locally**

Run: `supabase migration up`
Expected: Success message showing migration applied

**Step 3: Verify schema changes**

Run: `supabase db dump --schema public --table profiles`
Expected: See new columns in output

**Step 4: Regenerate TypeScript types**

Run: `supabase gen types typescript --local > src/types/database.types.ts`
Expected: Updated types file

**Step 5: Commit**

```bash
git add supabase/migrations/20251225000001_add_auth_columns.sql src/types/database.types.ts
git commit -m "feat: add auth management columns to profiles table"
```

---

## Task 2: Validation Schemas for Auth Forms

**Files:**
- Modify: `src/lib/validation/schemas.ts`

**Step 1: Write test for invite user schema**

Create: `tests/lib/validation/auth-schemas.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { inviteUserSchema, passwordResetSchema, changePasswordSchema } from '@/lib/validation/schemas'

describe('Auth Validation Schemas', () => {
  describe('inviteUserSchema', () => {
    it('accepts valid invitation data', () => {
      const valid = {
        email: 'user@example.com',
        fullName: 'John Doe',
        role: 'staff' as const,
      }
      expect(() => inviteUserSchema.parse(valid)).not.toThrow()
    })

    it('rejects invalid email', () => {
      const invalid = {
        email: 'not-an-email',
        fullName: 'John Doe',
        role: 'staff' as const,
      }
      expect(() => inviteUserSchema.parse(invalid)).toThrow()
    })

    it('rejects invalid role', () => {
      const invalid = {
        email: 'user@example.com',
        fullName: 'John Doe',
        role: 'invalid' as const,
      }
      expect(() => inviteUserSchema.parse(invalid)).toThrow()
    })

    it('rejects empty full name', () => {
      const invalid = {
        email: 'user@example.com',
        fullName: '',
        role: 'staff' as const,
      }
      expect(() => inviteUserSchema.parse(invalid)).toThrow()
    })
  })

  describe('passwordResetSchema', () => {
    it('accepts valid password', () => {
      const valid = {
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      }
      expect(() => passwordResetSchema.parse(valid)).not.toThrow()
    })

    it('rejects password under 8 characters', () => {
      const invalid = {
        password: 'Short1',
        confirmPassword: 'Short1',
      }
      expect(() => passwordResetSchema.parse(invalid)).toThrow()
    })

    it('rejects password without uppercase', () => {
      const invalid = {
        password: 'securepass123',
        confirmPassword: 'securepass123',
      }
      expect(() => passwordResetSchema.parse(invalid)).toThrow()
    })

    it('rejects password without lowercase', () => {
      const invalid = {
        password: 'SECUREPASS123',
        confirmPassword: 'SECUREPASS123',
      }
      expect(() => passwordResetSchema.parse(invalid)).toThrow()
    })

    it('rejects password without number', () => {
      const invalid = {
        password: 'SecurePassword',
        confirmPassword: 'SecurePassword',
      }
      expect(() => passwordResetSchema.parse(invalid)).toThrow()
    })

    it('rejects mismatched passwords', () => {
      const invalid = {
        password: 'SecurePass123',
        confirmPassword: 'DifferentPass123',
      }
      expect(() => passwordResetSchema.parse(invalid)).toThrow()
    })
  })

  describe('changePasswordSchema', () => {
    it('accepts valid password change data', () => {
      const valid = {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456',
        confirmPassword: 'NewPass456',
      }
      expect(() => changePasswordSchema.parse(valid)).not.toThrow()
    })

    it('rejects when new password same as current', () => {
      const invalid = {
        currentPassword: 'SamePass123',
        newPassword: 'SamePass123',
        confirmPassword: 'SamePass123',
      }
      expect(() => changePasswordSchema.parse(invalid)).toThrow()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/validation/auth-schemas.test.ts`
Expected: FAIL - schemas not defined

**Step 3: Add validation schemas**

```typescript
// In src/lib/validation/schemas.ts

// Add to existing file:

// Invite user schema
export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required').max(100, 'Full name too long'),
  role: z.enum(['admin', 'staff', 'client'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
})

export type InviteUserFormData = z.infer<typeof inviteUserSchema>

// Password reset schema
const passwordRequirements = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const passwordResetSchema = z
  .object({
    password: passwordRequirements,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type PasswordResetFormData = z.infer<typeof passwordResetSchema>

// Change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordRequirements,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/validation/auth-schemas.test.ts`
Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add src/lib/validation/schemas.ts tests/lib/validation/auth-schemas.test.ts
git commit -m "feat: add validation schemas for auth forms"
```

---

## Task 3: Email Templates

**Files:**
- Create: `emails/user-invitation.tsx`
- Create: `emails/password-reset.tsx`
- Create: `emails/admin-password-reset.tsx`

**Step 1: Create invitation email template**

```typescript
// emails/user-invitation.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components'

interface UserInvitationEmailProps {
  fullName: string
  email: string
  temporaryPassword: string
  role: string
  appUrl: string
}

export const UserInvitationEmail = ({
  fullName,
  email,
  temporaryPassword,
  role,
  appUrl,
}: UserInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to MatterFlow™</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={section}>
          <Text style={heading}>Welcome to MatterFlow™</Text>
          <Text style={paragraph}>Hi {fullName},</Text>
          <Text style={paragraph}>
            You've been invited to join MatterFlow™ as a <strong>{role}</strong>.
          </Text>
          <Text style={paragraph}>Your login credentials:</Text>
          <Section style={codeBox}>
            <Text style={code}>Email: {email}</Text>
            <Text style={code}>Temporary Password: {temporaryPassword}</Text>
          </Section>
          <Text style={paragraph}>
            <Link href={`${appUrl}/auth/sign-in`} style={button}>
              Sign in to MatterFlow™
            </Link>
          </Text>
          <Text style={paragraph}>
            You'll be required to change your password on first login.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>MatterFlow™ - Control Center</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default UserInvitationEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const section = {
  padding: '0 48px',
}

const heading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#1e293b',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#334155',
}

const codeBox = {
  background: '#f1f5f9',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const code = {
  fontSize: '14px',
  fontFamily: 'monospace',
  color: '#0f172a',
  margin: '4px 0',
}

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '16px 0',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
}

const footer = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '16px',
}
```

**Step 2: Create password reset email template**

```typescript
// emails/password-reset.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components'

interface PasswordResetEmailProps {
  resetLink: string
}

export const PasswordResetEmail = ({ resetLink }: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your MatterFlow™ password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={section}>
          <Text style={heading}>Reset your password</Text>
          <Text style={paragraph}>
            We received a request to reset your MatterFlow™ password.
          </Text>
          <Text style={paragraph}>
            <Link href={resetLink} style={button}>
              Reset Password
            </Link>
          </Text>
          <Text style={paragraph}>
            This link expires in 1 hour.
          </Text>
          <Text style={paragraph}>
            If you didn't request this, you can safely ignore this email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>MatterFlow™ - Control Center</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

// Reuse styles from invitation email
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const section = {
  padding: '0 48px',
}

const heading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#1e293b',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#334155',
}

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '16px 0',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
}

const footer = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '16px',
}
```

**Step 3: Create admin password reset email template**

```typescript
// emails/admin-password-reset.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components'

interface AdminPasswordResetEmailProps {
  fullName: string
  temporaryPassword: string
  appUrl: string
}

export const AdminPasswordResetEmail = ({
  fullName,
  temporaryPassword,
  appUrl,
}: AdminPasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Your MatterFlow™ password was reset</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={section}>
          <Text style={heading}>Password Reset</Text>
          <Text style={paragraph}>Hi {fullName},</Text>
          <Text style={paragraph}>
            An administrator has reset your MatterFlow™ password.
          </Text>
          <Section style={codeBox}>
            <Text style={code}>New Temporary Password: {temporaryPassword}</Text>
          </Section>
          <Text style={paragraph}>
            <Link href={`${appUrl}/auth/sign-in`} style={button}>
              Sign in to MatterFlow™
            </Link>
          </Text>
          <Text style={paragraph}>
            You'll be required to change this password on your next login.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>MatterFlow™ - Control Center</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default AdminPasswordResetEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const section = {
  padding: '0 48px',
}

const heading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#1e293b',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#334155',
}

const codeBox = {
  background: '#f1f5f9',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const code = {
  fontSize: '14px',
  fontFamily: 'monospace',
  color: '#0f172a',
  margin: '4px 0',
}

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '16px 0',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
}

const footer = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '16px',
}
```

**Step 4: Test email preview**

Run: `pnpm email`
Expected: Email dev server starts, can preview templates at http://localhost:3000

**Step 5: Commit**

```bash
git add emails/
git commit -m "feat: add email templates for auth system"
```

---

## Task 4: Server Action - inviteUser

**Files:**
- Modify: `src/lib/data/actions.ts`

**Step 1: Write test for inviteUser action**

Create: `tests/lib/data/auth-actions.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inviteUser } from '@/lib/data/actions'
import * as auth from '@/lib/auth/server'
import { Resend } from 'resend'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: vi.fn(() => ({
    auth: {
      admin: {
        createUser: vi.fn(),
      },
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}))

// Mock Resend
vi.mock('resend')

describe('inviteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'admin-id', email: 'admin@example.com' } },
      profile: { full_name: 'Admin', role: 'admin' },
    } as any)
  })

  it('successfully invites a new user', async () => {
    const result = await inviteUser({
      email: 'newuser@example.com',
      fullName: 'New User',
      role: 'staff',
    })

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('userId')
  })

  it('rejects invitation from non-admin', async () => {
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'staff-id' } },
      profile: { full_name: 'Staff', role: 'staff' },
    } as any)

    const result = await inviteUser({
      email: 'newuser@example.com',
      fullName: 'New User',
      role: 'staff',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('admin')
  })

  it('validates email format', async () => {
    const result = await inviteUser({
      email: 'invalid-email',
      fullName: 'New User',
      role: 'staff',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('email')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/data/auth-actions.test.ts`
Expected: FAIL - inviteUser not defined

**Step 3: Implement inviteUser action**

```typescript
// Add to src/lib/data/actions.ts

import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import UserInvitationEmail from '../../emails/user-invitation'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Generate a secure temporary password
 */
function generateTemporaryPassword(): string {
  return randomBytes(12).toString('base64').slice(0, 12)
}

/**
 * Invite a new user to the system (admin only)
 */
export async function inviteUser(data: {
  email: string
  fullName: string
  role: 'admin' | 'staff' | 'client'
}): Promise<ActionResult> {
  try {
    // Validate admin permission
    const { profile } = await getSessionWithProfile()
    if (profile?.role !== 'admin') {
      return { success: false, error: 'Only admins can invite users' }
    }

    // Validate input
    const validated = inviteUserSchema.safeParse(data)
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message }
    }

    const { email, fullName, role } = validated.data
    const supabase = supabaseAdmin()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', email)
      .single()

    if (existingUser) {
      return { success: false, error: 'User with this email already exists' }
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword()

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError || !authUser.user) {
      console.error('Auth user creation error:', authError)
      return { success: false, error: authError?.message || 'Failed to create user' }
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        full_name: fullName,
        role,
        password_must_change: true,
        status: 'active',
        invited_by: profile?.user_id,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: 'Failed to create user profile' }
    }

    // Send invitation email
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const emailHtml = render(
        UserInvitationEmail({
          fullName,
          email,
          temporaryPassword,
          role,
          appUrl,
        })
      )

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@matterflow.com',
        to: email,
        subject: 'Welcome to MatterFlow™',
        html: emailHtml,
      })
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the invitation if email fails
    }

    // Log to audit trail
    await supabase.from('audit_logs').insert({
      user_id: profile?.user_id,
      entity_type: 'user',
      entity_id: authUser.user.id,
      action: 'user.invited',
      details: {
        email,
        fullName,
        role,
        invitedBy: profile?.full_name,
      },
    })

    return {
      success: true,
      data: { userId: authUser.user.id },
    }
  } catch (error) {
    console.error('inviteUser error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/data/auth-actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/data/actions.ts tests/lib/data/auth-actions.test.ts
git commit -m "feat: add inviteUser server action"
```

---

## Task 5: Server Action - getAllUsers

**Files:**
- Modify: `src/lib/data/actions.ts`

**Step 1: Write test**

```typescript
// Add to tests/lib/data/auth-actions.test.ts

describe('getAllUsers', () => {
  it('returns all users for admin', async () => {
    const result = await getAllUsers()

    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('rejects non-admin users', async () => {
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'staff-id' } },
      profile: { full_name: 'Staff', role: 'staff' },
    } as any)

    const result = await getAllUsers()

    expect(result.success).toBe(false)
    expect(result.error).toContain('admin')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/data/auth-actions.test.ts`
Expected: FAIL

**Step 3: Implement getAllUsers**

```typescript
// Add to src/lib/data/actions.ts

export type UserWithProfile = {
  userId: string
  email: string
  fullName: string | null
  role: 'admin' | 'staff' | 'client'
  status: 'active' | 'inactive'
  lastLogin: string | null
  invitedAt: string | null
  invitedBy: string | null
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<
  ActionResult<UserWithProfile[]>
> {
  try {
    const { profile } = await getSessionWithProfile()
    if (profile?.role !== 'admin') {
      return { success: false, error: 'Only admins can view all users' }
    }

    const supabase = supabaseAdmin()

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        user_id,
        full_name,
        role,
        status,
        last_login,
        invited_at,
        invited_by
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getAllUsers error:', error)
      return { success: false, error: 'Failed to fetch users' }
    }

    // Get emails from auth.users
    const userIds = profiles.map(p => p.user_id)
    const { data: authUsers } = await supabase.auth.admin.listUsers()

    const usersMap = new Map(
      authUsers.users.map(u => [u.id, u.email])
    )

    const users: UserWithProfile[] = profiles.map(p => ({
      userId: p.user_id,
      email: usersMap.get(p.user_id) || '',
      fullName: p.full_name,
      role: p.role,
      status: p.status as 'active' | 'inactive',
      lastLogin: p.last_login,
      invitedAt: p.invited_at,
      invitedBy: p.invited_by,
    }))

    return { success: true, data: users }
  } catch (error) {
    console.error('getAllUsers error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/data/auth-actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/data/actions.ts tests/lib/data/auth-actions.test.ts
git commit -m "feat: add getAllUsers server action"
```

---

## Task 6-11: Remaining Server Actions

**Note:** Follow the same TDD pattern (test → fail → implement → pass → commit) for each action:

- Task 6: `updateUserRole(userId, newRole)`
- Task 7: `deactivateUser(userId)` and `reactivateUser(userId)`
- Task 8: `adminResetPassword(userId)`
- Task 9: `requestPasswordReset(email)`
- Task 10: `resetPassword(token, newPassword)`
- Task 11: `changePassword(currentPassword, newPassword)`

Each action should:
1. Verify admin permission (except self-service actions)
2. Validate inputs
3. Update database
4. Send email if applicable
5. Log to audit_logs
6. Return ActionResult

---

## Task 12: Middleware Updates

**Files:**
- Modify: `src/middleware.ts`

**Step 1: Update middleware to check password_must_change**

```typescript
// Add to src/middleware.ts after session check

if (isProtected && hasSessionCookie) {
  // Get user profile to check status and password requirements
  const { profile } = await getSessionWithProfile()

  if (profile) {
    // Check if user is inactive
    if (profile.status === 'inactive') {
      if (pathname !== '/auth/inactive') {
        const url = req.nextUrl.clone()
        url.pathname = '/auth/inactive'
        return NextResponse.redirect(url)
      }
    }

    // Check if password must be changed
    if (profile.password_must_change) {
      // Allow only change-password and sign-out routes
      if (pathname !== '/auth/change-password' && pathname !== '/auth/sign-out') {
        const url = req.nextUrl.clone()
        url.pathname = '/auth/change-password'
        return NextResponse.redirect(url)
      }
    }
  }
}
```

**Step 2: Test middleware behavior**

Manual test: Set `password_must_change: true` on a user, verify redirect

**Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add middleware checks for inactive users and password changes"
```

---

## Task 13-20: UI Components and Pages

Follow the pattern:
1. Create component/page file
2. Add to appropriate route
3. Test manually in browser
4. Commit

Components:
- Task 13: RoleBadge, StatusBadge, PasswordStrengthIndicator
- Task 14: InviteUserModal
- Task 15: UserTable

Pages:
- Task 16: /admin/users
- Task 17: /auth/forgot-password
- Task 18: /auth/reset-password
- Task 19: /auth/change-password
- Task 20: /auth/inactive

---

## Task 21: Integration Testing

**Files:**
- Create: `tests/integration/auth-flow.test.tsx`

Test complete flows:
1. Admin invites user
2. User signs in with temp password
3. User forced to change password
4. User resets forgotten password
5. Admin deactivates user
6. Inactive user cannot sign in

---

## Task 22: Documentation

**Files:**
- Create: `docs/features/authentication.md`

Document:
- How to invite users
- Password requirements
- User management
- Troubleshooting common issues

**Final Commit:**

```bash
git add docs/features/authentication.md
git commit -m "docs: add authentication system documentation"
```

---

## Success Criteria

- [ ] Admin can invite users via /admin/users
- [ ] Invited users receive email with temporary password
- [ ] First login forces password change
- [ ] Users can reset forgotten passwords
- [ ] Admin can change user roles
- [ ] Admin can deactivate/reactivate users
- [ ] Inactive users cannot access system
- [ ] All password requirements enforced
- [ ] All auth events logged to audit_logs
- [ ] Email templates render correctly
- [ ] Tests pass

