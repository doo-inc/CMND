-- Create missing contract for Motiv8 customer based on their estimated deal value
INSERT INTO contracts (customer_id, name, value, setup_fee, annual_rate, payment_frequency, start_date, end_date, status) 
VALUES (
  'c7a77825-8348-4def-a681-8cde3ac16fb8', 
  'Service Agreement', 
  796, 
  0, 
  796, 
  'one_time', 
  '2025-08-11', 
  '2025-08-11', 
  'active'
);