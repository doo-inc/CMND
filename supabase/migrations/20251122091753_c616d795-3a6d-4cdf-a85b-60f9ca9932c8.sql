-- Add Project Manager fields to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS project_manager text,
ADD COLUMN IF NOT EXISTS checklist_platform_integration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS checklist_ai_integration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS checklist_agent_creation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS implementation_notes text;

-- Add comment for documentation
COMMENT ON COLUMN public.customers.project_manager IS 'Name of the project manager assigned to this customer during implementation';
COMMENT ON COLUMN public.customers.checklist_platform_integration IS 'Tracks completion of platform integration phase';
COMMENT ON COLUMN public.customers.checklist_ai_integration IS 'Tracks completion of AI integration phase';
COMMENT ON COLUMN public.customers.checklist_agent_creation IS 'Tracks completion of AI agent creation phase';
COMMENT ON COLUMN public.customers.implementation_notes IS 'Free-form notes about the implementation process';