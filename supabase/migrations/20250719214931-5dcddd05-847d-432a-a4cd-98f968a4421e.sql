-- Create countries table for admin management
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  region TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on countries table
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active countries
CREATE POLICY "Everyone can view active countries" 
ON public.countries 
FOR SELECT 
USING (is_active = true);

-- Only admins can manage countries
CREATE POLICY "Only admins can manage countries" 
ON public.countries 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default countries from the current hardcoded list
INSERT INTO public.countries (name, region) VALUES
  -- North America
  ('United States', 'North America'),
  ('Canada', 'North America'),
  ('Mexico', 'North America'),
  
  -- Europe
  ('United Kingdom', 'Europe'),
  ('Germany', 'Europe'),
  ('France', 'Europe'),
  ('Italy', 'Europe'),
  ('Spain', 'Europe'),
  ('Netherlands', 'Europe'),
  ('Belgium', 'Europe'),
  ('Switzerland', 'Europe'),
  ('Austria', 'Europe'),
  ('Sweden', 'Europe'),
  ('Norway', 'Europe'),
  ('Denmark', 'Europe'),
  ('Finland', 'Europe'),
  ('Poland', 'Europe'),
  ('Czech Republic', 'Europe'),
  ('Hungary', 'Europe'),
  ('Romania', 'Europe'),
  ('Bulgaria', 'Europe'),
  ('Croatia', 'Europe'),
  ('Slovenia', 'Europe'),
  ('Slovakia', 'Europe'),
  ('Estonia', 'Europe'),
  ('Latvia', 'Europe'),
  ('Lithuania', 'Europe'),
  ('Ireland', 'Europe'),
  ('Portugal', 'Europe'),
  ('Greece', 'Europe'),
  ('Cyprus', 'Europe'),
  ('Malta', 'Europe'),
  ('Luxembourg', 'Europe'),
  ('Iceland', 'Europe'),
  
  -- Middle East
  ('United Arab Emirates', 'Middle East'),
  ('Saudi Arabia', 'Middle East'),
  ('Qatar', 'Middle East'),
  ('Kuwait', 'Middle East'),
  ('Bahrain', 'Middle East'),
  ('Oman', 'Middle East'),
  ('Jordan', 'Middle East'),
  ('Lebanon', 'Middle East'),
  ('Israel', 'Middle East'),
  ('Turkey', 'Middle East'),
  ('Iran', 'Middle East'),
  ('Iraq', 'Middle East'),
  ('Syria', 'Middle East'),
  ('Yemen', 'Middle East'),
  
  -- Asia Pacific
  ('China', 'Asia Pacific'),
  ('Japan', 'Asia Pacific'),
  ('South Korea', 'Asia Pacific'),
  ('India', 'Asia Pacific'),
  ('Singapore', 'Asia Pacific'),
  ('Malaysia', 'Asia Pacific'),
  ('Thailand', 'Asia Pacific'),
  ('Indonesia', 'Asia Pacific'),
  ('Philippines', 'Asia Pacific'),
  ('Vietnam', 'Asia Pacific'),
  ('Australia', 'Asia Pacific'),
  ('New Zealand', 'Asia Pacific'),
  ('Hong Kong', 'Asia Pacific'),
  ('Taiwan', 'Asia Pacific'),
  
  -- Africa
  ('South Africa', 'Africa'),
  ('Egypt', 'Africa'),
  ('Nigeria', 'Africa'),
  ('Kenya', 'Africa'),
  ('Morocco', 'Africa'),
  ('Tunisia', 'Africa'),
  ('Ghana', 'Africa'),
  ('Ethiopia', 'Africa'),
  
  -- South America
  ('Brazil', 'South America'),
  ('Argentina', 'South America'),
  ('Chile', 'South America'),
  ('Colombia', 'South America'),
  ('Peru', 'South America'),
  ('Venezuela', 'South America'),
  ('Ecuador', 'South America'),
  ('Uruguay', 'South America');

-- Add trigger for updating updated_at
CREATE TRIGGER update_countries_updated_at
BEFORE UPDATE ON public.countries
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();