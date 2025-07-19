
-- Create enum for notification types
CREATE TYPE notification_type AS ENUM ('lifecycle', 'customer', 'deadline', 'contract', 'team');

-- Create user notification settings table
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, notification_type)
);

-- Enable RLS on user notification settings
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification settings
CREATE POLICY "Users can view their own notification settings"
  ON public.user_notification_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON public.user_notification_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON public.user_notification_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at on user_notification_settings
CREATE TRIGGER update_user_notification_settings_modtime
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- Create function to get or create default notification settings for a user
CREATE OR REPLACE FUNCTION public.get_user_notification_settings(user_id_param UUID)
RETURNS TABLE(
  notification_type notification_type,
  email_enabled BOOLEAN,
  in_app_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert default settings if they don't exist
  INSERT INTO public.user_notification_settings (user_id, notification_type, email_enabled, in_app_enabled)
  SELECT 
    user_id_param,
    unnest(ARRAY['lifecycle'::notification_type, 'customer'::notification_type, 'deadline'::notification_type, 'contract'::notification_type, 'team'::notification_type]),
    true,
    true
  ON CONFLICT (user_id, notification_type) DO NOTHING;
  
  -- Return current settings
  RETURN QUERY
  SELECT 
    uns.notification_type,
    uns.email_enabled,
    uns.in_app_enabled
  FROM public.user_notification_settings uns
  WHERE uns.user_id = user_id_param
  ORDER BY uns.notification_type;
END;
$$;
