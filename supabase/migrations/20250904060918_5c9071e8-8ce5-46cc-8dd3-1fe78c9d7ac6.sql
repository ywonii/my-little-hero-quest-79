-- Create custom_themes table
CREATE TABLE public.custom_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scenarios table
CREATE TABLE public.scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id UUID REFERENCES public.custom_themes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  situation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scenario_options table
CREATE TABLE public.scenario_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_options ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is educational content)
CREATE POLICY "Anyone can view custom themes" 
ON public.custom_themes 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view scenarios" 
ON public.scenarios 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view scenario options" 
ON public.scenario_options 
FOR SELECT 
USING (true);

-- Insert sample data for testing
INSERT INTO public.custom_themes (name) VALUES ('학교생활');

-- Get the theme ID for sample data
WITH theme AS (
  SELECT id FROM public.custom_themes WHERE name = '학교생활' LIMIT 1
)
INSERT INTO public.scenarios (theme_id, title, situation)
SELECT 
  theme.id,
  '친구와의 갈등',
  '수업 시간에 친구가 내 연필을 가져갔습니다. 어떻게 해야 할까요?'
FROM theme;

-- Insert scenario options
WITH scenario AS (
  SELECT id FROM public.scenarios WHERE title = '친구와의 갈등' LIMIT 1
)
INSERT INTO public.scenario_options (scenario_id, text, is_correct)
SELECT 
  scenario.id,
  '친구에게 정중하게 연필을 돌려달라고 말한다',
  true
FROM scenario
UNION ALL
SELECT 
  scenario.id,
  '친구의 연필을 가져간다',
  false
FROM scenario
UNION ALL
SELECT 
  scenario.id,
  '선생님께 말한다',
  false
FROM scenario;