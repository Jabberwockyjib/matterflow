-- Fix circular dependency in RLS policies
-- The current_user_role() function was causing infinite recursion because
-- it tries to SELECT from profiles, which has RLS policies that call current_user_role()

-- Recreate with SECURITY DEFINER to bypass RLS
-- This allows the function to read from profiles without triggering RLS policies
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER -- This is the key fix - bypasses RLS
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon;
