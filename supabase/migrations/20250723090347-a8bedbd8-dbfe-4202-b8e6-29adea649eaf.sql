-- First, remove duplicate lifecycle stages, keeping only the oldest one for each customer-stage combination
WITH ranked_stages AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY customer_id, name 
           ORDER BY created_at ASC
         ) as rn
  FROM lifecycle_stages
),
duplicates_to_delete AS (
  SELECT id FROM ranked_stages WHERE rn > 1
)
DELETE FROM lifecycle_stages 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Add unique constraint to prevent future duplicates
ALTER TABLE lifecycle_stages 
ADD CONSTRAINT lifecycle_stages_customer_name_unique 
UNIQUE (customer_id, name);