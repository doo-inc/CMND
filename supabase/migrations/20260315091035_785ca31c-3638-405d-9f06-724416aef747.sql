
-- 1. Fix profiles_self_role_escalation: Add WITH CHECK to prevent role self-escalation
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));

-- 2. Fix activity_logs_all_users_visible: Remove overly permissive policies
DROP POLICY IF EXISTS "view_activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "insert_activity_logs" ON public.activity_logs;

-- 3. Fix notifications_cross_user_access: Scope to own notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
