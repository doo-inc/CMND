-- Drop and recreate the function to handle churned customers properly
DROP FUNCTION IF EXISTS update_customer_pipeline_stage() CASCADE;

CREATE OR REPLACE FUNCTION update_customer_pipeline_stage()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_pipeline_stage TEXT;
  v_status TEXT;
  v_furthest_stage_index INTEGER := -1;
  v_current_stage_index INTEGER;
  v_canonical_name TEXT;
  v_has_completed BOOLEAN := FALSE;
  v_has_in_progress BOOLEAN := FALSE;
  v_is_churned BOOLEAN;
  rec RECORD;
BEGIN
  -- Get the customer_id from the trigger
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
  
  -- Check if customer is churned
  SELECT (churn_date IS NOT NULL) INTO v_is_churned
  FROM customers
  WHERE id = v_customer_id;
  
  -- Loop through all lifecycle stages for this customer
  FOR rec IN 
    SELECT name, status 
    FROM lifecycle_stages 
    WHERE customer_id = v_customer_id
  LOOP
    -- Only consider completed stages for pipeline progression
    IF LOWER(TRIM(rec.status)) IN ('done', 'completed', 'complete', 'finished') THEN
      v_has_completed := TRUE;
      
      -- Canonicalize the stage name and map to pipeline stage index
      v_canonical_name := INITCAP(LOWER(TRIM(rec.name)));
      v_current_stage_index := -1;
      
      -- Map lifecycle stages to pipeline stages (matching LIFECYCLE_TO_PIPELINE_MAPPING)
      CASE 
        -- Lead stage (index 0)
        WHEN v_canonical_name IN ('Prospect', 'Meeting Set') THEN
          v_current_stage_index := 0;
        
        -- Qualified stage (index 1)
        WHEN v_canonical_name IN ('Qualified Lead', 'Discovery Call') THEN
          v_current_stage_index := 1;
        
        -- Demo stage (index 2)
        WHEN v_canonical_name = 'Demo' THEN
          v_current_stage_index := 2;
        
        -- Proposal stage (index 3)
        WHEN v_canonical_name IN ('Proposal Sent', 'Proposal Approved') THEN
          v_current_stage_index := 3;
        
        -- Contract stage (index 4)
        WHEN v_canonical_name IN ('Contract Sent', 'Contract Signed') THEN
          v_current_stage_index := 4;
        
        -- Implementation stage (index 5)
        WHEN v_canonical_name IN ('Onboarding', 'Technical Setup', 'Training') THEN
          v_current_stage_index := 5;
        
        -- Live stage (index 6)
        WHEN v_canonical_name IN ('Go Live', 'Payment Processed') THEN
          v_current_stage_index := 6;
        
        ELSE
          v_current_stage_index := -1;
      END CASE;
      
      -- Track the furthest stage reached
      IF v_current_stage_index > v_furthest_stage_index THEN
        v_furthest_stage_index := v_current_stage_index;
      END IF;
    END IF;
    
    -- Check for in-progress stages
    IF LOWER(TRIM(rec.status)) IN ('in-progress', 'in progress', 'ongoing') THEN
      v_has_in_progress := TRUE;
    END IF;
  END LOOP;
  
  -- Map the furthest stage index to pipeline stage name
  CASE v_furthest_stage_index
    WHEN 0 THEN v_pipeline_stage := 'Lead';
    WHEN 1 THEN v_pipeline_stage := 'Qualified';
    WHEN 2 THEN v_pipeline_stage := 'Demo';
    WHEN 3 THEN v_pipeline_stage := 'Proposal';
    WHEN 4 THEN v_pipeline_stage := 'Contract';
    WHEN 5 THEN v_pipeline_stage := 'Implementation';
    WHEN 6 THEN v_pipeline_stage := 'Live';
    ELSE v_pipeline_stage := 'Lead'; -- Default
  END CASE;
  
  -- Determine operational status
  -- If customer is churned, keep them as churned
  IF v_is_churned THEN
    v_status := 'churned';
  ELSIF v_furthest_stage_index = 6 THEN
    -- Only mark as done if Go Live is completed and not churned
    v_status := 'done';
  ELSIF v_has_in_progress THEN
    v_status := 'in-progress';
  ELSIF v_has_completed THEN
    v_status := 'in-progress';
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

-- Recreate the trigger
CREATE TRIGGER trigger_update_customer_pipeline_stage
AFTER INSERT OR UPDATE OR DELETE ON lifecycle_stages
FOR EACH ROW
EXECUTE FUNCTION update_customer_pipeline_stage();

-- Re-sync all customers
WITH first_stages AS (
  SELECT DISTINCT ON (customer_id) id, customer_id
  FROM lifecycle_stages
  ORDER BY customer_id, created_at
)
UPDATE lifecycle_stages 
SET updated_at = NOW()
WHERE id IN (SELECT id FROM first_stages);