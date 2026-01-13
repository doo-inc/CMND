-- Fix overly permissive RLS policies on invitations table
-- Drop existing policies that are too permissive
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users can update invitations" ON public.invitations;

-- Create restricted policy: Only admins can view all invitations
CREATE POLICY "Admins can view all invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create policy: Users can view their own pending invitation (for acceptance flow)
CREATE POLICY "Users can view their own pending invitation"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND accepted_at IS NULL);

-- Create policy: Only the invitation recipient can accept (update) their invitation
CREATE POLICY "Invitees can accept their own invitation"
  ON public.invitations
  FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND accepted_at IS NULL)
  WITH CHECK (accepted_at IS NOT NULL);