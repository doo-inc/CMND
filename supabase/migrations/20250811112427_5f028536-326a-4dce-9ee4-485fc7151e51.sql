-- Fix the Motiv8 contract payment frequency and clean up duplicate payments
-- First, delete the duplicate payments
DELETE FROM payments WHERE customer_id = 'c7a77825-8348-4def-a681-8cde3ac16fb8';

-- Update the contract to be one_time instead of annual
UPDATE contracts 
SET payment_frequency = 'one_time'
WHERE customer_id = 'c7a77825-8348-4def-a681-8cde3ac16fb8';

-- The payment generation trigger will recreate the correct payment