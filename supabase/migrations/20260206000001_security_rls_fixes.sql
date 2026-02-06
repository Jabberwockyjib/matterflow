-- Fix practice_settings: clients should NOT be able to read practice settings
-- (contains OAuth tokens, webhook keys, etc.)
DROP POLICY IF EXISTS "Staff and client can read practice settings" ON practice_settings;

-- Only staff can read (admin already has ALL policy)
CREATE POLICY "Staff can read practice settings"
  ON practice_settings
  FOR SELECT
  USING (current_user_role() = 'staff'::user_role);

-- Fix intake_responses: split ALL policy into granular INSERT/UPDATE policies
-- The ALL policy with broad with_check is too permissive
DROP POLICY IF EXISTS "intake responses editable by staff/owner" ON intake_responses;

-- Staff/admin can do everything with intake_responses
CREATE POLICY "Staff/admin can manage intake responses"
  ON intake_responses
  FOR ALL
  USING (current_user_role() = ANY (ARRAY['admin'::user_role, 'staff'::user_role]))
  WITH CHECK (current_user_role() = ANY (ARRAY['admin'::user_role, 'staff'::user_role]));

-- Clients can INSERT intake responses only for their own matters
CREATE POLICY "Clients can insert own intake responses"
  ON intake_responses
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT m.client_id FROM matters m WHERE m.id = intake_responses.matter_id
    )
  );

-- Clients can UPDATE their own intake responses (for draft saving)
-- only if status is still 'draft'
CREATE POLICY "Clients can update own draft responses"
  ON intake_responses
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT m.client_id FROM matters m WHERE m.id = intake_responses.matter_id
    )
    AND status = 'draft'
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT m.client_id FROM matters m WHERE m.id = intake_responses.matter_id
    )
  );
