-- Add task_type and instructions columns to tasks table
ALTER TABLE tasks
ADD COLUMN task_type text NOT NULL DEFAULT 'general'
  CHECK (task_type IN ('document_upload', 'information_request', 'confirmation', 'general'));

ALTER TABLE tasks
ADD COLUMN instructions text;

COMMENT ON COLUMN tasks.task_type IS 'Type of response expected from client';
COMMENT ON COLUMN tasks.instructions IS 'Detailed instructions for the client on what is needed';

-- Update status check to include pending_review
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'pending_review', 'done', 'cancelled'));

-- Create task_responses table
CREATE TABLE task_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(user_id),
  response_text text,
  confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  reviewer_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_responses_task ON task_responses(task_id);
CREATE INDEX idx_task_responses_submitted_by ON task_responses(submitted_by);
CREATE INDEX idx_task_responses_status ON task_responses(status);

-- Add task_id to documents table for linking uploads to tasks
ALTER TABLE documents ADD COLUMN task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX idx_documents_task ON documents(task_id);

-- Enable RLS
ALTER TABLE task_responses ENABLE ROW LEVEL SECURITY;

-- Clients can view responses for tasks on their matters
CREATE POLICY "task_responses_select_policy" ON task_responses FOR SELECT
USING (
  submitted_by = auth.uid()
  OR current_user_role() IN ('admin', 'staff')
);

-- Clients can insert responses for tasks assigned to them
CREATE POLICY "task_responses_insert_policy" ON task_responses FOR INSERT
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN matters m ON t.matter_id = m.id
    WHERE t.id = task_id
    AND t.responsible_party = 'client'
    AND m.client_id = auth.uid()
  )
);

-- Staff/admin can update responses (approve/reject)
CREATE POLICY "task_responses_update_policy" ON task_responses FOR UPDATE
USING (current_user_role() IN ('admin', 'staff'));

-- Trigger for updated_at
CREATE TRIGGER update_task_responses_updated_at
  BEFORE UPDATE ON task_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
