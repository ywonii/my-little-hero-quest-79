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
  // Handle CORS preflight requests
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
      console.error('Supabase URL or Service Role Key is not set');
      throw new Error('Supabase URL or Service Role Key is not set');
    }

    console.log('Environment check passed - API key and Supabase config available');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { theme } = await req.json();

    console.log('Generating scenarios for theme:', theme);

    // 테마별 상황 설명 맵핑
    const themeDescriptions = {
      school: "학교에서 일어날 수 있는 다양한 상황들 (친구 관계, 수업 시간, 선생님과의 소통, 규칙 준수 등)",
      playground: "놀이터에서 일어날 수 있는 다양한 상황들 (놀이기구 사용, 친구들과의 놀이, 안전 수칙, 예의 지키기 등)",
      home: "집에서 일어날 수 있는 다양한 상황들 (가족과의 관계, 집안일 도움, 개인 위생, 책임감 등)",
      community: "동네나 마을에서 일어날 수 있는 다양한 상황들 (이웃과의 관계, 공공 장소 예절, 도움 요청하기 등)"
    };

    const themeDescription = themeDescriptions[theme as keyof typeof themeDescriptions] || theme;

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
            content: `당신은 경계선 지능 아동(5~10세)을 위한 교육 시나리오를 만드는 전문가입니다. 
            주어진 테마에 맞는 현실적이고 교육적인 시나리오 20개를 만들어주세요.
            
            각 시나리오는 다음 조건을 만족해야 합니다:
            1. 아동이 실제로 경험할 수 있는 상황
            2. 명확한 올바른 선택이 있는 상황
            3. 도덕적, 사회적 가치를 배울 수 있는 내용
            
            JSON 형식으로 반환하세요:
            [
              {
                "title": "간단한 상황 제목",
                "situation": "구체적인 상황 설명 (아동 관점에서 이해하기 쉽게)",
                "options": ["첫 번째 선택지", "두 번째 선택지", "세 번째 선택지"],
                "correct_option": 정답 번호 (0, 1, 또는 2)
              }
            ]
            
            반드시 유효한 JSON 배열만 반환하고, 코드 블록이나 추가 설명은 포함하지 마세요.` 
          },
          { 
            role: 'user', 
            content: `다음 테마에 대한 교육 시나리오 20개를 만들어주세요: ${themeDescription}` 
          }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    let responseText = data.choices[0].message.content;

    // GPT가 코드 블록으로 감싸서 응답하는 경우 처리
    if (responseText.includes('```json')) {
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
    } else if (responseText.includes('```')) {
      responseText = responseText.replace(/```\s*/, '').replace(/```\s*$/, '');
    }

    // 앞뒤 공백 제거
    responseText = responseText.trim();

    console.log('Cleaned response text:', responseText);

    const scenarios = JSON.parse(responseText);
    console.log('Generated scenarios:', scenarios);

    // 기존 메인 테마 시나리오 삭제
    await supabase
      .from('scenarios')
      .delete()
      .eq('category', 'main')
      .eq('theme', theme);

    const savedScenarios = [];

    // 생성된 시나리오들을 데이터베이스에 저장
    for (const scenario of scenarios) {
      try {
        // 시나리오 저장
        const { data: scenarioData, error: scenarioError } = await supabase
          .from('scenarios')
          .insert([{
            title: scenario.title,
            situation: scenario.situation,
            category: 'main',
            theme: theme
          }])
          .select()
          .single();

        if (scenarioError) {
          console.error('Error saving scenario:', scenarioError);
          continue;
        }

        console.log('Saved scenario:', scenarioData);

        // 선택지들 저장
        for (let i = 0; i < scenario.options.length; i++) {
          const { error: optionError } = await supabase
            .from('scenario_options')
            .insert([{
              scenario_id: scenarioData.id,
              text: scenario.options[i],
              option_order: i,
              is_correct: i === scenario.correct_option
            }]);

          if (optionError) {
            console.error('Error saving option:', optionError);
          }
        }

        savedScenarios.push(scenarioData);
      } catch (error) {
        console.error('Error processing scenario:', error);
        continue;
      }
    }

    console.log('Successfully saved scenarios:', savedScenarios.length);

    return new Response(JSON.stringify({ 
      success: true, 
      scenarios: savedScenarios,
      count: savedScenarios.length,
      theme 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-main-scenarios function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});