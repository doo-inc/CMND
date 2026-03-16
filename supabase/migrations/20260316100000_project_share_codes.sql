-- Add share_code column to project_manager for public project update links
ALTER TABLE public.project_manager ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- Function to generate a random 8-char alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger function to auto-generate share_code on INSERT
CREATE OR REPLACE FUNCTION public.set_share_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.share_code IS NULL OR NEW.share_code = '' THEN
    LOOP
      new_code := public.generate_share_code();
      SELECT EXISTS(SELECT 1 FROM public.project_manager WHERE share_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.share_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_share_code ON public.project_manager;
CREATE TRIGGER trigger_set_share_code
  BEFORE INSERT ON public.project_manager
  FOR EACH ROW
  EXECUTE FUNCTION public.set_share_code();

-- Backfill existing rows that don't have a share_code
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR rec IN SELECT id FROM public.project_manager WHERE share_code IS NULL LOOP
    LOOP
      new_code := public.generate_share_code();
      SELECT EXISTS(SELECT 1 FROM public.project_manager WHERE share_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE public.project_manager SET share_code = new_code WHERE id = rec.id;
  END LOOP;
END;
$$;

-- RPC function for public access: returns limited project data by share code
CREATE OR REPLACE FUNCTION public.get_project_by_share_code(code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', pm.id,
    'customer_name', pm.customer_name,
    'customer_logo', pm.customer_logo,
    'service_type', pm.service_type,
    'service_description', pm.service_description,
    'status', pm.status,
    'priority', pm.priority,
    'checklist_items', pm.checklist_items,
    'start_date', pm.start_date,
    'deadline', pm.deadline,
    'demo_date', pm.demo_date,
    'demo_delivered', pm.demo_delivered,
    'testing_links', pm.testing_links,
    'project_manager', pm.project_manager,
    'secondary_project_manager', pm.secondary_project_manager,
    'created_at', pm.created_at,
    'completed_at', pm.completed_at
  ) INTO result
  FROM public.project_manager pm
  WHERE pm.share_code = code;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Project not found for the given code';
  END IF;

  RETURN result;
END;
$$;

-- Allow anonymous users to call this RPC function
GRANT EXECUTE ON FUNCTION public.get_project_by_share_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_project_by_share_code(TEXT) TO authenticated;
