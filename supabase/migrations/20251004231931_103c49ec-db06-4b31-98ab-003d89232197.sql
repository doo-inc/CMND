-- Add new customer fields for document generation
ALTER TABLE customers 
  ADD COLUMN IF NOT EXISTS company_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS legal_address TEXT,
  ADD COLUMN IF NOT EXISTS representative_name TEXT,
  ADD COLUMN IF NOT EXISTS representative_title TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 14,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BD';

-- Create generated_documents table for tracking
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('proposal', 'service_agreement', 'sla', 'quotation')),
  file_path TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'docx')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_documents_customer ON generated_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created ON generated_documents(created_at DESC);

-- Enable RLS
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_documents
CREATE POLICY "Authenticated users can view generated documents"
  ON generated_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create generated documents"
  ON generated_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete generated documents"
  ON generated_documents FOR DELETE
  TO authenticated
  USING (true);

-- Create storage bucket for customer documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer-documents bucket
CREATE POLICY "Authenticated users can upload customer documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'customer-documents');

CREATE POLICY "Authenticated users can view customer documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'customer-documents');

CREATE POLICY "Authenticated users can delete customer documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'customer-documents');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_generated_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_documents_updated_at();