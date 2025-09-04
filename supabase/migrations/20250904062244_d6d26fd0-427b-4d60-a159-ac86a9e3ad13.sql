-- Create user_progress table for tracking user game progress
CREATE TABLE public.user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_session TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wrong_answers table for tracking incorrect responses
CREATE TABLE public.wrong_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_session TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrong_answers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can manage user progress" 
ON public.user_progress 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can manage wrong answers" 
ON public.wrong_answers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_user_progress_session ON public.user_progress(user_session);
CREATE INDEX idx_wrong_answers_session ON public.wrong_answers(user_session);