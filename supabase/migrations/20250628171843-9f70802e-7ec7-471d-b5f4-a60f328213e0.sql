
-- Create enum for partnership types
CREATE TYPE public.partnership_type AS ENUM (
  'reseller',
  'consultant', 
  'platform_partner',
  'education_partner',
  'mou_partner'
);

-- Create enum for partnership status/stage
CREATE TYPE public.partnership_status AS ENUM (
  'in_discussion',
  'signed',
  'active',
  'inactive',
  'expired'
);

-- Create partnerships table
CREATE TABLE public.partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  partnership_type partnership_type NOT NULL,
  country TEXT,
  region TEXT,
  start_date DATE,
  renewal_date DATE,
  expiry_date DATE,
  status partnership_status NOT NULL DEFAULT 'in_discussion',
  expected_value INTEGER DEFAULT 0,
  owner_id TEXT,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partnership contacts table
CREATE TABLE public.partnership_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partnership documents table
CREATE TABLE public.partnership_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partnership timeline table
CREATE TABLE public.partnership_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  created_by TEXT,
  created_by_name TEXT,
  created_by_avatar TEXT,
  related_type TEXT,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_timeline ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all operations for now - can be restricted later)
CREATE POLICY "Allow all operations on partnerships" ON public.partnerships FOR ALL USING (true);
CREATE POLICY "Allow all operations on partnership_contacts" ON public.partnership_contacts FOR ALL USING (true);
CREATE POLICY "Allow all operations on partnership_documents" ON public.partnership_documents FOR ALL USING (true);
CREATE POLICY "Allow all operations on partnership_timeline" ON public.partnership_timeline FOR ALL USING (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_partnerships_updated_at
  BEFORE UPDATE ON public.partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_partnership_contacts_updated_at
  BEFORE UPDATE ON public.partnership_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_partnership_documents_updated_at
  BEFORE UPDATE ON public.partnership_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_partnership_timeline_updated_at
  BEFORE UPDATE ON public.partnership_timeline
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();
