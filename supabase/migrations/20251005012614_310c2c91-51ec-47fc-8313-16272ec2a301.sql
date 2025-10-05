-- Phase 2: Expand text_plan options in customers table
-- Since text_plan is currently TEXT type, we can just update the check constraint or leave it flexible
-- No enum needed - just using TEXT type allows any value

-- Add a comment to document the valid values
COMMENT ON COLUMN customers.text_plan IS 'Valid values: basic, growth, pro, scale, enterprise, large_enterprise';