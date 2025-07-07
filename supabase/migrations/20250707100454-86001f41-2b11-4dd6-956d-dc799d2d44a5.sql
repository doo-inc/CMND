-- Drop the existing constraint that's blocking 'not-applicable' status
ALTER TABLE lifecycle_stages DROP CONSTRAINT IF EXISTS lifecycle_stages_status_check;

-- Add the updated constraint with 'not-applicable' included
ALTER TABLE lifecycle_stages ADD CONSTRAINT lifecycle_stages_status_check 
CHECK (status = ANY (ARRAY['not-started'::text, 'in-progress'::text, 'done'::text, 'blocked'::text, 'not-applicable'::text]));