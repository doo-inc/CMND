
-- Make owner_id nullable to prevent foreign key constraint issues
ALTER TABLE lifecycle_stages ALTER COLUMN owner_id DROP NOT NULL;

-- Clear any existing lifecycle stages that might have invalid owner_ids
DELETE FROM lifecycle_stages WHERE owner_id NOT IN (SELECT id FROM staff);

-- Update the foreign key constraint to allow NULL values
ALTER TABLE lifecycle_stages DROP CONSTRAINT IF EXISTS lifecycle_stages_owner_id_fkey;
ALTER TABLE lifecycle_stages ADD CONSTRAINT lifecycle_stages_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES staff(id) ON DELETE SET NULL;
