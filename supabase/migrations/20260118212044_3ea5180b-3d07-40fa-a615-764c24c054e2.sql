-- Create storage bucket for organization branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for organization-assets bucket
-- Allow authenticated users to view all organization assets (public bucket)
CREATE POLICY "Anyone can view organization assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-assets');

-- Allow admins to upload organization assets
CREATE POLICY "Admins can upload organization assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organization-assets' 
  AND EXISTS (
    SELECT 1 FROM admin_emails WHERE email = auth.jwt()->>'email'
  )
);

-- Allow admins to update organization assets
CREATE POLICY "Admins can update organization assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organization-assets' 
  AND EXISTS (
    SELECT 1 FROM admin_emails WHERE email = auth.jwt()->>'email'
  )
);

-- Allow admins to delete organization assets
CREATE POLICY "Admins can delete organization assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organization-assets' 
  AND EXISTS (
    SELECT 1 FROM admin_emails WHERE email = auth.jwt()->>'email'
  )
);