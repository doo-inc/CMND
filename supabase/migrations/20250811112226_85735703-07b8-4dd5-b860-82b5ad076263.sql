-- Add 'one_time' to the payment frequency check constraint to support one-time contracts
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_payment_frequency_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_payment_frequency_check 
CHECK (payment_frequency IN ('annual', 'quarterly', 'semi_annual', 'one_time'));