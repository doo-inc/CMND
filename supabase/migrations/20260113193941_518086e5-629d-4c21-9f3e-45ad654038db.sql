-- Fix 1: Update get_user_notification_settings function to validate caller
-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_user_notification_settings(UUID);

-- Recreate with authorization check
CREATE OR REPLACE FUNCTION public.get_user_notification_settings(user_id_param UUID)
RETURNS TABLE(
  email_enabled BOOLEAN,
  in_app_enabled BOOLEAN,
  notification_type notification_type
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify caller is requesting their own settings
  IF user_id_param != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Can only view your own notification settings';
  END IF;

  -- Insert default settings if none exist for this user
  INSERT INTO user_notification_settings (user_id, notification_type, email_enabled, in_app_enabled)
  SELECT 
    user_id_param,
    nt,
    true,
    true
  FROM unnest(ARRAY['lifecycle', 'customer', 'deadline', 'contract', 'team']::notification_type[]) AS nt
  WHERE NOT EXISTS (
    SELECT 1 FROM user_notification_settings 
    WHERE user_id = user_id_param 
    AND notification_type = nt
  );
  
  -- Return all settings for this user
  RETURN QUERY
  SELECT 
    uns.email_enabled,
    uns.in_app_enabled,
    uns.notification_type
  FROM user_notification_settings uns
  WHERE uns.user_id = user_id_param;
END;
$$;

-- Fix 2: Secure partnership tables with role-based access
-- Drop existing permissive policies on partnerships
DROP POLICY IF EXISTS "Allow all operations on partnerships" ON partnerships;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON partnerships;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON partnerships;

-- Create new secure policies for partnerships
CREATE POLICY "Authenticated users can view partnerships"
  ON partnerships FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can manage partnerships"
  ON partnerships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Drop existing permissive policies on partnership_contacts
DROP POLICY IF EXISTS "Allow all operations on partnership_contacts" ON partnership_contacts;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON partnership_contacts;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON partnership_contacts;

-- Create new secure policies for partnership_contacts
CREATE POLICY "Authenticated users can view partnership contacts"
  ON partnership_contacts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can manage partnership contacts"
  ON partnership_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Drop existing permissive policies on partnership_documents
DROP POLICY IF EXISTS "Allow all operations on partnership_documents" ON partnership_documents;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON partnership_documents;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON partnership_documents;

-- Create new secure policies for partnership_documents
CREATE POLICY "Authenticated users can view partnership documents"
  ON partnership_documents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can manage partnership documents"
  ON partnership_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Drop existing permissive policies on partnership_timeline
DROP POLICY IF EXISTS "Allow all operations on partnership_timeline" ON partnership_timeline;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON partnership_timeline;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON partnership_timeline;

-- Create new secure policies for partnership_timeline
CREATE POLICY "Authenticated users can view partnership timeline"
  ON partnership_timeline FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can manage partnership timeline"
  ON partnership_timeline FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );