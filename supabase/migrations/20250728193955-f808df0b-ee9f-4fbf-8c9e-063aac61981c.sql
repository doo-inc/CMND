-- Make start_date and end_date nullable to allow draft contracts
ALTER TABLE contracts 
ALTER COLUMN start_date DROP NOT NULL,
ALTER COLUMN end_date DROP NOT NULL;

-- Add validation function to ensure dates are provided for active contracts
CREATE OR REPLACE FUNCTION validate_contract_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure active contracts have both start and end dates
  IF NEW.status = 'active' AND (NEW.start_date IS NULL OR NEW.end_date IS NULL) THEN
    RAISE EXCEPTION 'Active contracts must have both start_date and end_date specified';
  END IF;
  
  -- Ensure end date is after start date when both are provided
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'Contract end_date must be after start_date';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contract validation
CREATE TRIGGER validate_contract_dates_trigger
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION validate_contract_dates();