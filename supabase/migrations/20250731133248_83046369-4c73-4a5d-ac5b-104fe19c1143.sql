-- Fix security issues by setting search_path for the new functions
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.invitations 
  WHERE expires_at < now() AND accepted_at IS NULL;
  
  -- Log the cleanup for debugging
  RAISE NOTICE 'Cleaned up expired invitations';
END;
$$;

CREATE OR REPLACE FUNCTION auto_cleanup_before_invitation_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Clean up expired invitations before any new invitation operations
  DELETE FROM public.invitations 
  WHERE expires_at < now() AND accepted_at IS NULL;
  
  RETURN NEW;
END;
$$;