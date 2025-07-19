-- Fix the generate_invitation_token function to use valid PostgreSQL encoding
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT encode(gen_random_bytes(32), 'base64');
$function$;