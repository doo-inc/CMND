-- Fix the customer with incorrect status after manual churn
UPDATE customers 
SET status = 'churned'
WHERE churn_date IS NOT NULL 
  AND churn_method = 'manual' 
  AND status != 'churned';

-- Add a constraint to ensure data consistency for churn
ALTER TABLE customers 
ADD CONSTRAINT check_churn_consistency 
CHECK (
  (churn_date IS NULL AND churn_method IS NULL AND status != 'churned') OR
  (churn_date IS NOT NULL AND churn_method IS NOT NULL AND status = 'churned')
);