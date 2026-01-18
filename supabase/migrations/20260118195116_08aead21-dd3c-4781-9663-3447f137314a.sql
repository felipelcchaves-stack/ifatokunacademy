-- Table to store interpretation exercise responses
CREATE TABLE interpretation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id),
  lesson_id UUID REFERENCES lessons(id),
  
  -- Counsels written by the student (array of {text, ranking, feedback, isRelevant, category})
  counsels JSONB NOT NULL DEFAULT '[]',
  
  -- General statistics
  total_counsels INTEGER NOT NULL DEFAULT 0,
  relevant_counsels INTEGER NOT NULL DEFAULT 0,
  average_ranking DECIMAL(3,2) DEFAULT 0.00,
  
  -- Metadata
  original_text TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE interpretation_responses ENABLE ROW LEVEL SECURITY;

-- Users can view their own responses
CREATE POLICY "Users can view own interpretation responses"
ON interpretation_responses FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own responses
CREATE POLICY "Users can insert own interpretation responses"
ON interpretation_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own responses
CREATE POLICY "Users can update own interpretation responses"
ON interpretation_responses FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all responses
CREATE POLICY "Admins can view all interpretation responses"
ON interpretation_responses FOR SELECT
USING (public.is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_interpretation_responses_user_id ON interpretation_responses(user_id);
CREATE INDEX idx_interpretation_responses_exercise_id ON interpretation_responses(exercise_id);

-- Trigger for updated_at
CREATE TRIGGER update_interpretation_responses_updated_at
BEFORE UPDATE ON interpretation_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();