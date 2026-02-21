-- Add category column to tasks table for department segregation (COE, BD, General)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General';
