-- Fix the tasks.assigned_to foreign key to reference auth.users instead of staff
-- This allows assigning tasks to any authenticated user in the system

-- First, drop the existing foreign key constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

-- Add new foreign key constraint referencing auth.users
-- Using ON DELETE SET NULL so tasks aren't deleted when users are removed
ALTER TABLE tasks 
ADD CONSTRAINT tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Also ensure customer_id foreign key is correct
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_customer_id_fkey;
ALTER TABLE tasks 
ADD CONSTRAINT tasks_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

COMMENT ON COLUMN tasks.assigned_to IS 'References auth.users - the user assigned to this task';

