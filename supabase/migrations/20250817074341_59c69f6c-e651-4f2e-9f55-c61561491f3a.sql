-- Fix contracts.payment_frequency check constraint to allow monthly updates
ALTER TABLE public.contracts
DROP CONSTRAINT IF EXISTS contracts_payment_frequency_check;

ALTER TABLE public.contracts
ADD CONSTRAINT contracts_payment_frequency_check
CHECK (payment_frequency IN ('annual', 'monthly', 'quarterly', 'semi_annual', 'one_time'));