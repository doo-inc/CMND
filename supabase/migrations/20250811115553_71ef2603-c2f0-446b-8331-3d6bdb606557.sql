-- Regenerate payment schedule for existing contracts by updating them
UPDATE contracts 
SET updated_at = NOW()
WHERE payment_frequency IN ('semi_annual', 'quarterly', 'monthly', 'annual')
AND id = '235555b3-fa14-49d2-a6b5-99e9081dba57';