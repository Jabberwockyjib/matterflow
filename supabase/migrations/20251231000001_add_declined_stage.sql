-- Add "Declined" to matter stage allowed values
-- Note: The stage column is text type, not an enum, so we update the check constraint

-- First, drop the existing check constraint if it exists
ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_stage_check;

-- Add new check constraint including "Declined" and all valid stages from schemas.ts
ALTER TABLE public.matters ADD CONSTRAINT matters_stage_check
  CHECK (stage IN (
    'Lead Created',
    'Intake Sent',
    'Intake Received',
    'Conflict Check',
    'Under Review',
    'Waiting on Client',
    'Draft Ready',
    'Sent to Client',
    'Billing Pending',
    'Completed',
    'Archived',
    'Declined'
  ));

-- Add helpful comment
COMMENT ON COLUMN public.matters.stage IS 'Matter pipeline stages including Declined for rejected intakes';
