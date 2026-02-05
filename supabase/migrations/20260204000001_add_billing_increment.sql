-- Add billing increment setting to practice_settings
-- Default 6 minutes (0.1 hour) - industry standard for legal billing

ALTER TABLE practice_settings
ADD COLUMN billing_increment_minutes integer DEFAULT 6;

-- Add comment
COMMENT ON COLUMN practice_settings.billing_increment_minutes IS 'Minimum billing increment in minutes. Time entries are rounded up to nearest increment. Default 6 (0.1 hour).';
