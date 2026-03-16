-- ================================================================
-- Batelco Comprehensive Read-Only & Scope Enforcement
--
-- Covers every table that a Batelco user could mutate that they
-- should not, based on the security audit of 2026-03-16.
--
-- Batelco users (role = 'batelco') may:
--   • SELECT customers, contracts (own), documents, lifecycle_stages,
--     tasks, project_manager, notifications (own)
--   • INSERT new customers (must be tagged partner_label = 'batelco')
--
-- Batelco users must NOT mutate any other table.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. customers — enforce that Batelco inserts are always tagged
--    with partner_label = 'batelco' so they are properly scoped.
--    (UPDATE is already blocked; this closes the INSERT loophole.)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Batelco customers must be tagged batelco" ON customers;
CREATE POLICY "Batelco customers must be tagged batelco"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Non-Batelco users: unrestricted insert
    NOT has_role(auth.uid(), 'batelco')
    -- Batelco users: must tag the row partner_label = 'batelco'
    OR LOWER(COALESCE(partner_label::text, '')) = 'batelco'
  );

-- ----------------------------------------------------------------
-- 2. customer_team_members — currently FOR ALL USING (true).
--    Block Batelco from all writes; keep SELECT open.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage customer team members" ON customer_team_members;

DROP POLICY IF EXISTS "Authenticated users can view customer team members" ON customer_team_members;
CREATE POLICY "Authenticated users can view customer team members"
  ON customer_team_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Non-Batelco users can insert customer team members" ON customer_team_members;
CREATE POLICY "Non-Batelco users can insert customer team members"
  ON customer_team_members FOR INSERT
  TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Non-Batelco users can update customer team members" ON customer_team_members;
CREATE POLICY "Non-Batelco users can update customer team members"
  ON customer_team_members FOR UPDATE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Non-Batelco users can delete customer team members" ON customer_team_members;
CREATE POLICY "Non-Batelco users can delete customer team members"
  ON customer_team_members FOR DELETE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 3. tasks — any authenticated user can currently INSERT.
--    Block Batelco from creating / updating / deleting tasks.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Batelco users cannot create tasks" ON tasks;
CREATE POLICY "Batelco users cannot create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot update tasks" ON tasks;
CREATE POLICY "Batelco users cannot update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot delete tasks" ON tasks;
CREATE POLICY "Batelco users cannot delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 4. customer_timeline — permissive INSERT/SELECT.
--    Batelco must not add timeline events.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Batelco users cannot insert customer timeline" ON customer_timeline;
CREATE POLICY "Batelco users cannot insert customer timeline"
  ON customer_timeline FOR INSERT
  TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot update customer timeline" ON customer_timeline;
CREATE POLICY "Batelco users cannot update customer timeline"
  ON customer_timeline FOR UPDATE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot delete customer timeline" ON customer_timeline;
CREATE POLICY "Batelco users cannot delete customer timeline"
  ON customer_timeline FOR DELETE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 5. customer_feedback — permissive INSERT.
--    Batelco must not create feedback records.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Batelco users cannot insert customer feedback" ON customer_feedback;
CREATE POLICY "Batelco users cannot insert customer feedback"
  ON customer_feedback FOR INSERT
  TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot update customer feedback" ON customer_feedback;
CREATE POLICY "Batelco users cannot update customer feedback"
  ON customer_feedback FOR UPDATE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot delete customer feedback" ON customer_feedback;
CREATE POLICY "Batelco users cannot delete customer feedback"
  ON customer_feedback FOR DELETE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 6. renewal_activities — FOR ALL USING (true).
--    Batelco must not create or modify renewal activities.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Batelco users cannot insert renewal activities" ON renewal_activities;
CREATE POLICY "Batelco users cannot insert renewal activities"
  ON renewal_activities FOR INSERT
  TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot update renewal activities" ON renewal_activities;
CREATE POLICY "Batelco users cannot update renewal activities"
  ON renewal_activities FOR UPDATE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot delete renewal activities" ON renewal_activities;
CREATE POLICY "Batelco users cannot delete renewal activities"
  ON renewal_activities FOR DELETE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 7. referrals — FOR ALL USING (true).
--    Batelco must not create or modify referrals.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Batelco users cannot insert referrals" ON referrals;
CREATE POLICY "Batelco users cannot insert referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot update referrals" ON referrals;
CREATE POLICY "Batelco users cannot update referrals"
  ON referrals FOR UPDATE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot delete referrals" ON referrals;
CREATE POLICY "Batelco users cannot delete referrals"
  ON referrals FOR DELETE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 8. notifications — Batelco should not inject notifications for
--    other users or modify existing ones.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Batelco users cannot insert notifications" ON notifications;
CREATE POLICY "Batelco users cannot insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot update notifications" ON notifications;
CREATE POLICY "Batelco users cannot update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 9. storage.objects — customer-documents bucket
--    Currently open to all authenticated users.
--    Batelco must not upload, update, or delete customer documents.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to upload customer documents" ON storage.objects;
CREATE POLICY "Non-Batelco users can upload customer documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'customer-documents' AND NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Allow authenticated users to update customer documents" ON storage.objects;
CREATE POLICY "Non-Batelco users can update customer documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'customer-documents' AND NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Allow authenticated users to delete customer documents" ON storage.objects;
CREATE POLICY "Non-Batelco users can delete customer documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'customer-documents' AND NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 10. storage.objects — invoices bucket
--     Batelco must not upload, update, or delete invoices.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload invoices" ON storage.objects;
CREATE POLICY "Non-Batelco users can upload invoices"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Authenticated users can update invoices" ON storage.objects;
CREATE POLICY "Non-Batelco users can update invoices"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'invoices' AND NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON storage.objects;
CREATE POLICY "Non-Batelco users can delete invoices"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'invoices' AND NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 11. partnerships & related tables — open to all authenticated.
--     Batelco users have no business relationship with these records.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Batelco users cannot manage partnerships" ON partnerships;
CREATE POLICY "Batelco users cannot manage partnerships"
  ON partnerships FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'))
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot manage partnership contacts" ON partnership_contacts;
CREATE POLICY "Batelco users cannot manage partnership contacts"
  ON partnership_contacts FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'))
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot manage partnership documents" ON partnership_documents;
CREATE POLICY "Batelco users cannot manage partnership documents"
  ON partnership_documents FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'))
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot manage partnership timeline" ON partnership_timeline;
CREATE POLICY "Batelco users cannot manage partnership timeline"
  ON partnership_timeline FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'))
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));
