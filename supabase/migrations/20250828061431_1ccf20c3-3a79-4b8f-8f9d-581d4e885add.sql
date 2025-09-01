-- Create custom_themes table
CREATE TABLE IF NOT EXISTS public.custom_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scenarios table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  situation TEXT NOT NULL,
  category TEXT DEFAULT 'custom',
  theme TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scenario_options table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.scenario_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  option_order INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.scenario_options(id),
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wrong_answers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wrong_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  correct_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrong_answers ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for now (since there's no auth)
CREATE POLICY IF NOT EXISTS "Allow all operations on custom_themes" ON public.custom_themes FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on scenarios" ON public.scenarios FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on scenario_options" ON public.scenario_options FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on user_progress" ON public.user_progress FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on wrong_answers" ON public.wrong_answers FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scenarios_theme ON public.scenarios(theme);
CREATE INDEX IF NOT EXISTS idx_scenario_options_scenario_id ON public.scenario_options(scenario_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_scenario_id ON public.user_progress(scenario_id);
CREATE INDEX IF NOT EXISTS idx_wrong_answers_scenario_id ON public.wrong_answers(scenario_id);

-- Create trigger for updating timestamps
CREATE TRIGGER IF NOT EXISTS update_custom_themes_updated_at
  BEFORE UPDATE ON public.custom_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_scenarios_updated_at
  BEFORE UPDATE ON public.scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();