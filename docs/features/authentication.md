# Authentication System

Complete authentication system for MatterFlow™ with admin-controlled user management, secure password handling, and role-based access control.

## Overview

The authentication system provides:
- **Admin-only user invitation** with temporary passwords
- **Role-based access control** (Admin, Staff, Client)
- **Self-service password reset** via email magic links
- **Forced password changes** on first login
- **User account management** (activation, deactivation, role changes)
- **Complete audit trail** of all authentication events

## User Roles

### Admin
- Full system access
- Can invite and manage users
- Can change user roles
- Can reset passwords
- Can activate/deactivate accounts

### Staff
- Access to matter management
- Cannot manage users
- Cannot modify system settings

### Client
- View-only access to their own matters
- Cannot create or modify data
- Cannot access admin features

## Common Tasks

### Inviting a New User (Admin)

1. Navigate to **Admin → Users** (`/admin/users`)
2. Click **Invite User** button
3. Fill in the form:
   - Email address
   - Full name
   - Role (Admin/Staff/Client)
4. Click **Send Invitation**
5. User receives email with temporary password

**Result:** User account created with `password_must_change: true` flag.

### First Login Experience (New User)

1. User receives invitation email
2. User navigates to `/auth/sign-in`
3. User enters email and temporary password
4. System detects `password_must_change` flag
5. User automatically redirected to `/auth/change-password`
6. User cannot access other pages until password changed
7. User enters current (temp) password and new password
8. System validates new password meets requirements
9. User redirected to dashboard

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Resetting a Forgotten Password (Self-Service)

1. User clicks **Forgot password?** on sign-in page
2. User navigates to `/auth/forgot-password`
3. User enters email address
4. System sends password reset email (if account exists)
5. User receives email with magic link
6. User clicks link, navigates to `/auth/reset-password?token=xxx`
7. User enters new password
8. System verifies token and updates password
9. User redirected to sign-in page

**Security Note:** System always shows success message, even for non-existent emails (prevents email enumeration).

### Admin Password Reset

1. Admin navigates to **Admin → Users**
2. Admin finds user in table
3. Admin clicks **Actions** dropdown
4. Admin selects **Reset Password**
5. Confirmation dialog appears
6. System generates new temporary password
7. User receives email with new credentials
8. User must change password on next login

### Managing User Roles

1. Admin navigates to **Admin → Users**
2. Admin finds user in table
3. Admin clicks **Actions** dropdown
4. Admin selects desired role:
   - Change to Admin
   - Change to Staff
   - Change to Client
5. Role updated immediately
6. User's permissions change on next request

### Deactivating a User

1. Admin navigates to **Admin → Users**
2. Admin finds user in table
3. Admin clicks **Actions** dropdown
4. Admin selects **Deactivate**
5. User status set to 'inactive'
6. On next page navigation, user redirected to `/auth/inactive`
7. User sees "Account Deactivated" message
8. User can sign out but cannot access protected routes

### Reactivating a User

1. Admin navigates to **Admin → Users**
2. Admin finds deactivated user (gray badge)
3. Admin clicks **Actions** dropdown
4. Admin selects **Reactivate**
5. User status set to 'active'
6. User can sign in normally

## Technical Architecture

### Database Schema

**Profiles Table Columns:**
- `password_must_change` (boolean) - Forces password change on next login
- `status` ('active' | 'inactive') - Account activation status
- `last_login` (timestamptz) - Last successful sign-in
- `invited_by` (uuid) - Admin who invited the user
- `invited_at` (timestamptz) - Invitation timestamp

### Server Actions

All authentication operations use server actions:

- `inviteUser(email, fullName, role)` - Create and invite new user
- `getAllUsers()` - Fetch all users with profiles
- `updateUserRole(userId, newRole)` - Change user's role
- `deactivateUser(userId)` - Deactivate user account
- `reactivateUser(userId)` - Reactivate user account
- `adminResetPassword(userId)` - Admin-initiated password reset
- `requestPasswordReset(email)` - User-initiated reset request
- `resetPassword(token, newPassword)` - Complete password reset
- `changePassword(currentPassword, newPassword)` - Change current password

