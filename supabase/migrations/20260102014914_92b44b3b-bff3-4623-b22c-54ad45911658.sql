-- Create user_experience table for XP and spiritual levels
CREATE TABLE public.user_experience (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  level_name TEXT NOT NULL DEFAULT 'Kékeré',
  xp_multiplier DECIMAL NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create daily_goals table for personalized objectives
CREATE TABLE public.daily_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  goal_type TEXT NOT NULL DEFAULT 'items_reviewed',
  target_value INTEGER NOT NULL DEFAULT 10,
  current_value INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  xp_reward INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create challenge_records table for timed challenges
CREATE TABLE public.challenge_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  items_answered INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  time_seconds INTEGER NOT NULL DEFAULT 300,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_experience
CREATE POLICY "Users can view their own experience"
ON public.user_experience FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own experience"
ON public.user_experience FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own experience"
ON public.user_experience FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for daily_goals
CREATE POLICY "Users can view their own goals"
ON public.daily_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
ON public.daily_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON public.daily_goals FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for challenge_records
CREATE POLICY "Users can view their own challenges"
ON public.challenge_records FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges"
ON public.challenge_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at on user_experience
CREATE TRIGGER update_user_experience_updated_at
BEFORE UPDATE ON public.user_experience
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();