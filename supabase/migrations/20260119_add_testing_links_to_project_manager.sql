-- Add testing_links column to project_manager table
ALTER TABLE public.project_manager 
ADD COLUMN IF NOT EXISTS testing_links JSONB DEFAULT '[]'::jsonb;

-- Create index for testing_links queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_project_manager_testing_links ON public.project_manager USING GIN (testing_links);

-- Add comment to explain the structure
COMMENT ON COLUMN public.project_manager.testing_links IS 'Array of testing links for AI Agents. Format: [{"id": "uuid", "label": "string", "url": "string"}]';
