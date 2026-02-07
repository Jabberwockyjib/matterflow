-- Add column to store the Google account email for visibility
-- This helps users know which Google account is connected to avoid uploading to wrong Drive
ALTER TABLE practice_settings
ADD COLUMN IF NOT EXISTS google_connected_email text;
