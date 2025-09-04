-- 시나리오 테이블에 대한 INSERT/UPDATE 정책 추가
-- 서비스 롤 키를 사용하는 Edge 함수가 데이터를 저장할 수 있도록 허용

-- scenarios 테이블에 INSERT 정책 추가
CREATE POLICY "Allow service role to insert scenarios" 
ON public.scenarios 
FOR INSERT 
WITH CHECK (true);

-- scenarios 테이블에 UPDATE 정책 추가  
CREATE POLICY "Allow service role to update scenarios"
ON public.scenarios 
FOR UPDATE 
USING (true);

-- scenario_options 테이블에 INSERT 정책 추가
CREATE POLICY "Allow service role to insert scenario options"
ON public.scenario_options 
FOR INSERT 
WITH CHECK (true);

-- scenario_options 테이블에 UPDATE 정책 추가
CREATE POLICY "Allow service role to update scenario options"
ON public.scenario_options 
FOR UPDATE 
USING (true);

-- custom_themes 테이블에 INSERT 정책 추가
CREATE POLICY "Allow service role to insert custom themes"
ON public.custom_themes 
FOR INSERT 
WITH CHECK (true);