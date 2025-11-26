
-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS sync_customer_pipeline_stage ON lifecycle_stages;

CREATE TRIGGER sync_customer_pipeline_stage
  AFTER INSERT OR UPDATE OR DELETE ON lifecycle_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_pipeline_stage();

-- Re-sync all customers to apply the logic
UPDATE customers SET updated_at = NOW();
