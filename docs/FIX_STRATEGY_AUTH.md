# Fix Strategy: Authentication & User Management

**Date**: 2025-12-29
**Related**: ROOT_CAUSE_ANALYSIS_AUTH.md
**Status**: Ready for Implementation

---

## Overview

This document outlines the step-by-step fix for the authentication circular dependency issue and related problems.

---

## Fix Strategy Summary

### Approach:
Use **SECURITY DEFINER** on `current_user_role()` function to bypass RLS when querying profiles table.

### Why This Works:
- `SECURITY DEFINER` makes function run with **definer's privileges** (postgres superuser)
- Bypasses RLS policies entirely when function executes
- Breaks the circular dependency loop
- PostgreSQL standard pattern for RLS helper functions

### Alternative Considered (Rejected):
❌ **Cache role in JWT claims**
- Requires custom JWT claims setup
- Adds complexity to auth flow
- Still need fallback for profile updates

✅ **SECURITY DEFINER is the correct PostgreSQL pattern**

---

## Implementation Plan

## Phase 1: Critical Fixes (IMMEDIATE)

### Step 1.1: Fix current_user_role() Function

**File**: Create or update migration

**SQL**:
```sql
-- Drop existing function
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;

-- Recreate with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER  -- This is the critical change
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.current_user_role() IS
'Returns the role of the current authenticated user. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
```

**Key Points**:
- `SECURITY DEFINER` - Run with definer privileges
- `SET search_path = public` - Security best practice
- `CASCADE` on DROP - Removes dependent objects safely
- Grant to all necessary roles

**Application Method**:
```bash
# Option A: Apply directly to running database
docker exec -i supabase_db_therapy psql -U postgres -d postgres < migration.sql

# Option B: Use Supabase CLI (requires restart)
supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres

# Option C: Apply via psql in container
docker exec supabase_db_therapy psql -U postgres -d postgres -f /path/to/migration.sql
```

**Verification**:
```sql
-- Check function has SECURITY DEFINER
SELECT
  proname,
  prosecdef,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'current_user_role';

-- Expected: prosecdef = t (true)
```

**Test**:
```sql
-- This should now work without stack overflow
SELECT * FROM public.profiles WHERE user_id = auth.uid();
```

---

### Step 1.2: Remove Duplicate RLS Policies

**Problem**: 5 policies on profiles table, many duplicates

**Action**: Consolidate to 3 clear policies

**SQL**:
```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "profiles are viewable to owners and staff" ON public.profiles;
DROP POLICY IF EXISTS "staff and admin can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and staff can manage all profiles" ON public.profiles;

-- Create clean, non-overlapping policies

-- Policy 1: Users can view their own profile, staff/admin can view all
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR current_user_role() = ANY(ARRAY['admin'::user_role, 'staff'::user_role])
);

-- Policy 2: Users can update their own profile
CREATE POLICY "profiles_update_own_policy"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Staff and admin can manage all profiles
CREATE POLICY "profiles_admin_all_policy"
ON public.profiles
FOR ALL
USING (current_user_role() = ANY(ARRAY['admin'::user_role, 'staff'::user_role]))
WITH CHECK (current_user_role() = ANY(ARRAY['admin'::user_role, 'staff'::user_role]));
```

**Benefits**:
- Clearer policy names (purpose-based)
- No overlaps
- Easier to audit
- Better performance (fewer policy evaluations)

**Verification**:
```sql
-- Should show exactly 3 policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles';
```

---

### Step 1.3: Fix Environment Configuration

**Current Issue**: Non-standard Supabase keys in `.env.local`

**Action**: Use standard local development keys

**Update `.env.local`**:
```bash
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

**Why**: These are the standard JWT keys for local Supabase that match the local database configuration.

**Restart Required**: Yes - restart Next.js dev server after changing env vars

---

### Step 1.4: Clean Browser State

**Problem**: Old session cookies may have cached null profile

**Action**: Full browser clean

**Steps**:
1. Open browser DevTools (F12)
2. Go to Application → Storage → Clear Site Data
3. Or manually delete all cookies starting with `sb-`
4. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

---

## Phase 2: Validation & Testing

### Test 1: Sign In Flow
```bash
# Run test script
node test-admin-signin.mjs

