-- Create table to store detailed error statistics
CREATE TABLE public.review_error_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    spaced_item_id UUID REFERENCES public.spaced_repetition_items(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
    
    -- Error type counts
    accent_errors INTEGER NOT NULL DEFAULT 0,
    word_swap_errors INTEGER NOT NULL DEFAULT 0,
    omission_errors INTEGER NOT NULL DEFAULT 0,
    insertion_errors INTEGER NOT NULL DEFAULT 0,
    other_errors INTEGER NOT NULL DEFAULT 0,
    
    -- Review metadata
    review_count INTEGER NOT NULL DEFAULT 0,
    last_review_at TIMESTAMP WITH TIME ZONE,
    
    -- Original and typed text for analysis (last error)
    original_text TEXT,
    last_typed_text TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_review_error_stats_user_id ON public.review_error_stats(user_id);
CREATE INDEX idx_review_error_stats_module_id ON public.review_error_stats(module_id);

-- Enable RLS
ALTER TABLE public.review_error_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own error stats
CREATE POLICY "Users can view their own error stats"
ON public.review_error_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own error stats"
ON public.review_error_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own error stats"
ON public.review_error_stats
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own error stats"
ON public.review_error_stats
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_review_error_stats_updated_at
BEFORE UPDATE ON public.review_error_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();