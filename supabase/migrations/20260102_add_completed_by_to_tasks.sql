-- Add completed_by and completed_at columns to tasks table
-- These track who completed a task and when

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_completed_by ON tasks(completed_by);

COMMENT ON COLUMN tasks.completed_by IS 'User who marked the task as completed';
COMMENT ON COLUMN tasks.completed_at IS 'Timestamp when the task was marked as completed';

