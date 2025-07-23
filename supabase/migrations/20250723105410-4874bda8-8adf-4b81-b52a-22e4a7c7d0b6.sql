
-- Add churn_date column to customers table
ALTER TABLE public.customers 
ADD COLUMN churn_date DATE;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN public.customers.churn_date IS 'Date when customer churned (stopped being active)';

-- Update the customers table to add 'churned' status option
-- First, let's see what constraint exists on status field
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_status_check;

-- Add updated constraint that includes 'churned' status
ALTER TABLE public.customers ADD CONSTRAINT customers_status_check 
CHECK (status IN ('not-started', 'in-progress', 'done', 'blocked', 'churned'));

-- Add an index on churn_date for better query performance
CREATE INDEX idx_customers_churn_date ON public.customers(churn_date);

-- Add status column to contracts table if it doesn't have proper constraint
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('draft', 'active', 'expired', 'cancelled', 'renewed'));

-- Create a function to automatically update customer churn status based on contract end dates
CREATE OR REPLACE FUNCTION update_customer_churn_status()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update customers to churned status if all their contracts have expired
  UPDATE customers 
  SET status = 'churned',
      churn_date = CURRENT_DATE
  WHERE status = 'done' -- Only update live customers
    AND id IN (
      SELECT DISTINCT c.customer_id 
      FROM contracts c 
      WHERE c.customer_id = customers.id
      GROUP BY c.customer_id
      HAVING MAX(c.end_date) < CURRENT_DATE -- All contracts have expired
    )
    AND churn_date IS NULL; -- Don't update if already churned
END;
$$;

-- Create a trigger to automatically update contract status when end_date passes
CREATE OR REPLACE FUNCTION auto_update_contract_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update contract status to expired if end_date has passed
  IF NEW.end_date < CURRENT_DATE AND (OLD.status IS NULL OR OLD.status != 'expired') THEN
    NEW.status = 'expired';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for contract status updates
DROP TRIGGER IF EXISTS trigger_auto_update_contract_status ON contracts;
CREATE TRIGGER trigger_auto_update_contract_status
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_contract_status();
