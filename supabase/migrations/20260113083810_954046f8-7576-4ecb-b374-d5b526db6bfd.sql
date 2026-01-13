-- Make customer-documents bucket private to prevent public access
UPDATE storage.buckets 
SET public = false 
WHERE id = 'customer-documents';