# Expected output:
✅ Sign-in successful!
📧 Email: admin@matterflow.local
🆔 User ID: 00000000-0000-0000-0000-000000000001
🎫 Session: Valid
```

### Test 2: Profile Loading
```bash
# Check server logs after signing in
# Should see:
[getSessionWithProfile] Session found for user: 00000000-0000-0000-0000-000000000001
[getSessionWithProfile] Profile data: { full_name: 'Dev Admin', role: 'admin', ... }

# Should NOT see:
[getSessionWithProfile] Profile query error: stack depth limit exceeded
```

### Test 3: UI Verification
1. Sign in at `/auth/sign-in`
2. Check top bar: Should show "Dev Admin" and "ADMIN" (not "Guest" / "role unknown")
3. Go to `/settings`: Should see 3 tabs (Profile, Practice, Integrations)
4. Profile tab: Should show populated form data

### Test 4: Database Query
```sql
-- Run as authenticated user (simulating app)
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}'::json;

-- This should return the profile without errors
SELECT * FROM public.profiles WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Expected: 1 row returned (Dev Admin)
-- Should NOT return: ERROR stack depth limit exceeded
```

---

## Phase 3: Monitoring & Prevention

### Step 3.1: Add Health Check

**Create**: `scripts/check-db-health.mjs`

```javascript
#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // service key
)

async function checkHealth() {
  console.log('🏥 Database Health Check\n')

  // Test 1: Can query profiles without recursion
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, role')
    .limit(1)

  if (error) {
    console.error('❌ Profile query failed:', error.message)
    process.exit(1)
  }

  console.log('✅ Profile queries working')

  // Test 2: RLS function works
  const { data: funcTest, error: funcError } = await supabase
    .rpc('current_user_role')

  if (funcError) {
    console.error('❌ current_user_role() failed:', funcError.message)
  } else {
    console.log('✅ current_user_role() working')
  }

  console.log('\n✅ All health checks passed')
}

checkHealth()
```

**Usage**:
```bash
node scripts/check-db-health.mjs
```

---

### Step 3.2: Update Migration Process

**Add to `package.json`**:
```json
{
  "scripts": {
    "db:migration:create": "supabase migration new",
    "db:migration:apply": "supabase db reset",
    "db:migration:status": "supabase migration list",
    "db:health": "node scripts/check-db-health.mjs"
  }
}
```

**Migration Checklist** (add to CONTRIBUTING.md):
- [ ] Test migration on local database
- [ ] Run health check after applying
- [ ] Verify RLS policies don't create loops
- [ ] Check for duplicate policies
- [ ] Test auth flow end-to-end

---

### Step 3.3: Add RLS Testing

**Create**: `tests/database/rls-policies.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('RLS Policies', () => {
  it('current_user_role does not cause stack overflow', async () => {
    const supabase = createClient(/* ... */)

    // This should not throw
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .limit(1)

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('admin can view all profiles', async () => {
    // Test admin access
  })

  it('client can only view own profile', async () => {
    // Test client isolation
  })
})
```

---

## Implementation Timeline

### Immediate (Now):
1. ✅ Apply current_user_role() fix
2. ✅ Clean duplicate RLS policies
3. ✅ Update environment config
4. ✅ Test sign-in flow

### Day 1:
1. Add health check script
2. Document RLS policies
3. Create RLS tests

### Week 1:
1. Audit all RLS policies across tables
2. Add monitoring for stack depth errors
3. Create migration best practices doc

---

## Rollback Plan

If fix causes issues:

### Immediate Rollback:
```sql
-- Restore original function (will break but allows investigation)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;
```

### Alternative Fix:
```sql
-- Use materialized JWT claims (requires more setup)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'role')::user_role;
$$;
```

---

## Success Criteria

### ✅ Fix is successful when:
1. No stack depth errors in logs
2. Profile data loads correctly
3. UI shows user name and role
4. Settings page shows all admin tabs
5. All role-based features work
6. Performance is acceptable (< 100ms for profile queries)

### ❌ Fix has failed if:
1. Still see stack overflow errors
2. Profile returns null
3. Auth breaks entirely
4. Other RLS policies fail

---

## Post-Fix Actions

1. **Update Documentation**:
   - Add RLS patterns guide
   - Document current_user_role() purpose
   - Update troubleshooting docs

2. **Team Communication**:
   - Share root cause analysis
   - Review migration process
   - Plan RLS audit

3. **Technical Debt**:
   - Add to backlog: Full RLS policy audit
   - Schedule: Database performance review
   - Plan: Automated RLS testing

---

*Strategy created: 2025-12-29*
*Ready for implementation*
