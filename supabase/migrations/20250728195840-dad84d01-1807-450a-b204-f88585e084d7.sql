-- Update the contracts table status constraint to include 'pending'
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('draft', 'pending', 'active', 'expired', 'cancelled', 'renewed'));