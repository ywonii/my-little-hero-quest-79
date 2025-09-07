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
      transport: "대중교통(버스/지하철)에서의 상황들 (줄 서기, 자리 양보, 소음/통화, 전자기기 사용 규칙 등)",
      hospital: "병원과 의료기관에서의 상황들 (대기 예절, 의료진 안내 따르기, 검사/치료 시 안전 규칙 등)",
      library: "도서관에서의 상황들 (정숙, 책/공용물품 사용 규칙, 차례 지키기, 장비 사용 예절 등)",
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
            content: `당신은 경계선 지능 아동(초등 1-2학년), 주인공 '지우'를 위한 메인 시나리오 게임 문제 출제 전문가입니다. 주어진 테마에 맞춰 20개의 문제를 생성하세요.

            제작 규칙(모든 항목 필수 준수):
            1) '학교생활에서 어려움을 겪을 만한' 현실 상황일 것. 테마 맥락에 맞춤.
            2) 주인공과 해결자 모두 '지우'이며, '사회문제해결상황'(사회성 향상 자체가 아님)을 다룰 것.
            3) 각 상황에 '규칙 메모'를 포함해 정답이 반박 불가하도록 근거를 명시할 것. 예: [규칙 메모] 복도에서 뛰지 않기 / 줄 새치기 금지 / 전자기기는 수업 시간 사용 금지 등.
            4) 선택지는 모두 '행동'이어야 하며 대화 대사형 표현을 피할 것. (정중한/완곡한 행동 표현은 허용)
            5) 초등 1-2학년 수준의 짧고 쉬운 문장으로 작성.
            6) 선지는 3개(a,b,c)이며, 구조는 '규칙기반 + 사회문제 해결 행동 + 정답 명확' 조합으로 구성.
               - 오답은 정답과 혼동되지 않게 만들 것(비슷하지만 규칙을 어기거나 관계를 해치는 행동 등).
            7) 교우관계 유지를 위해 완곡하고 예의 있는 행동 표현을 사용할 것(예: 순서를 기다린다, 자리로 돌아간다, 양보한다 등).
            8) '새치기', '전자기기 사용' 같이 정확한 규칙이 있는 주제를 여러 개 포함할 것.
            9) 선생님께 혼나는 장면만 반복하지 말고 다양한 문제상황을 포함할 것(줄/차례, 공유물 사용, 안전, 배려 등).
            10) 정답 유형을 다양화(사과하기만 반복 금지). 단, 여전히 '행동'으로 표현.
            11) 각 항목의 필드만 반환(title, situation, options, correct_option). 추가 필드 금지.
            12) 반드시 JSON 배열만 반환. 코드 블록, 설명, 번호 매기기 금지.

            출력 포맷(JSON 배열 요소 예):
            {
              "title": "간단한 상황 제목",
              "situation": "지우가 처한 구체 상황. 마지막에 [규칙 메모] ... 를 포함",
              "options": ["a선지(행동)", "b선지(행동)", "c선지(행동)"],
              "correct_option": 0 | 1 | 2
            }`
          },
          { 
            role: 'user', 
            content: `테마: ${themeDescription}. 위 규칙을 지켜 20개의 문제를 만들어주세요.` 
          }
        ],
        max_tokens: 4000,
        temperature: 0.2,
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

    const savedScenarios: any[] = [];

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