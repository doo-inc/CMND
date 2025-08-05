-- Fix storage bucket setup for customer documents
-- Create storage policies for the existing bucket
DROP POLICY IF EXISTS "Allow all operations on customer documents" ON storage.objects;

-- Create comprehensive storage policies for customer-documents bucket
CREATE POLICY "Allow authenticated users to upload customer documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'customer-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view customer documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'customer-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete customer documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'customer-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update customer documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'customer-documents' AND auth.role() = 'authenticated');