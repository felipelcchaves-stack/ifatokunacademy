-- Update RLS policy to allow reading 'general' key (which contains platform name and description)
DROP POLICY IF EXISTS "Anyone can read platform_name and platform_description" ON public.platform_settings;

CREATE POLICY "Anyone can read general platform settings" 
ON public.platform_settings 
FOR SELECT 
USING (key = 'general');