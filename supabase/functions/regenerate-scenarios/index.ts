import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API Key is not set');
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Service Role Key is not set');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Starting scenario regeneration...');

    // 다양한 테마의 시나리오 생성
    const themes = [
      { name: '학교', theme: 'school', description: '학교에서 일어나는 상황들' },
      { name: '놀이터', theme: 'playground', description: '놀이터에서의 안전과 친구관계' },
      { name: '가정', theme: 'home', description: '집에서 가족과의 상황들' },
      { name: '마트', theme: 'store', description: '마트나 상점에서의 예의와 안전' },
      { name: '교통', theme: 'traffic', description: '길에서의 교통안전과 예의' }
    ];

    const allScenarios = [];

    for (const themeInfo of themes) {
      console.log(`Generating scenarios for theme: ${themeInfo.name}`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `당신은 경계선 지능 아동을 위한 교육 시나리오를 만드는 전문가입니다. 
              ${themeInfo.description}에 대한 5개의 교육적 시나리오를 만들어주세요.
              
              각 시나리오는:
              1. 아이들이 실제로 마주할 수 있는 상황
              2. 올바른 판단과 행동을 기를 수 있는 내용
              3. 초등학교 저학년이 이해할 수 있는 수준
              
              JSON 형식으로 반환해주세요:
              [
                {
                  "title": "간단한 제목",
                  "situation": "상황 설명 (50자 이내)",
                  "options": ["선택지1", "선택지2", "선택지3"],
                  "correct_option": 0
                }
              ]` 
            },
            { 
              role: 'user', 
              content: `${themeInfo.description}과 관련된 교육적 시나리오 5개를 만들어주세요.` 
            }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      let responseText = data.choices[0].message.content;

      // JSON 파싱을 위한 정리
      if (responseText.includes('```json')) {
        responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (responseText.includes('```')) {
        responseText = responseText.replace(/```\s*/, '').replace(/```\s*$/, '');
      }

      responseText = responseText.trim();

      try {
        const scenarios = JSON.parse(responseText);
        
        // 테마 생성 또는 가져오기
        const { data: existingTheme } = await supabase
          .from('custom_themes')
          .select('id')
          .eq('name', themeInfo.name)
          .single();

        let themeId;
        if (existingTheme) {
          themeId = existingTheme.id;
        } else {
          const { data: newTheme, error: themeError } = await supabase
            .from('custom_themes')
            .insert([{ name: themeInfo.name }])
            .select('id')
            .single();

          if (themeError) {
            console.error('Error creating theme:', themeError);
            continue;
          }
          themeId = newTheme.id;
        }

        // 시나리오 저장
        for (const scenario of scenarios) {
          const { data: savedScenario, error: scenarioError } = await supabase
            .from('scenarios')
            .insert([{
              theme_id: themeId,
              title: scenario.title,
              situation: scenario.situation,
              category: 'main',
              theme: themeInfo.theme
            }])
            .select('id')
            .single();

          if (scenarioError) {
            console.error('Error saving scenario:', scenarioError);
            continue;
          }

          // 선택지 저장
          for (let i = 0; i < scenario.options.length; i++) {
            await supabase
              .from('scenario_options')
              .insert([{
                scenario_id: savedScenario.id,
                text: scenario.options[i],
                is_correct: i === scenario.correct_option,
                option_order: i + 1
              }]);
          }

          allScenarios.push({
            theme: themeInfo.name,
            title: scenario.title,
            situation: scenario.situation,
            options: scenario.options
          });
        }

      } catch (parseError) {
        console.error('Error parsing scenarios:', parseError);
        console.error('Response text:', responseText);
        continue;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      scenarios: allScenarios,
      count: allScenarios.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regenerate-scenarios function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});