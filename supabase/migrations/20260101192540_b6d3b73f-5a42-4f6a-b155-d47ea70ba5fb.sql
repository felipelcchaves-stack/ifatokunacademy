-- Create modules table
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('proficiency', 'thematic')),
  level TEXT CHECK (level IN ('akapo', 'awo', 'oluwo')),
  theme TEXT,
  image_url TEXT,
  color TEXT DEFAULT '#8B5CF6',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercises table with JSONB for flexible content
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reading', 'drag-drop', 'fill-columns', 'flashcard', 'video', 'memorization')),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_media table for uploaded files
CREATE TABLE public.exercise_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('audio', 'image', 'video')),
  url TEXT NOT NULL,
  filename TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_media ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (published content)
CREATE POLICY "Anyone can view published modules" 
ON public.modules FOR SELECT 
USING (is_published = true);

CREATE POLICY "Anyone can view published lessons" 
ON public.lessons FOR SELECT 
USING (is_published = true);

CREATE POLICY "Anyone can view published exercises" 
ON public.exercises FOR SELECT 
USING (is_published = true);

CREATE POLICY "Anyone can view media" 
ON public.exercise_media FOR SELECT 
USING (true);

-- Create policies for admin access (authenticated users can manage all)
CREATE POLICY "Authenticated users can manage modules" 
ON public.modules FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage lessons" 
ON public.lessons FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage exercises" 
ON public.exercises FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage media" 
ON public.exercise_media FOR ALL 
USING (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_modules_updated_at
BEFORE UPDATE ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX idx_exercises_lesson_id ON public.exercises(lesson_id);
CREATE INDEX idx_exercise_media_exercise_id ON public.exercise_media(exercise_id);
CREATE INDEX idx_modules_display_order ON public.modules(display_order);
CREATE INDEX idx_lessons_display_order ON public.lessons(display_order);
CREATE INDEX idx_exercises_display_order ON public.exercises(display_order);

-- Create storage bucket for content media
INSERT INTO storage.buckets (id, name, public) VALUES ('content-media', 'content-media', true);

-- Create storage policies
CREATE POLICY "Anyone can view content media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'content-media');

CREATE POLICY "Authenticated users can upload content media" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'content-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update content media" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'content-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete content media" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'content-media' AND auth.role() = 'authenticated');