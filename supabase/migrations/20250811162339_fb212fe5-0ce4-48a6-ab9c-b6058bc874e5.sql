-- Clean up duplicate/incorrect payments for Ahlia and regenerate correctly
DELETE FROM payments 
WHERE contract_id IN (
  SELECT c.id FROM contracts c 
  JOIN customers cu ON c.customer_id = cu.id 
  WHERE cu.name ILIKE '%ahlia%'
);

-- Now trigger the payment generation function for Ahlia's contracts
UPDATE contracts 
SET updated_at = now() 
WHERE customer_id IN (
  SELECT id FROM customers WHERE name ILIKE '%ahlia%'
);