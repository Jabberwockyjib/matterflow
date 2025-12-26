# Authentication System Design

**Date:** 2025-12-25
**Status:** Approved
**Author:** Claude (with Brian)

## Overview

Complete authentication system for MatterFlow™ with admin-controlled user management, secure password handling, and role-based access control.

## Design Decisions

### User Account Creation
- **Admin-only invitation model**
- Only admins can create/invite new users
- Most secure approach for legal practice management
- Maintains full control over system access

### Invitation Flow
- **Temporary password approach**
- Admin creates account with generated temporary password
- User receives email with credentials
- Must change password on first login
- Simple, works immediately

### Password Reset
- **Self-service password reset**
- Standard forgot password flow
- Email with reset link (1-hour expiry)
- Reduces admin burden
- Supabase handles token management

### Email Verification
- **No email verification required**
- Admin controls all invitations with real emails
- Simpler flow, less friction
- Safe since admin validates email addresses

### Session Management
- **7-day default, 30-day with "Remember me"**
- Good balance of security and convenience
- "Remember me" checkbox extends session
- Industry standard for web applications

### Password Requirements
- **Moderate security**
- Minimum 8 characters
- Must contain: uppercase, lowercase, number
- Standard for business applications
- Balance of security and usability

### User Management
- **Full lifecycle management**
- Create/invite users
- View all users with role/status
- Deactivate/reactivate accounts
- Reset passwords manually
- Change user roles
- View last login activity

## Architecture

### Core Components

1. **Admin User Management Page** (`/admin/users`)
   - User table with filters
   - Invite user modal
   - Role and status management
   - Activity tracking

2. **Invitation System**
   - Server action: `inviteUser(email, role, fullName)`
   - Generates secure temporary password
   - Creates user in Supabase Auth
   - Sends credentials via email
   - Logs to audit trail

3. **Password Management**
   - Force password change on first login
   - Self-service reset flow
   - Admin manual reset capability
   - Password strength requirements

4. **Session Management**
   - Supabase automatic session handling
   - Middleware session refresh
   - 7-day default / 30-day with remember me
   - Inactive user blocking

## User Flows

### Admin Invites User

1. Admin navigates to `/admin/users`
2. Clicks "Invite User" button
3. Modal form appears:
   - Email (required, validated)
   - Full Name (required)
   - Role dropdown (admin/staff/client)
4. Admin submits form
5. Server action `inviteUser()`:
   - Validates admin permission
   - Checks email not already registered
   - Generates temporary password (crypto.randomBytes, 12 chars)
   - Creates Supabase auth user
   - Creates profile with `password_must_change: true`
   - Sends invitation email via Resend
   - Logs to audit_logs
   - Returns success/error
6. User receives invitation email

### First Login Experience

1. User receives invitation email with temporary password
2. Navigates to `/auth/sign-in`
3. Signs in with email and temporary password
4. Middleware detects `password_must_change: true`
5. Redirects to `/auth/change-password`
6. User cannot access app until password changed
7. User sets new password (must meet requirements)
8. Server validates and updates:
   - Password updated in Supabase
   - `password_must_change: false`
   - `last_login: now()`
9. Redirects to dashboard
10. User can now access full application

### Password Reset Flow

1. User clicks "Forgot password?" on sign-in page
2. Navigates to `/auth/forgot-password`
3. Enters email address
4. Server action `requestPasswordReset(email)`:
   - Always returns success (prevents enumeration)
   - If email exists:
     - Calls `supabase.auth.resetPasswordForEmail()`
     - Supabase sends email with reset link
     - Link: `/auth/reset-password?token=xxx`
     - Token expires in 1 hour
   - Logs attempt to audit_logs
5. User sees "Check your email" message
6. User clicks reset link in email
7. Navigates to `/auth/reset-password?token=xxx`
8. Page validates token:
   - If valid: shows new password form
   - If invalid/expired: shows error + "Request new link"
9. User enters new password (with strength indicator)
10. Server action `resetPassword(token, newPassword)`:
    - Validates token with Supabase
    - Validates password requirements
    - Updates password
    - Clears `password_must_change` if set
    - Updates `last_login`
    - Logs to audit_logs
11. Redirects to sign-in with success message

### Admin Manages Users

1. Admin navigates to `/admin/users`
2. Views user table:
   - Name, Email, Role, Status, Last Login
   - Search and filter controls
   - Actions dropdown per user
3. Admin can:
   - **Change Role:** Opens modal, updates `profile.role`, logs change
   - **Reset Password:** Generates new temp password, emails user, sets `password_must_change: true`
   - **Deactivate User:** Sets `status: 'inactive'`, revokes sessions, logs action
   - **Reactivate User:** Sets `status: 'active'`, logs action

## Database Schema

