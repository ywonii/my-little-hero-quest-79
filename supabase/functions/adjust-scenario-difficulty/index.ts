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
    const { scenarios, difficulty } = await req.json();

    console.log('Adjusting scenario difficulty:', { difficulty, scenarioCount: scenarios.length });

    // 난이도별 지침 설정
    const difficultyInstructions = {
      beginner: {
        title: '5-6세 아이가 이해할 수 있는 매우 쉽고 간단한 단어로 5글자 이내의 짧은 제목으로 만드세요.',
        situation: '5-6세 아이가 이해할 수 있는 매우 간단한 문장과 기본 어휘로 작성하세요. 문장은 15글자 이내로 매우 짧고 명확하게 하세요.',
        options: '5-6세 아이가 읽을 수 있는 매우 간단한 단어와 짧은 문장으로 작성하세요. 각 선택지는 8글자 이내로 하세요.'
      },
      advanced: {
        title: '초등학교 저학년이 이해할 수 있는 조금 더 구체적이고 자세한 제목으로 만드세요.',
        situation: '초등학교 저학년 아이의 시점에서 직접 경험하는 것처럼 구체적이고 생생한 상황으로 다시 써주세요. "나는..." 형태로 시작하여 아이가 실제로 그 상황에 있는 것처럼 표현하세요.',
        options: '초등학교 저학년이 실제 상황에서 할 수 있는 구체적이고 현실적인 행동들로 선택지를 만들어주세요.'
      }
    };

    const adjustedScenarios = [];

    for (const scenario of scenarios) {
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
              content: `당신은 경계선 지능 아동을 위한 교육 시나리오의 난이도를 조정하는 전문가입니다. 
              주어진 시나리오를 ${difficulty} 난이도에 맞게 수정해주세요.

              난이도별 지침:
              - 제목: ${difficultyInstructions[difficulty as keyof typeof difficultyInstructions].title}
              - 상황: ${difficultyInstructions[difficulty as keyof typeof difficultyInstructions].situation}
              - 선택지: ${difficultyInstructions[difficulty as keyof typeof difficultyInstructions].options}

              다음 JSON 형식으로 반환해주세요:
              {
                "title": "수정된 제목",
                "situation": "수정된 상황 설명",
                "options": ["수정된 선택지1", "수정된 선택지2", "수정된 선택지3"]
              }` 
            },
            { 
              role: 'user', 
              content: `다음 시나리오를 ${difficulty} 난이도로 조정해주세요:
              
              제목: ${scenario.title}
              상황: ${scenario.situation}
              선택지: ${scenario.options.map((opt: any) => opt.text).join(', ')}` 
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
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
        const adjustedScenario = JSON.parse(responseText);
        
        // 데이터베이스에서 시나리오 업데이트
        const { error: updateError } = await supabase
          .from('scenarios')
          .update({
            title: adjustedScenario.title,
            situation: adjustedScenario.situation
          })
          .eq('id', scenario.id);

        if (updateError) {
          console.error('Error updating scenario:', updateError);
          continue;
        }

        // 선택지 업데이트
        for (let i = 0; i < scenario.options.length; i++) {
          if (adjustedScenario.options[i]) {
            await supabase
              .from('scenario_options')
              .update({
                text: adjustedScenario.options[i]
              })
              .eq('id', scenario.options[i].id);
          }
        }

        adjustedScenarios.push({
          id: scenario.id,
          title: adjustedScenario.title,
          situation: adjustedScenario.situation,
          options: adjustedScenario.options
        });

      } catch (parseError) {
        console.error('Error parsing adjusted scenario:', parseError);
        console.error('Response text:', responseText);
        continue;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      adjustedScenarios,
      count: adjustedScenarios.length,
      difficulty 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in adjust-scenario-difficulty function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});