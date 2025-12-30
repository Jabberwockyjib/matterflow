-- Add Google Drive fields to practice_settings (practice-wide, not per-user)
ALTER TABLE practice_settings
  ADD COLUMN google_refresh_token TEXT,
  ADD COLUMN google_connected_at TIMESTAMPTZ;

COMMENT ON COLUMN practice_settings.google_refresh_token IS 'OAuth refresh token for practice-wide Google Drive access';
COMMENT ON COLUMN practice_settings.google_connected_at IS 'Timestamp when Google Drive was connected';

-- Migrate existing token from any user profile to practice_settings
-- (Since this is a single-practice app, we just need one token)
UPDATE practice_settings
SET
  google_refresh_token = (
    SELECT google_refresh_token
    FROM profiles
    WHERE google_refresh_token IS NOT NULL
    LIMIT 1
  ),
  google_connected_at = (
    SELECT google_connected_at
    FROM profiles
    WHERE google_refresh_token IS NOT NULL
    LIMIT 1
  )
WHERE google_refresh_token IS NULL;

-- Optional: Clean up per-user tokens (keep columns for now in case needed later)
-- We'll leave the columns in profiles table but won't use them anymore
