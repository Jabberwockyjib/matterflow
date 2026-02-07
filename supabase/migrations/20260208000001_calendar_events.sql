-- Calendar Events table for Google Calendar integration
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_calendar_event_id TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (event_type IN ('manual','task_due','scheduled_call','deadline','court_date','meeting')),
  color TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending','synced','error','local_only')),
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  google_etag TEXT,
  google_updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX idx_calendar_events_matter_id ON public.calendar_events(matter_id);
CREATE INDEX idx_calendar_events_task_id ON public.calendar_events(task_id);
CREATE INDEX idx_calendar_events_google_id ON public.calendar_events(google_calendar_event_id);
CREATE INDEX idx_calendar_events_pending_sync ON public.calendar_events(sync_status) WHERE sync_status = 'pending';

-- Updated_at trigger (same pattern as existing tables)
CREATE TRIGGER set_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Staff and admin: full access
CREATE POLICY "Staff and admin can manage calendar events"
  ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'staff')
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'staff')
  );

-- Clients: read-only access to events linked to their own matters
CREATE POLICY "Clients can view events for their matters"
  ON public.calendar_events
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'client'
    AND matter_id IN (
      SELECT id FROM public.matters WHERE client_id = auth.uid()
    )
  );

-- Add calendar sync columns to practice_settings
ALTER TABLE public.practice_settings
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_sync_token TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_last_sync TIMESTAMPTZ;
