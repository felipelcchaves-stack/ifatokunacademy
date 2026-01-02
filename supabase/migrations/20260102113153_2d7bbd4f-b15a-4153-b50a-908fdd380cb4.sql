-- Allow public read access to platform name and description for display purposes
CREATE POLICY "Anyone can read platform_name and platform_description" 
ON public.platform_settings 
FOR SELECT 
USING (key IN ('platform_name', 'platform_description'));