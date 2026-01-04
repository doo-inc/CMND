-- Create board_columns table for shared task board columns
-- All users in the organization should see the same columns

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.board_columns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all users to view board columns" ON public.board_columns;
DROP POLICY IF EXISTS "Allow all users to insert board columns" ON public.board_columns;
DROP POLICY IF EXISTS "Allow all users to update board columns" ON public.board_columns;
DROP POLICY IF EXISTS "Allow all users to delete board columns" ON public.board_columns;

-- Create policies that allow all authenticated users to manage columns
-- This makes columns shared across the entire organization
CREATE POLICY "Allow all users to view board columns"
    ON public.board_columns FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow all users to insert board columns"
    ON public.board_columns FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow all users to update board columns"
    ON public.board_columns FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all users to delete board columns"
    ON public.board_columns FOR DELETE
    TO authenticated
    USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_columns;

-- Insert default columns if table is empty
INSERT INTO public.board_columns (id, name, position, is_completed)
SELECT * FROM (VALUES 
    ('backlog', 'Backlog', 0, false),
    ('in-progress', 'In Progress', 1, false),
    ('review', 'Review', 2, false),
    ('done', 'Done', 3, true)
) AS default_columns(id, name, position, is_completed)
WHERE NOT EXISTS (SELECT 1 FROM public.board_columns LIMIT 1);

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_board_columns_position ON public.board_columns(position);

