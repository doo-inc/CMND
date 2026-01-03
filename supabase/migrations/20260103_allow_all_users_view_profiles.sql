-- Allow all authenticated users to view all profiles
-- This is needed for assignee dropdowns and user selection across the platform

-- First, drop the restrictive policy that only lets users see their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that allows all authenticated users to view all profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: The admin policy can stay, but this new policy covers everyone
-- Keep the update policies as they are (users can only update their own profile, admins can update any)

