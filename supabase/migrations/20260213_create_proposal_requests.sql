-- Create proposal_requests table for BD team proposal workflow
CREATE TABLE IF NOT EXISTS proposal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  volume_details TEXT,
  custom_integration TEXT,
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE proposal_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can view proposal_requests"
  ON proposal_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert proposal_requests"
  ON proposal_requests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update proposal_requests"
  ON proposal_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete proposal_requests"
  ON proposal_requests FOR DELETE TO authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE proposal_requests;
