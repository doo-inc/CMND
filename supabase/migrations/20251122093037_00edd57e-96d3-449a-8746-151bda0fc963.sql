-- One-time migration to retroactively update customers to Live stage
-- This fixes customers who completed Go Live or Payment Processed before the trigger was added

UPDATE customers
SET 
  stage = 'Live',
  status = 'done',
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT ls.customer_id
  FROM lifecycle_stages ls
  WHERE (ls.name = 'Payment Processed' OR ls.name = 'Go Live')
    AND (ls.status = 'done' OR ls.status = 'completed')
)
AND stage != 'Live';  -- Only update customers not already in Live stage