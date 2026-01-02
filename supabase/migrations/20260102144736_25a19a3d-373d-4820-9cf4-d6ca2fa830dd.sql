-- Create storage bucket for user audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-recordings', 'user-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for user recordings bucket
CREATE POLICY "Users can upload their own recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own recordings"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to manage user recordings metadata
CREATE TABLE public.user_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  text_content TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_recordings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_recordings
CREATE POLICY "Users can view their own recordings"
ON public.user_recordings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings"
ON public.user_recordings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
ON public.user_recordings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
ON public.user_recordings FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_recordings_updated_at
BEFORE UPDATE ON public.user_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();