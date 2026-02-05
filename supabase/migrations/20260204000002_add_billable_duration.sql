-- Add billable_duration_minutes to time_entries
-- Keeps actual duration in duration_minutes, stores rounded billable time separately

ALTER TABLE time_entries
ADD COLUMN billable_duration_minutes integer;

-- Backfill existing entries: set billable = actual (no retroactive rounding)
UPDATE time_entries
SET billable_duration_minutes = duration_minutes
WHERE duration_minutes IS NOT NULL;

-- Add comments
COMMENT ON COLUMN time_entries.duration_minutes IS 'Actual duration in minutes (raw time worked)';
COMMENT ON COLUMN time_entries.billable_duration_minutes IS 'Billable duration in minutes (rounded up to billing increment)';
