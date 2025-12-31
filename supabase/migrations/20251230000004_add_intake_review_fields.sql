-- Add review tracking fields to intake_responses
-- Note: review_status, reviewed_by, reviewed_at, internal_notes, and decline_reason
-- were already added in 20251230000001_client_invitations.sql
-- This migration completes the implementation by:
-- 1. Adding missing index on reviewed_by
-- 2. Backfilling existing records with appropriate review_status
-- 3. Making review_status NOT NULL

-- Add index for finding responses under review by specific lawyer
CREATE INDEX IF NOT EXISTS idx_intake_responses_reviewed_by
  ON intake_responses(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- Set default review_status for existing rows
-- Map old 'status' values to new 'review_status' values
UPDATE intake_responses
SET review_status = CASE
  WHEN status = 'approved' THEN 'accepted'
  WHEN status = 'submitted' THEN 'pending'
  ELSE 'pending'
END
WHERE review_status IS NULL;

-- Make review_status required going forward (if not already)
-- First ensure all rows have a value (from UPDATE above)
-- Then set NOT NULL constraint
DO $$
BEGIN
  -- Check if column is already NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intake_responses'
      AND column_name = 'review_status'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE intake_responses
      ALTER COLUMN review_status SET NOT NULL;
  END IF;
END $$;

COMMENT ON INDEX idx_intake_responses_reviewed_by IS 'Index for finding intake responses under review by specific lawyer';
