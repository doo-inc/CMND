-- Update the token generation function to use URL-safe Base64
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_');
$function$;