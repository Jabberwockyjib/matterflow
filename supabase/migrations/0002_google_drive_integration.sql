-- Google Drive integration schema

-- Add Google refresh token to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_connected_at TIMESTAMPTZ;

-- Create matter_folders table for storing Drive folder metadata
CREATE TABLE IF NOT EXISTS public.matter_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  client_folder_id TEXT NOT NULL,
  matter_folder_id TEXT NOT NULL,
  folder_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(matter_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_matter_folders_matter ON public.matter_folders(matter_id);
CREATE INDEX IF NOT EXISTS idx_profiles_google_connected ON public.profiles(google_connected_at) WHERE google_refresh_token IS NOT NULL;

-- Update documents table with additional fields
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS web_view_link TEXT;

-- RLS policies for matter_folders
ALTER TABLE public.matter_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matter_folders follow matter visibility"
  ON public.matter_folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
      AND (
        m.owner_id = auth.uid()
        OR m.client_id = auth.uid()
        OR current_user_role() IN ('admin', 'staff')
      )
    )
  );

CREATE POLICY "matter_folders editable by staff/owner"
  ON public.matter_folders FOR ALL
  USING (
    current_user_role() IN ('admin', 'staff')
    OR auth.uid() IN (
      SELECT owner_id FROM public.matters WHERE id = matter_id
    )
  )
  WITH CHECK (
    current_user_role() IN ('admin', 'staff')
    OR auth.uid() IN (
      SELECT owner_id FROM public.matters WHERE id = matter_id
    )
  );

-- Add comment
COMMENT ON TABLE public.matter_folders IS 'Stores Google Drive folder IDs and structure for each matter';
COMMENT ON COLUMN public.profiles.google_refresh_token IS 'Encrypted Google OAuth refresh token for Drive access';
