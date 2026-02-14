-- Add last_contacted_at column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

-- Allow RLS policies to handle access (existing policies cover this)