### Middleware Enforcement

The middleware (`src/middleware.ts`) enforces authentication rules:

1. **Inactive User Check:**
   - If `profile.status === 'inactive'`
   - Redirect to `/auth/inactive`
   - Block all protected routes

2. **Password Change Enforcement:**
   - If `profile.password_must_change === true`
   - Redirect to `/auth/change-password`
   - Allow only `/auth/change-password` and `/auth/sign-out`

3. **Role-Based Mutation Blocking:**
   - Client role cannot perform mutations (POST/PUT/PATCH/DELETE)
   - Returns 403 Forbidden

### Audit Logging

All authentication events are logged to `audit_logs` table:

- `user.invited` - User account created
- `user.password_changed` - User changed their password
- `user.password_reset_requested` - Password reset requested
- `user.password_reset_completed` - Password reset completed
- `user.password_reset_by_admin` - Admin reset user password
- `user.role_changed` - User role modified
- `user.deactivated` - User account deactivated
- `user.reactivated` - User account reactivated

## Troubleshooting

### User Cannot Sign In

**Check:**
1. Is the account active? (Status badge should be green)
2. Has the account been created? (Check `/admin/users`)
3. Is the password correct? (Try password reset)
4. Check browser console for errors

**Solution:** Admin can reset password or check account status.

### User Stuck on Password Change Page

**Issue:** User redirected to `/auth/change-password` after every sign-in.

**Cause:** `password_must_change` flag still set to `true`.

**Solution:**
1. User must complete password change flow
2. Enter valid current password
3. Enter new password meeting requirements
4. Ensure both passwords match

### Invitation Email Not Received

**Check:**
1. Email address spelled correctly?
2. Check spam/junk folder
3. Check server logs for email sending errors

**Solution:** Admin can reset password manually and provide credentials directly.

### Password Reset Link Expired

**Issue:** Token expires after 1 hour.

**Solution:** Request new password reset link at `/auth/forgot-password`.

### User Sees "Account Deactivated" Message

**Cause:** Admin deactivated the account.

**Solution:** Contact administrator to reactivate account.

## Security Features

### Password Security
- Temporary passwords: 12 characters, cryptographically random
- Password requirements enforced server-side
- Passwords hashed by Supabase Auth (bcrypt)
- No passwords stored in plain text

### Email Enumeration Prevention
- Password reset always returns success (even for non-existent emails)
- Prevents attackers from discovering valid email addresses
- Consistent response timing

### Audit Trail
- All authentication events logged
- Includes actor, timestamp, and metadata
- Immutable audit log for compliance

### Role-Based Access Control
- Middleware enforces permissions
- Client role blocked from mutations
- Admin-only operations verified server-side

## API Reference

### inviteUser

```typescript
inviteUser(data: {
  email: string
  fullName: string
  role: 'admin' | 'staff' | 'client'
}): Promise<ActionResult>
```

**Permissions:** Admin only

**Returns:** `{ success: true, data: { userId } }` or `{ success: false, error: string }`

### getAllUsers

```typescript
getAllUsers(): Promise<ActionResult<UserWithProfile[]>>
```

**Permissions:** Admin only

**Returns:** Array of users with profiles

### updateUserRole

```typescript
updateUserRole(
  userId: string,
  newRole: 'admin' | 'staff' | 'client'
): Promise<ActionResult>
```

**Permissions:** Admin only

### changePassword

```typescript
changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult>
```

**Permissions:** Authenticated users (any role)

**Validates:**
- Current password is correct
- New password meets requirements
- New password different from current

## Future Enhancements

Potential improvements for future iterations:

- Two-factor authentication (2FA)
- Login history and session management
- Bulk user import from CSV
- Password expiry (force change every 90 days)
- Account lockout after failed login attempts
- Security alerts for suspicious activity
- Custom email templates per organization
