-- Table to track additional information requests sent to clients
CREATE TABLE info_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_response_id UUID NOT NULL REFERENCES intake_responses(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  questions JSONB NOT NULL, -- Array of structured question objects
  message TEXT, -- Personal message from lawyer
  documents JSONB, -- Array of attached document metadata
  response_deadline TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responses JSONB, -- Client's responses to questions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by intake response
CREATE INDEX idx_info_requests_intake_response
  ON info_requests(intake_response_id);

-- Index for filtering by status
CREATE INDEX idx_info_requests_status
  ON info_requests(status) WHERE status = 'pending';

-- RLS policies
ALTER TABLE info_requests ENABLE ROW LEVEL SECURITY;

-- Staff/admin can view all requests
CREATE POLICY "Staff and admin can view all info requests"
  ON info_requests FOR SELECT
  USING (current_user_role() IN ('staff', 'admin'));

-- Staff/admin can create requests
CREATE POLICY "Staff and admin can create info requests"
  ON info_requests FOR INSERT
  WITH CHECK (current_user_role() IN ('staff', 'admin'));

-- Staff/admin can update requests they created
CREATE POLICY "Staff and admin can update info requests"
  ON info_requests FOR UPDATE
  USING (current_user_role() IN ('staff', 'admin'));

-- Clients can view requests for their intake responses
CREATE POLICY "Clients can view their info requests"
  ON info_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM intake_responses ir
      JOIN matters m ON m.id = ir.matter_id
      WHERE ir.id = info_requests.intake_response_id
        AND m.client_id = auth.uid()
    )
  );

-- Clients can update responses for their requests
CREATE POLICY "Clients can update responses to their info requests"
  ON info_requests FOR UPDATE
  USING (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM intake_responses ir
      JOIN matters m ON m.id = ir.matter_id
      WHERE ir.id = info_requests.intake_response_id
        AND m.client_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_info_requests_updated_at
  BEFORE UPDATE ON info_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
