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
      console.error('OPENAI_API_KEY environment variable is not set');
      throw new Error('OpenAI API Key is not set');
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Service Role Key is not set');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { scenarios, difficulty } = await req.json();

    console.log('Adjusting scenario difficulty:', { difficulty, scenarioCount: scenarios.length });

    // 난이도별 지침 설정 (문해력 스케일 반영)
    const difficultyInstructions = {
      beginner: {
        title: '아주 쉬운 단어, 4~6글자 수준의 매우 짧은 제목으로 만드세요.',
        situation: '1문장, 4~6어절, 연결어/종속절 없음, 단순 동사 사용. 예: "친구와 놀았어요"',
        options: '각 선택지는 행동 중심, 3~6어절, 단문. 예: "차례를 지킨다", "자리에 앉는다"'
      },
      intermediate: {
        title: '간단·명확한 제목, 핵심 명사+동사 2~3개까지 허용.',
        situation: '1문장, 7~11어절, 장소/시간 수식어 1개 허용, 단순 연결어 1개 이내. 예: "나는 친구와 같이 놀이터에서 놀았어요"',
        options: '행동 중심, 5~9어절, 완곡한 표현 허용. 예: "차례를 기다리고 순서를 지킨다"'
      },
      advanced: {
        title: '조금 더 구체적이고 상황이 드러나는 제목.',
        situation: '정확히 2문장, 총 12~18어절, 시간/장소 + 부사 1개 + 이유/배경 1개 허용. 반드시 2문장으로 작성.',
        options: '행동 중심, 구체 단계 포함 가능(준비→행동). 길이는 7~12어절.'
      }
    } as const;

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

              추가 규칙:
              - 선택지는 반드시 '행동'이어야 하며, 정답은 규칙 준수에 근거해 명확해야 합니다.
              - 오답은 정답과 혼동되지 않도록 규칙 위반/관계 훼손 요소를 포함하되 과도한 표현은 지양합니다.
              - 문장은 해당 난이도의 어절·수식어 제한을 반드시 지키세요.
              - 상급에서도 '이러한 복잡한 상황에서...', '가장 적절한 대응 방법...' 같은 메타 문장은 금지합니다. 내용(사실/상황)은 동일하게 유지하되 문장 구조(수식어/절/부사)만 복잡도를 조정하세요.

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