-- Add project_owner column to customers table
-- This will store the project owner/manager for the customer's project
ALTER TABLE customers ADD COLUMN IF NOT EXISTS project_owner TEXT;

-- Add comment for documentation
COMMENT ON COLUMN customers.project_owner IS 'Project owner/manager responsible for this customer';

