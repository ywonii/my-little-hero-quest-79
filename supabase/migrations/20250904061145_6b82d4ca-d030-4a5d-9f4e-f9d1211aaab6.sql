-- Add missing columns to match frontend queries
ALTER TABLE public.scenario_options
  ADD COLUMN IF NOT EXISTS option_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT;

-- Index to speed up filters by category/theme
CREATE INDEX IF NOT EXISTS idx_scenarios_category_theme ON public.scenarios(category, theme);

-- Populate existing sample scenario with expected fields
UPDATE public.scenarios
SET category = COALESCE(category, 'main'),
    theme = COALESCE(theme, 'school')
WHERE title = '친구와의 갈등';

-- Set option_order for existing options of the sample scenario
WITH target_scenario AS (
  SELECT id FROM public.scenarios WHERE title = '친구와의 갈등' LIMIT 1
), numbered AS (
  SELECT o.id, row_number() OVER (ORDER BY o.created_at, o.id) AS rn
  FROM public.scenario_options o
  JOIN target_scenario ts ON o.scenario_id = ts.id
)
UPDATE public.scenario_options o
SET option_order = n.rn
FROM numbered n
WHERE o.id = n.id;

-- Insert an additional sample scenario for theme=playground to satisfy current UI filter
WITH theme_row AS (
  SELECT id FROM public.custom_themes LIMIT 1
)
INSERT INTO public.scenarios (theme_id, title, situation, category, theme)
SELECT id, '놀이터 안전', '놀이터에서 친구가 미끄럼틀 아래에 서 있어요. 어떻게 해야 할까요?', 'main', 'playground'
FROM theme_row
ON CONFLICT DO NOTHING;

-- Insert options with explicit option_order for the new scenario
WITH sc AS (
  SELECT id FROM public.scenarios WHERE title = '놀이터 안전' LIMIT 1
)
INSERT INTO public.scenario_options (scenario_id, text, is_correct, option_order)
SELECT sc.id, '친구에게 비켜달라고 말한 뒤 내려온다', true, 1 FROM sc
UNION ALL SELECT sc.id, '그냥 빠르게 내려간다', false, 2 FROM sc
UNION ALL SELECT sc.id, '미끄럼틀을 거꾸로 올라간다', false, 3 FROM sc
ON CONFLICT DO NOTHING;