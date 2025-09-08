-- Replace deadline column with status_changed_at in lifecycle_stages
ALTER TABLE lifecycle_stages DROP COLUMN IF EXISTS deadline;
ALTER TABLE lifecycle_stages ADD COLUMN status_changed_at TIMESTAMP WITH TIME ZONE;