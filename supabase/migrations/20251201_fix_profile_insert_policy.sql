-- Add INSERT policy for profiles to allow users to create their own profile
-- This is a fallback in case the trigger doesn't fire or fails

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also allow service role to insert profiles (for edge functions)
CREATE POLICY "Service role can manage profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

