-- Add additional columns to existing scenarios table
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'main';
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1;

-- Create custom_themes table for user-generated themes
CREATE TABLE IF NOT EXISTS public.custom_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for custom_themes
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_themes
CREATE POLICY "Anyone can view custom themes" 
ON public.custom_themes 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert custom themes" 
ON public.custom_themes 
FOR INSERT 
WITH CHECK (true);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_session TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user_progress
CREATE POLICY "Anyone can view user progress" 
ON public.user_progress 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert user progress" 
ON public.user_progress 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update user progress" 
ON public.user_progress 
FOR UPDATE 
USING (true);

-- Create wrong_answers table for review system
CREATE TABLE IF NOT EXISTS public.wrong_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_session TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for wrong_answers
ALTER TABLE public.wrong_answers ENABLE ROW LEVEL SECURITY;

-- Create policies for wrong_answers
CREATE POLICY "Anyone can view wrong answers" 
ON public.wrong_answers 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert wrong answers" 
ON public.wrong_answers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update wrong answers" 
ON public.wrong_answers 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete wrong answers" 
ON public.wrong_answers 
FOR DELETE 
USING (true);

-- Create trigger for custom_themes updated_at
CREATE TRIGGER update_custom_themes_updated_at
BEFORE UPDATE ON public.custom_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for wrong_answers updated_at
CREATE TRIGGER update_wrong_answers_updated_at
BEFORE UPDATE ON public.wrong_answers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();