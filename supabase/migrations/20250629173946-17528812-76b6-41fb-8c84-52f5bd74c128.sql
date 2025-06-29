
-- Create a storage bucket for customer avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-avatars', 
  'customer-avatars', 
  true, 
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
);

-- Create storage policy to allow public read access
CREATE POLICY "Public read access for customer avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'customer-avatars');

-- Create storage policy to allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload customer avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'customer-avatars');

-- Create storage policy to allow authenticated users to update
CREATE POLICY "Allow authenticated users to update customer avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'customer-avatars');

-- Create storage policy to allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete customer avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'customer-avatars');
