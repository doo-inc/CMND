-- ================================================================
-- Batelco Contracts & Documents Read-Only Enforcement
--
-- Batelco users (role='batelco') may VIEW contracts and documents
-- relevant to their partnership but must NOT be able to create,
-- edit, or delete any contracts or documents.
--
-- The existing "Batelco users can view Batelco contracts" SELECT
-- policy (20260316000000) is intentionally preserved.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. CONTRACTS TABLE
--    Drop the write policies that were added in
--    20260316000000_batelco_contracts_rls.sql. The SELECT policy
--    is kept so Batelco can still view their contracts.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Batelco users can create Batelco contracts" ON contracts;
DROP POLICY IF EXISTS "Batelco users can update Batelco contracts" ON contracts;

-- Explicit belt-and-suspenders: reject any future Batelco write attempt
-- (guards against other permissive INSERT/UPDATE policies being added later)
DROP POLICY IF EXISTS "Batelco users cannot create contracts" ON contracts;
CREATE POLICY "Batelco users cannot create contracts"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot update contracts" ON contracts;
CREATE POLICY "Batelco users cannot update contracts"
  ON contracts FOR UPDATE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Batelco users cannot delete contracts" ON contracts;
CREATE POLICY "Batelco users cannot delete contracts"
  ON contracts FOR DELETE
  TO authenticated
  USING (NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 2. DOCUMENTS TABLE (customer document metadata rows)
--    Current permissive policies (from 20250922174834) allow any
--    authenticated user to INSERT / UPDATE / DELETE.
--    Replace them with policies that exclude Batelco.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON documents;
CREATE POLICY "Non-Batelco users can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Authenticated users can update documents" ON documents;
CREATE POLICY "Non-Batelco users can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Authenticated users can delete documents" ON documents;
CREATE POLICY "Non-Batelco users can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'batelco'));

-- ----------------------------------------------------------------
-- 3. STORAGE — documents bucket (storage.objects)
--    Current permissive policies (from 20250811125005) allow any
--    authenticated user to upload / update / delete objects in the
--    documents bucket. Replace them with Batelco-excluding policies.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload to documents bucket" ON storage.objects;
CREATE POLICY "Non-Batelco users can upload to documents bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Authenticated users can update in documents bucket" ON storage.objects;
CREATE POLICY "Non-Batelco users can update in documents bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents' AND NOT has_role(auth.uid(), 'batelco'));

DROP POLICY IF EXISTS "Authenticated users can delete from documents bucket" ON storage.objects;
CREATE POLICY "Non-Batelco users can delete from documents bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND NOT has_role(auth.uid(), 'batelco'));

-- The view (SELECT) policy for storage is intentionally unchanged:
-- "Authenticated users can view documents in documents bucket" stays,
-- so Batelco users can still download files they have access to.
