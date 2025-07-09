-- Add estimated_deal_value column to customers table
ALTER TABLE public.customers 
ADD COLUMN estimated_deal_value integer DEFAULT 0;

-- Migrate existing contract_size values to estimated_deal_value as initial data
UPDATE public.customers 
SET estimated_deal_value = COALESCE(contract_size, 0)
WHERE estimated_deal_value IS NULL OR estimated_deal_value = 0;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN public.customers.estimated_deal_value IS 'Estimated potential deal value during sales pipeline process';