-- Fix overly permissive WITH CHECK(true) on intake_responses
-- Previously any user passing the USING clause could write arbitrary data.
-- Now the WITH CHECK enforces the same conditions as USING.

DROP POLICY IF EXISTS "intake responses editable by staff/owner" ON public.intake_responses;

CREATE POLICY "intake responses editable by staff/owner"
  ON public.intake_responses FOR ALL
  USING (
    current_user_role() IN ('admin', 'staff')
    OR auth.uid() IN (
      SELECT client_id FROM public.matters WHERE matters.id = intake_responses.matter_id
    )
  )
  WITH CHECK (
    current_user_role() IN ('admin', 'staff')
    OR auth.uid() IN (
      SELECT client_id FROM public.matters WHERE matters.id = intake_responses.matter_id
    )
  );
