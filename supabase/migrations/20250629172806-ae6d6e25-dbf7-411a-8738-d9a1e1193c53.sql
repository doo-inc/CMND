
-- Add new columns to customers table for enhanced contract tracking
ALTER TABLE public.customers 
ADD COLUMN setup_fee INTEGER DEFAULT 0,
ADD COLUMN annual_rate INTEGER DEFAULT 0,
ADD COLUMN go_live_date DATE,
ADD COLUMN subscription_end_date DATE;

-- Add helpful comments to document the new fields
COMMENT ON COLUMN public.customers.setup_fee IS 'One-time setup fee in cents';
COMMENT ON COLUMN public.customers.annual_rate IS 'Annual subscription rate in cents';
COMMENT ON COLUMN public.customers.go_live_date IS 'Date when customer went live';
COMMENT ON COLUMN public.customers.subscription_end_date IS 'End date of current subscription';
