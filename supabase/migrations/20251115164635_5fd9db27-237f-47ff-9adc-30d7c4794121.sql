
-- Function to automatically update customer pipeline stage based on lifecycle stages
CREATE OR REPLACE FUNCTION update_customer_pipeline_stage()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_pipeline_stage TEXT;
  v_status TEXT;
  v_stages TEXT[];
  v_stage_statuses TEXT[];
BEGIN
  -- Get the customer_id from the trigger
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
  
  -- Get all completed or in-progress lifecycle stages for this customer
  SELECT 
    array_agg(name ORDER BY created_at),
    array_agg(status ORDER BY created_at)
  INTO v_stages, v_stage_statuses
  FROM lifecycle_stages
  WHERE customer_id = v_customer_id
    AND (status = 'done' OR status = 'completed' OR status = 'in-progress');
  
  -- Determine pipeline stage based on furthest stage reached
  -- Check from latest to earliest pipeline stage
  IF 'Payment Processed' = ANY(v_stages) OR 'Go Live' = ANY(v_stages) THEN
    v_pipeline_stage := 'Live';
  ELSIF 'Training' = ANY(v_stages) OR 'Technical Setup' = ANY(v_stages) OR 'Onboarding' = ANY(v_stages) THEN
    v_pipeline_stage := 'Implementation';
  ELSIF 'Contract Signed' = ANY(v_stages) OR 'Contract Sent' = ANY(v_stages) THEN
    v_pipeline_stage := 'Contract';
  ELSIF 'Proposal Approved' = ANY(v_stages) OR 'Proposal Sent' = ANY(v_stages) THEN
    v_pipeline_stage := 'Proposal';
  ELSIF 'Demo' = ANY(v_stages) THEN
    v_pipeline_stage := 'Demo';
  ELSIF 'Discovery Call' = ANY(v_stages) OR 'Qualified Lead' = ANY(v_stages) THEN
    v_pipeline_stage := 'Qualified';
  ELSIF 'Meeting Set' = ANY(v_stages) OR 'Prospect' = ANY(v_stages) THEN
    v_pipeline_stage := 'Lead';
  ELSE
    v_pipeline_stage := 'Lead';
  END IF;
  
  -- Determine operational status
  IF 'in-progress' = ANY(v_stage_statuses) THEN
    v_status := 'in-progress';
  ELSIF 'done' = ANY(v_stage_statuses) OR 'completed' = ANY(v_stage_statuses) THEN
    v_status := 'done';
  ELSE
    v_status := 'not-started';
  END IF;
  
  -- Update the customer record
  UPDATE customers
  SET 
    stage = v_pipeline_stage,
    status = v_status,
    updated_at = NOW()
  WHERE id = v_customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on lifecycle_stages table
DROP TRIGGER IF EXISTS trigger_update_customer_pipeline_stage ON lifecycle_stages;
CREATE TRIGGER trigger_update_customer_pipeline_stage
  AFTER INSERT OR UPDATE OR DELETE ON lifecycle_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_pipeline_stage();

-- Manually fix Gulf Air and any other customers with incorrect stages
UPDATE customers c
SET 
  stage = CASE
    WHEN EXISTS (
      SELECT 1 FROM lifecycle_stages ls 
      WHERE ls.customer_id = c.id 
        AND ls.name IN ('Payment Processed', 'Go Live')
        AND ls.status IN ('done', 'completed', 'in-progress')
    ) THEN 'Live'
    WHEN EXISTS (
      SELECT 1 FROM lifecycle_stages ls 
      WHERE ls.customer_id = c.id 
        AND ls.name IN ('Training', 'Technical Setup', 'Onboarding')
        AND ls.status IN ('done', 'completed', 'in-progress')
    ) THEN 'Implementation'
    WHEN EXISTS (
      SELECT 1 FROM lifecycle_stages ls 
      WHERE ls.customer_id = c.id 
        AND ls.name IN ('Contract Signed', 'Contract Sent')
        AND ls.status IN ('done', 'completed', 'in-progress')
    ) THEN 'Contract'
    WHEN EXISTS (
      SELECT 1 FROM lifecycle_stages ls 
      WHERE ls.customer_id = c.id 
        AND ls.name IN ('Proposal Approved', 'Proposal Sent')
        AND ls.status IN ('done', 'completed', 'in-progress')
    ) THEN 'Proposal'
    WHEN EXISTS (
      SELECT 1 FROM lifecycle_stages ls 
      WHERE ls.customer_id = c.id 
        AND ls.name = 'Demo'
        AND ls.status IN ('done', 'completed', 'in-progress')
    ) THEN 'Demo'
    WHEN EXISTS (
      SELECT 1 FROM lifecycle_stages ls 
      WHERE ls.customer_id = c.id 
        AND ls.name IN ('Discovery Call', 'Qualified Lead')
        AND ls.status IN ('done', 'completed', 'in-progress')
    ) THEN 'Qualified'
    ELSE 'Lead'
  END,
  status = CASE
    WHEN EXISTS (
      SELECT 1 FROM lifecycle_stages ls 
      WHERE ls.customer_id = c.id AND ls.status = 'in-progress'
    ) THEN 'in-progress'
    WHEN EXISTS (
      SELECT 1 FROM lifecycle_stages ls 
      WHERE ls.customer_id = c.id AND ls.status IN ('done', 'completed')
    ) THEN 'done'
    ELSE 'not-started'
  END,
  updated_at = NOW()
WHERE c.status != 'churned' OR c.status IS NULL;
