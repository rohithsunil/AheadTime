-- Fix: infinite recursion in profiles RLS policy
-- The "Admins can read all profiles" policy was recursively querying
-- public.profiles inside a policy ON public.profiles, causing a loop.
-- Solution: use a SECURITY DEFINER function that bypasses RLS.

-- Step 1: Create a safe is_admin() helper that runs outside of RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Step 2: Drop the recursive policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

-- Step 3: Re-create it using the safe helper function (no recursion)
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());
