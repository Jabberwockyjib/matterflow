-- Gmail sync integration for MatterFlow
-- Adds matter_emails table and gmail sync state columns to profiles

-- =============================================================================
-- 1. Create matter_emails table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.matter_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  thread_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  ai_summary TEXT,
  action_needed BOOLEAN DEFAULT FALSE,
  gmail_date TIMESTAMPTZ NOT NULL,
  gmail_link TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gmail_message_id)
);

-- Add table comment
COMMENT ON TABLE public.matter_emails IS 'Synced email messages linked to matters from Gmail';

-- =============================================================================
-- 2. Create indexes for efficient queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_matter_emails_matter_id ON public.matter_emails(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_emails_gmail_date ON public.matter_emails(gmail_date DESC);
CREATE INDEX IF NOT EXISTS idx_matter_emails_direction ON public.matter_emails(direction);
CREATE INDEX IF NOT EXISTS idx_matter_emails_thread_id ON public.matter_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_matter_emails_action_needed ON public.matter_emails(action_needed) WHERE action_needed = TRUE;

-- =============================================================================
-- 3. Add Gmail sync columns to profiles table
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gmail_sync_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gmail_last_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gmail_history_id TEXT;

-- Add column comments
COMMENT ON COLUMN public.profiles.gmail_sync_enabled IS 'Whether Gmail sync is enabled for this user';
COMMENT ON COLUMN public.profiles.gmail_last_sync IS 'Timestamp of last successful Gmail sync';
COMMENT ON COLUMN public.profiles.gmail_history_id IS 'Gmail history ID for incremental sync';

-- =============================================================================
-- 4. Enable RLS on matter_emails table
-- =============================================================================

ALTER TABLE public.matter_emails ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RLS Policies for matter_emails
-- =============================================================================

-- Staff and admin can view all matter emails
DROP POLICY IF EXISTS "matter_emails_staff_admin_select" ON public.matter_emails;
CREATE POLICY "matter_emails_staff_admin_select"
  ON public.matter_emails FOR SELECT
  USING (
    public.current_user_role() IN ('admin', 'staff')
  );

-- Clients can view emails for their own matters
DROP POLICY IF EXISTS "matter_emails_client_select" ON public.matter_emails;
CREATE POLICY "matter_emails_client_select"
  ON public.matter_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
      AND m.client_id = auth.uid()
    )
  );

-- Staff and admin can insert/update/delete matter emails
DROP POLICY IF EXISTS "matter_emails_staff_admin_all" ON public.matter_emails;
CREATE POLICY "matter_emails_staff_admin_all"
  ON public.matter_emails FOR ALL
  USING (
    public.current_user_role() IN ('admin', 'staff')
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'staff')
  );

-- Service role has full access (for sync operations)
-- Note: Service role bypasses RLS by default, so no explicit policy needed
