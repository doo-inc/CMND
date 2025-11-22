-- Update existing customer segments to new classification
UPDATE customers 
SET segment = CASE 
  WHEN segment IN ('Small Business', 'Mid-Market') THEN 'SME'
  WHEN segment = 'Enterprise' THEN 'Large Enterprise'
  ELSE segment 
END
WHERE segment IN ('Small Business', 'Mid-Market', 'Enterprise');