-- Fix RLS policy for activity_logs table - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON public.activity_logs;

-- Create proper RLS policies for activity_logs (restrict to authenticated users)
CREATE POLICY "Authenticated users can view activity logs" 
  ON public.activity_logs 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create activity logs" 
  ON public.activity_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix RLS policy for invitations table - restrict token visibility
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view their own pending invitations" ON public.invitations;
DROP POLICY IF EXISTS "Invitees can view invitations sent to them" ON public.invitations;

-- Create proper RLS policies for invitations
-- Admins can see all invitations
CREATE POLICY "Admins can view all invitations" 
  ON public.invitations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Users can only see invitations they sent (their own pending invitations)
CREATE POLICY "Users can view invitations they sent" 
  ON public.invitations 
  FOR SELECT 
  USING (invited_by = auth.uid());

-- Invitees can only see invitations addressed to their email (for accepting)
CREATE POLICY "Invitees can view invitations sent to them by email" 
  ON public.invitations 
  FOR SELECT 
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );