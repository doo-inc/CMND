-- Fix document upload issues and contract validation

-- 1. First, check and fix storage bucket setup
-- Check if bucket exists with correct permissions
SELECT name, public FROM storage.buckets WHERE name = 'Customer Documents';

-- If bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer-documents', 'Customer Documents', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure storage policies are permissive
DROP POLICY IF EXISTS "Allow all operations on customer documents" ON storage.objects;
CREATE POLICY "Allow all operations on customer documents" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'customer-documents');

-- 2. Fix contract date validation to allow past dates as long as end > start
DROP FUNCTION IF EXISTS public.validate_contract_dates() CASCADE;
CREATE OR REPLACE FUNCTION public.validate_contract_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Ensure active contracts have both start and end dates
  IF NEW.status = 'active' AND (NEW.start_date IS NULL OR NEW.end_date IS NULL) THEN
    RAISE EXCEPTION 'Active contracts must have both start_date and end_date specified';
  END IF;
  
  -- Ensure end date is after start date when both are provided (allow past dates)
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'Contract end_date must be after start_date. Start: %, End: %', NEW.start_date, NEW.end_date;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS validate_contract_dates_trigger ON contracts;
CREATE TRIGGER validate_contract_dates_trigger
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION validate_contract_dates();