-- Add partnership tracking to contracts table
ALTER TABLE contracts 
ADD COLUMN partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_contracts_partnership_id ON contracts(partnership_id);

-- Add comment for documentation
COMMENT ON COLUMN contracts.partnership_id IS 'Links contract to the partnership that helped generate this deal';