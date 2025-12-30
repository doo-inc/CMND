-- Enable realtime for customers table to support real-time updates across users
ALTER TABLE customers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- Enable realtime for lifecycle_stages table to support real-time updates across users
ALTER TABLE lifecycle_stages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE lifecycle_stages;

-- Enable realtime for partnerships table (if not already enabled)
ALTER TABLE partnerships REPLICA IDENTITY FULL;

-- Attempt to add partnerships to realtime publication (may already exist)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE partnerships;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Table already in publication, ignore
END $$;

