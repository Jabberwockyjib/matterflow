# Root Cause Analysis: Authentication & User Management Issues

**Date**: 2025-12-29
**Severity**: Critical - Blocking all authenticated operations
**Status**: Identified, Fix Required

---

## Executive Summary

The authentication system has a **critical circular dependency** in Row Level Security (RLS) policies that causes infinite recursion, preventing profile data from loading and breaking user authentication flow.

---

## Issue Manifestation

### Symptoms Observed:
1. ✅ User can sign in (auth.users session created)
2. ❌ Profile data returns `null` (database query fails)
3. ❌ UI shows "Guest" instead of user name
4. ❌ Role shows "role unknown" instead of "ADMIN"
5. ❌ Settings page shows only "Profile" tab (admin tabs hidden)
6. ❌ Profile form has no data populated

### Error in Logs:
```
[getSessionWithProfile] Profile query error: {
  code: '54001',
  details: null,
  hint: 'Increase the configuration parameter "max_stack_depth"',
  message: 'stack depth limit exceeded'
}
```

---

## Root Cause Analysis

### 🔴 PRIMARY ISSUE: Circular Dependency in RLS

#### The Problem:
The `current_user_role()` function creates an infinite recursion loop with RLS policies.

#### How It Happens:

```
1. Application queries: SELECT * FROM profiles WHERE user_id = 'xxx'
   ↓
2. PostgreSQL RLS policy activates:
   POLICY "Users can view own profile"
   USING (auth.uid() = user_id OR current_user_role() IN ('admin', 'staff'))
   ↓
3. RLS calls: current_user_role()
   ↓
4. Function executes: SELECT role FROM profiles WHERE user_id = auth.uid()
   ↓
5. This triggers RLS AGAIN on the profiles table
   ↓
6. RLS calls current_user_role() AGAIN
   ↓
7. INFINITE LOOP → Stack depth exceeded
```

#### Current Function Definition (BROKEN):
```sql
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$
```

**Problem**: Missing `SECURITY DEFINER` - function inherits caller's RLS context.

#### What Happens:
- Function runs with RLS **enabled**
- When it queries `profiles` table, RLS policies fire
- Those policies call `current_user_role()` again
- **Infinite recursion** → Stack overflow

---

### 🟡 SECONDARY ISSUES

#### 1. **Duplicate/Conflicting RLS Policies**

The profiles table has **5 RLS policies**, some overlapping:

```sql
1. "profiles are viewable to owners and staff" (SELECT)
2. "staff and admin can manage profiles" (ALL)
3. "Users can view own profile" (SELECT)         ← DUPLICATE
4. "Users can update own profile" (UPDATE)
5. "Admins and staff can manage all profiles" (ALL)  ← DUPLICATE
```

**Issues**:
- Policies #1 and #3 are duplicates (SELECT for owners/staff)
- Policies #2 and #5 are duplicates (ALL for admin/staff)
- All 5 policies call `current_user_role()` which triggers recursion
- Performance impact: PostgreSQL evaluates multiple policies per query

#### 2. **Environment Configuration Mismatch**

The `.env.local` uses **non-standard Supabase keys**:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
```

**Expected local keys**:
```bash
# Standard Supabase local dev keys
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

**Impact**:
- May cause JWT verification issues
- Could explain authentication inconsistencies

#### 3. **Migration File Not Applied**

Created migration: `supabase/migrations/20251229000001_fix_recursive_rls.sql`

**Status**: File exists but **NOT applied** to database

**Evidence**:
```sql
-- Query shows function is still missing SECURITY DEFINER:
SELECT prosecdef FROM pg_proc WHERE proname = 'current_user_role';
-- Result: f (false) ← Should be t (true)
```

---

## Data Flow Analysis

### Sign-In Flow (What Works):

```
1. User submits credentials → /auth/sign-in page
2. supabase.auth.signInWithPassword() → Supabase Auth API
3. Auth validates password → SUCCESS
4. Creates session in auth.users table → SUCCESS
5. Returns JWT token → Cookie set: sb-*-auth-token
```

✅ **This part works** - verified via test script

### Profile Loading Flow (What Fails):

```
1. Layout.tsx calls getSessionWithProfile()
2. Server creates Supabase client with cookies
3. Calls supabase.auth.getSession() → Returns session ✅
4. Calls supabase.from('profiles').select()
   .eq('user_id', session.user.id)
   .maybeSingle()
5. PostgreSQL RLS evaluates policies
6. Policies call current_user_role()
7. current_user_role() queries profiles WITH RLS
8. INFINITE LOOP → Stack overflow ❌
9. Returns null profile to application
10. UI renders "Guest" / "role unknown"
```

❌ **This fails** at step 7

---

## Impact Assessment

### Features Broken:
- ✅ Sign-in works (auth.users session)
- ❌ Profile data not loaded
- ❌ Role-based authorization broken
- ❌ Admin features inaccessible
- ❌ Settings page incomplete
- ❌ User name not displayed
- ❌ All queries using current_user_role() fail

### Critical Business Impact:
- **Admin cannot manage system** (admin checks fail)
- **RBAC completely broken** (all role checks fail)
- **User experience severely degraded** (shows "Guest")

---

## Technical Debt Identified

1. **No RLS policy testing** - Circular dependencies not caught
2. **Duplicate policies** - Schema evolved without cleanup
3. **Migration not automated** - Manual apply required
4. **No database health checks** - Recursion issues silent until runtime
5. **Environment config scattered** - Keys in multiple files

---

## Affected Components

### Database:
- `public.profiles` table
- `current_user_role()` function
- All tables with RLS policies using `current_user_role()`

### Application Code:
- `src/lib/auth/server.ts` - getSessionWithProfile()
- `src/app/layout.tsx` - Profile display
- `src/components/top-bar.tsx` - User info display
- `src/components/sidebar.tsx` - Admin section visibility
- `src/app/settings/page.tsx` - Tab visibility
- All pages using `ensureStaffOrAdmin()` helper

---

## Next Steps

See: **FIX_STRATEGY_AUTH.md** (to be created)

**Priority 1 (Critical)**:
- Fix `current_user_role()` function with SECURITY DEFINER
- Remove duplicate RLS policies
- Test profile loading

**Priority 2 (High)**:
- Standardize environment configuration
- Create database health check
- Add RLS policy tests

**Priority 3 (Medium)**:
- Document all RLS policies
- Create migration checklist
- Add monitoring for stack depth errors

---

## Lessons Learned

1. **RLS functions must use SECURITY DEFINER** when querying the same table
2. **Test RLS policies in isolation** before deploying
3. **Limit policy complexity** - Simple checks perform better
4. **Audit for duplicate policies** during schema evolution
5. **Automate migration application** to avoid human error

---

*Analysis completed: 2025-12-29*
*Analyst: Claude Sonnet 4.5*
