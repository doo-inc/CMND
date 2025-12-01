-- Remove CHECK constraints on service plan fields
-- Run this in your Supabase SQL Editor

-- Drop the voice_tier constraint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_voice_tier_check;

-- Drop the text_plan constraint (if exists)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_text_plan_check;

-- Drop the service_type constraint (if exists)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_service_type_check;

-- Now the columns accept any string value
-- You can verify by running:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'customers'::regclass;


