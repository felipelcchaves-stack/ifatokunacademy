-- Add mfa_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;