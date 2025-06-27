
-- First, let's see what stages currently exist and clean up incorrect ones
DELETE FROM lifecycle_stages WHERE name = 'Contract Approval';

-- Clear all existing lifecycle stages to start fresh with correct data
DELETE FROM lifecycle_stages;

-- Now let's add the correct default stages for all existing customers
-- We'll get the first available staff member ID to use as the default owner
WITH customer_ids AS (
  SELECT id as customer_id FROM customers
),
default_staff AS (
  SELECT id as staff_id FROM staff LIMIT 1
),
default_stages AS (
  SELECT * FROM (VALUES
    ('Prospect', 'Pre-Sales', 1),
    ('Qualified Lead', 'Pre-Sales', 2),
    ('Meeting Set', 'Pre-Sales', 3),
    ('Discovery Call', 'Sales', 4),
    ('Proposal Sent', 'Sales', 5),
    ('Proposal Approved', 'Sales', 6),
    ('Contract Sent', 'Sales', 7),
    ('Contract Signed', 'Sales', 8),
    ('Onboarding', 'Implementation', 9),
    ('Technical Setup', 'Implementation', 10),
    ('Training', 'Implementation', 11),
    ('Go Live', 'Implementation', 12),
    ('Payment Processed', 'Finance', 13)
  ) AS t(stage_name, category, stage_order)
)
INSERT INTO lifecycle_stages (customer_id, name, status, category, owner_id, notes)
SELECT 
  c.customer_id,
  s.stage_name,
  'not-started',
  s.category,
  ds.staff_id,
  NULL
FROM customer_ids c
CROSS JOIN default_stages s
CROSS JOIN default_staff ds;
