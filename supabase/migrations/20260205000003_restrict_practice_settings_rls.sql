-- Create a secure function to read practice_settings without sensitive fields
-- Staff/client can still read the row via existing RLS policy, but application
-- code for non-admin views should use this function to avoid exposing tokens.

CREATE OR REPLACE FUNCTION public.get_practice_settings_safe()
RETURNS TABLE (
  id uuid,
  firm_name text,
  contact_email text,
  contact_phone text,
  address text,
  default_hourly_rate numeric,
  payment_terms_days integer,
  late_fee_percentage numeric,
  auto_reminders_enabled boolean,
  matter_types jsonb,
  google_connected_at timestamptz,
  google_connected_email text,
  square_connected_at text,
  square_location_name text,
  square_environment text
) AS $$
  SELECT
    ps.id, ps.firm_name, ps.contact_email, ps.contact_phone, ps.address,
    ps.default_hourly_rate, ps.payment_terms_days, ps.late_fee_percentage,
    ps.auto_reminders_enabled, ps.matter_types,
    ps.google_connected_at, ps.google_connected_email,
    ps.square_connected_at, ps.square_location_name, ps.square_environment
  FROM public.practice_settings ps
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_practice_settings_safe() IS 'Returns practice settings without sensitive fields (tokens, keys). Use for non-admin UI.';
