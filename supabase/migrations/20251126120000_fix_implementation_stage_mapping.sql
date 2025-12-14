-- Fix implementation stage mapping to include more stage names
-- This addresses the issue where customers like Macqueen show "Contract" instead of "Implementation"

CREATE OR REPLACE FUNCTION public.update_customer_pipeline_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
  v_go_live_completed BOOLEAN := FALSE;
  v_manual_stage TEXT;
  v_manual_stage_index INTEGER := -1;
  v_auto_calculated_stage TEXT;
  v_impl_in_progress BOOLEAN := FALSE;
  rec RECORD;
BEGIN
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
  
  -- Get manual stage if set
  SELECT manual_stage INTO v_manual_stage
  FROM customers
  WHERE id = v_customer_id;
  
  -- Check if customer is churned
  SELECT (churn_date IS NOT NULL) INTO v_is_churned
  FROM customers
  WHERE id = v_customer_id;
  
  -- Loop through all lifecycle stages to calculate auto stage
  FOR rec IN 
    SELECT name, status 
    FROM lifecycle_stages 
    WHERE customer_id = v_customer_id
  LOOP
    -- Canonicalize: trim, lowercase, then title case each word
    v_canonical_name := INITCAP(LOWER(TRIM(REPLACE(REPLACE(rec.name, '-', ' '), '_', ' '))));
    
    IF v_canonical_name = 'Go Live' AND LOWER(TRIM(rec.status)) IN ('done', 'completed', 'complete', 'finished') THEN
      v_go_live_completed := TRUE;
    END IF;
    
    -- Check for in-progress implementation stages
    IF LOWER(TRIM(rec.status)) IN ('in-progress', 'in progress', 'ongoing') THEN
      v_has_in_progress := TRUE;
      -- Check if it's an implementation stage
      IF v_canonical_name IN (
        'Onboarding', 'Technical Setup', 'Training',
        'Kick Off Meeting', 'Kickoff Meeting',
        'Requirements Gathering', 'Account Setup', 'Data Migration',
        'Invoice Generation', 'Payment Processing', 'Implementation',
        'Setup', 'Configuration', 'Integration'
      ) THEN
        v_impl_in_progress := TRUE;
      END IF;
    END IF;
    
    IF LOWER(TRIM(rec.status)) IN ('done', 'completed', 'complete', 'finished') THEN
      v_has_completed := TRUE;
      v_current_stage_index := -1;
      
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
        WHEN v_canonical_name IN ('Contract Sent', 'Contract Signed', 'Contract Approval') THEN 
          v_current_stage_index := 4;
        
        -- Implementation stage (index 5) - EXPANDED LIST
        WHEN v_canonical_name IN (
          'Onboarding', 'Technical Setup', 'Training',
          'Kick Off Meeting', 'Kickoff Meeting',
          'Requirements Gathering', 'Account Setup', 'Data Migration',
          'Invoice Generation', 'Payment Processing', 'Implementation',
          'Setup', 'Configuration', 'Integration'
        ) THEN 
          v_current_stage_index := 5;
        
        -- Live stage (index 6)
        WHEN v_canonical_name = 'Go Live' THEN 
          v_current_stage_index := 6;
        
        ELSE 
          v_current_stage_index := -1;
      END CASE;
      
      IF v_current_stage_index > v_furthest_stage_index THEN
        v_furthest_stage_index := v_current_stage_index;
      END IF;
    END IF;
  END LOOP;
  
  -- Override: Cannot be Live unless Go Live is completed
  IF v_furthest_stage_index = 6 AND NOT v_go_live_completed THEN
    v_furthest_stage_index := 5;
  END IF;
  
  -- NEW: If any implementation stage is in-progress and we're at Contract, bump to Implementation
  IF v_furthest_stage_index = 4 AND v_impl_in_progress THEN
    v_furthest_stage_index := 5;
  END IF;
  
  -- Map auto-calculated stage
  CASE v_furthest_stage_index
    WHEN 0 THEN v_auto_calculated_stage := 'Lead';
    WHEN 1 THEN v_auto_calculated_stage := 'Qualified';
    WHEN 2 THEN v_auto_calculated_stage := 'Demo';
    WHEN 3 THEN v_auto_calculated_stage := 'Proposal';
    WHEN 4 THEN v_auto_calculated_stage := 'Contract';
    WHEN 5 THEN v_auto_calculated_stage := 'Implementation';
    WHEN 6 THEN v_auto_calculated_stage := 'Live';
    ELSE v_auto_calculated_stage := 'Lead';
  END CASE;
  
  -- Apply manual override logic (only allow advancing, not going backward)
  IF v_manual_stage IS NOT NULL THEN
    CASE v_manual_stage
      WHEN 'Lead' THEN v_manual_stage_index := 0;
      WHEN 'Qualified' THEN v_manual_stage_index := 1;
      WHEN 'Demo' THEN v_manual_stage_index := 2;
      WHEN 'Proposal' THEN v_manual_stage_index := 3;
      WHEN 'Contract' THEN v_manual_stage_index := 4;
      WHEN 'Implementation' THEN v_manual_stage_index := 5;
      WHEN 'Live' THEN v_manual_stage_index := 6;
      ELSE v_manual_stage_index := -1;
    END CASE;
    
    -- Use manual stage only if it's ahead of auto-calculated
    IF v_manual_stage_index > v_furthest_stage_index THEN
      v_pipeline_stage := v_manual_stage;
    ELSE
      v_pipeline_stage := v_auto_calculated_stage;
    END IF;
  ELSE
    v_pipeline_stage := v_auto_calculated_stage;
  END IF;
  
  -- Determine operational status
  IF v_go_live_completed THEN
    v_status := 'done';
  ELSIF v_has_in_progress THEN
    v_status := 'in-progress';
  ELSIF v_has_completed THEN
    v_status := 'in-progress';
  ELSE
    v_status := 'not-started';
  END IF;
  
  -- Update customer if not churned
  IF NOT COALESCE(v_is_churned, FALSE) THEN
    UPDATE customers
    SET 
      stage = v_pipeline_stage,
      status = v_status,
      updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Force re-sync all customers by touching their lifecycle stages
UPDATE lifecycle_stages 
SET updated_at = NOW()
WHERE customer_id IN (
  SELECT id FROM customers WHERE name ILIKE '%macqueen%'
);

-- Also update any customers that might have implementation stages with various names
UPDATE lifecycle_stages 
SET updated_at = NOW()
WHERE name ILIKE ANY(ARRAY[
  '%kick%off%', '%kickoff%', '%requirements%', '%account setup%',
  '%data migration%', '%invoice%', '%payment%process%'
]);






