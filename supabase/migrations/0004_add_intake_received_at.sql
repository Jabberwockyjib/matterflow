-- Add intake_received_at timestamp to matters table for tracking when intake was submitted
ALTER TABLE matters
ADD COLUMN intake_received_at TIMESTAMPTZ;

-- Add comment explaining the field
COMMENT ON COLUMN matters.intake_received_at IS 'Timestamp when client submitted intake form';
