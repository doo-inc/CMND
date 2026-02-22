
-- Fix 1: Make customer-avatars bucket private
UPDATE storage.buckets SET public = false WHERE id = 'customer-avatars';

-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Public read access for customer avatars" ON storage.objects;

-- Create authenticated-only SELECT policy
CREATE POLICY "Authenticated users can view customer avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'customer-avatars');

-- Fix 2: Add search_path to SECURITY DEFINER functions (using pg_catalog for gen_random_bytes)
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog', 'extensions'
AS $$
  SELECT translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_');
$$;

CREATE OR REPLACE FUNCTION public.get_valid_invitation(token_param TEXT)
RETURNS TABLE(id UUID, email TEXT, role public.app_role, invited_by UUID, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT i.id, i.email, i.role, i.invited_by, i.expires_at
  FROM public.invitations i
  WHERE i.token = token_param AND i.expires_at > now() AND i.accepted_at IS NULL;
$$;
