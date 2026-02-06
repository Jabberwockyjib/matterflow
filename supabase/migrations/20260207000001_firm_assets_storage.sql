-- Create a public storage bucket for firm assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('firm-assets', 'firm-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to firm assets
CREATE POLICY "Public read access for firm assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'firm-assets');

-- Only admins can upload firm assets
CREATE POLICY "Admin insert access for firm assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'firm-assets'
    AND (SELECT current_user_role()) = 'admin'
  );

-- Only admins can update firm assets
CREATE POLICY "Admin update access for firm assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'firm-assets'
    AND (SELECT current_user_role()) = 'admin'
  );

-- Only admins can delete firm assets
CREATE POLICY "Admin delete access for firm assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'firm-assets'
    AND (SELECT current_user_role()) = 'admin'
  );
