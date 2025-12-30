-- Create project_manager table to store project data for all users
CREATE TABLE IF NOT EXISTS project_manager (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_logo TEXT,
  service_type TEXT,
  project_manager TEXT,
  service_description TEXT DEFAULT '',
  checklist_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'demo')),
  demo_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_manager_customer_id ON project_manager(customer_id);
CREATE INDEX IF NOT EXISTS idx_project_manager_status ON project_manager(status);

-- Enable RLS
ALTER TABLE project_manager ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read/write
CREATE POLICY "Allow all authenticated users full access to project_manager"
  ON project_manager
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime for project_manager table
ALTER TABLE project_manager REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE project_manager;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_manager_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_manager_timestamp
  BEFORE UPDATE ON project_manager
  FOR EACH ROW
  EXECUTE FUNCTION update_project_manager_updated_at();

