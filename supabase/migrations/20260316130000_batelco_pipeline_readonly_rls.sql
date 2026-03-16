-- ============================================================
-- Batelco Pipeline Read-Only Enforcement
-- Batelco users (role='batelco') may SELECT pipeline data
-- but must NOT be able to INSERT, UPDATE, or DELETE
-- lifecycle_stages or customer stage/status fields.
-- ============================================================

-- -------------------------------------------------------
-- 1. lifecycle_stages: replace the permissive FOR ALL
--    policy with explicit per-operation policies so that
--    Batelco users are restricted to SELECT only.
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage lifecycle stages" ON public.lifecycle_stages;

-- Any authenticated user may read lifecycle stages (pipeline view works for everyone)
DROP POLICY IF EXISTS "Authenticated users can view lifecycle stages" ON public.lifecycle_stages;
CREATE POLICY "Authenticated users can view lifecycle stages"
  ON public.lifecycle_stages
  FOR SELECT
  TO authenticated
  USING (true);

-- Only non-Batelco authenticated users can insert lifecycle stages
CREATE POLICY "Non-Batelco users can insert lifecycle stages"
  ON public.lifecycle_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

-- Only non-Batelco authenticated users can update lifecycle stages
CREATE POLICY "Non-Batelco users can update lifecycle stages"
  ON public.lifecycle_stages
  FOR UPDATE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

-- Only non-Batelco authenticated users can delete lifecycle stages
CREATE POLICY "Non-Batelco users can delete lifecycle stages"
  ON public.lifecycle_stages
  FOR DELETE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

-- -------------------------------------------------------
-- 2. customers: confirm Batelco cannot UPDATE customer
--    records (stage/status fields used by pipeline sync).
--    The policy from 20260120182956 already restricts
--    UPDATE to admin/manager, so Batelco is already
--    blocked. This is a belt-and-suspenders explicit
--    denial to make the intent clear and survive any
--    future policy reordering.
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Batelco users cannot update customers" ON public.customers;
CREATE POLICY "Batelco users cannot update customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));