### Profile Table Changes

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'inactive'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
```

### Audit Log Events

New event types to track:
- `user.invited`
- `user.first_login`
- `user.password_changed`
- `user.password_reset_requested`
- `user.password_reset_completed`
- `user.role_changed`
- `user.deactivated`
- `user.reactivated`
- `auth.failed_login`

## Security

### Middleware Checks

```typescript
1. Check if user is authenticated (existing)
2. If authenticated:
   - Check if profile.status === 'inactive'
     → redirect to /auth/inactive
   - Check if password_must_change === true
     → redirect to /auth/change-password
     → Allow only /auth/change-password and /auth/sign-out routes
3. Continue to route
```

### RLS Policies

```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id OR current_user_role() = 'admin');

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (current_user_role() = 'admin');
```

### Password Security

- **Temporary passwords:** 12 characters, cryptographically random
- **Requirements enforced server-side:**
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- **Rate limiting:** Supabase handles automatically
- **All auth actions logged** to audit_logs
- **Failed logins tracked** (future: account lockout after 5 failures)

### Session Security

- Supabase automatic session management
- Middleware refreshes sessions on each request
- Inactive users cannot access protected routes
- Deactivation revokes all active sessions

## Email Templates

### Invitation Email

```
Subject: Welcome to MatterFlow™

Hi [Full Name],

You've been invited to join MatterFlow™ as a [role].

Your login credentials:
Email: [email]
Temporary Password: [password]

Sign in at: [APP_URL]/auth/sign-in

You'll be required to change your password on first login.

---
MatterFlow™ - Control Center
```

### Password Reset Email

```
Subject: Reset your MatterFlow™ password

Hi,

We received a request to reset your password.

Click here to reset: [RESET_LINK]

This link expires in 1 hour.

If you didn't request this, ignore this email.

---
MatterFlow™ - Control Center
```

### Admin Password Reset Email

```
Subject: Your MatterFlow™ password was reset

Hi [Full Name],

An administrator has reset your password.

Your new temporary password: [password]

Sign in at: [APP_URL]/auth/sign-in

You'll be required to change this password on your next login.

---
MatterFlow™ - Control Center
```

## Implementation Scope

### New Pages (5)

1. `/admin/users` - User management dashboard (admin only)
2. `/auth/forgot-password` - Request password reset
3. `/auth/reset-password` - Set new password with token
4. `/auth/change-password` - Force password change on first login
5. `/auth/inactive` - Message for deactivated users

### New Components (5)

1. `InviteUserModal` - Form to invite new users
2. `UserTable` - Table with filters and actions
3. `PasswordStrengthIndicator` - Visual password strength meter
4. `RoleBadge` - Colored role indicator
5. `StatusBadge` - Active/inactive indicator

### New Server Actions (9)

1. `inviteUser(email, role, fullName)` - Create and invite new user
2. `getAllUsers()` - Fetch all users with profiles
3. `updateUserRole(userId, newRole)` - Change user's role
4. `deactivateUser(userId)` - Deactivate user account
5. `reactivateUser(userId)` - Reactivate user account
6. `adminResetPassword(userId)` - Admin-initiated password reset
7. `requestPasswordReset(email)` - User-initiated reset request
8. `resetPassword(token, newPassword)` - Complete password reset
9. `changePassword(oldPassword, newPassword)` - Change current password

### New Email Templates (3)

1. User invitation email (with temporary password)
2. Password reset email (with reset link)
3. Admin password reset notification (with new temporary password)

### Database Migration

- Add 5 columns to profiles table
- Update RLS policies for admin access
- Add new audit log event types

### Middleware Updates

- Check `password_must_change` flag → redirect to change password
- Check `status` for inactive users → redirect to inactive page
- Allow only specific routes when password change required

## Complexity Assessment

| Component | Complexity | Notes |
|-----------|-----------|-------|
| Database Migration | Low | Simple column additions |
| Server Actions | Medium | 9 actions with validation and permissions |
| Pages | Medium | 5 new pages, mostly forms |
| Components | Low | Simple UI components |
| Email Templates | Low | Text-based templates via Resend |
| Security | Medium | Middleware logic, RLS policies |
| **Overall** | **Medium** | Well-scoped, leverages Supabase |

## Success Criteria

- ✅ Admin can invite users with email, role, and name
- ✅ Users receive invitation email with temporary password
- ✅ First login forces password change
- ✅ Users can reset forgotten passwords
- ✅ Admin can view all users with status and activity
- ✅ Admin can change user roles
- ✅ Admin can deactivate/reactivate users
- ✅ Admin can manually reset passwords
- ✅ Inactive users cannot access the system
- ✅ All auth events logged to audit trail
- ✅ Password requirements enforced
- ✅ Sessions managed securely

## Future Enhancements

- Account lockout after 5 failed login attempts
- Two-factor authentication (2FA)
- Login history and session management page
- Bulk user import from CSV
- User activity dashboard
- Password expiry (force change every 90 days)
- Security alerts for suspicious activity
