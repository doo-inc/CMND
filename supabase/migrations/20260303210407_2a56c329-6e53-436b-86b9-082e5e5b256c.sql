-- Fix user_id tampering: Add trigger to enforce auth.uid() on project_messages inserts
CREATE OR REPLACE FUNCTION public.set_message_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER enforce_message_user_id
  BEFORE INSERT ON public.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_message_user_id();