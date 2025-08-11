-- Fix the documents RLS policy to allow authenticated users to insert documents
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- Create better RLS policies for storage.objects for documents bucket
CREATE POLICY "Authenticated users can view documents in documents bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload to documents bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update in documents bucket" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete from documents bucket" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Fix the documents table RLS policy to allow authenticated users to insert
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON documents;

CREATE POLICY "Authenticated users can insert documents" 
ON documents 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');