-- Add Square OAuth fields to practice_settings
ALTER TABLE practice_settings
  ADD COLUMN IF NOT EXISTS square_access_token TEXT,
  ADD COLUMN IF NOT EXISTS square_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS square_merchant_id TEXT,
  ADD COLUMN IF NOT EXISTS square_location_id TEXT,
  ADD COLUMN IF NOT EXISTS square_location_name TEXT,
  ADD COLUMN IF NOT EXISTS square_environment TEXT DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS square_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS square_webhook_signature_key TEXT,
  ADD COLUMN IF NOT EXISTS square_application_id TEXT,
  ADD COLUMN IF NOT EXISTS square_application_secret TEXT;

COMMENT ON COLUMN practice_settings.square_access_token IS 'OAuth access token for Square API calls';
COMMENT ON COLUMN practice_settings.square_refresh_token IS 'OAuth refresh token to obtain new access tokens';
COMMENT ON COLUMN practice_settings.square_merchant_id IS 'Square merchant ID for the connected account';
COMMENT ON COLUMN practice_settings.square_location_id IS 'Square location ID for invoice operations';
COMMENT ON COLUMN practice_settings.square_location_name IS 'Human-readable location name for display';
COMMENT ON COLUMN practice_settings.square_environment IS 'sandbox or production';
COMMENT ON COLUMN practice_settings.square_connected_at IS 'When Square was connected via OAuth';
COMMENT ON COLUMN practice_settings.square_webhook_signature_key IS 'Webhook signature key for verification';
COMMENT ON COLUMN practice_settings.square_application_id IS 'Custom Square app client ID (optional)';
COMMENT ON COLUMN practice_settings.square_application_secret IS 'Custom Square app secret (optional)';
