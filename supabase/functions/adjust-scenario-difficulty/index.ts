import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = 'https://xufneikpvakgomsncqsp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1Zm5laWtwdmFrZ29tc25jcXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMjkyOTUsImV4cCI6MjA3MDkwNTI5NX0.klkp0MzI6ZnEiVuW8tgydZNzszJ_NYJTOzmBWAgUQ20';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API Key is not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { scenarios, difficulty } = await req.json();

    console.log('Adjusting scenario difficulty:', { difficulty, scenarioCount: scenarios.length });

    // 난이도별 지침 설정
    const difficultyInstructions = {
      beginner: {
        title: '초등학교 1학년 수준으로 매우 쉽고 간단한 단어를 사용하여 5글자 이내의 짧은 제목으로 만드세요.',
        situation: '초등학교 1학년이 이해할 수 있는 매우 간단한 문장과 기본 어휘로 작성하세요. 문장은 20글자 이내로 짧고 명확하게 하세요.',
        options: '초등학교 1학년이 읽을 수 있는 매우 간단한 단어와 짧은 문장으로 작성하세요. 각 선택지는 10글자 이내로 하세요.'
      },
      intermediate: {
        title: '초등학교 2학년 수준의 어휘를 사용하여 적절한 길이의 제목으로 만드세요.',
        situation: '초등학교 2학년이 이해할 수 있는 기본 어휘와 문장 구조를 사용하세요. 문장은 적당한 길이로 명확하게 표현하세요.',
        options: '초등학교 2학년이 읽을 수 있는 기본 어휘로 작성하세요. 각 선택지는 적절한 길이로 하세요.'
      },
      advanced: {
        title: '초등학교 3학년 수준의 조금 더 복잡한 어휘를 사용하여 구체적인 제목으로 만드세요.',
        situation: '초등학교 3학년이 이해할 수 있는 다양한 어휘와 복합 문장을 사용하여 상황을 자세히 설명하세요.',
        options: '초등학교 3학년 수준의 어휘와 문장을 사용하여 구체적으로 작성하세요.'
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