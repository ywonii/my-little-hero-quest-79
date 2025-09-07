import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API Key is not set');
    }

    const { count = 3 } = await req.json().catch(() => ({ count: 3 }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          {
            role: 'system',
            content: `당신은 경계선 지능 아동을 위한 문해력 퀴즈 출제 전문가입니다. 이 퀴즈는 메인 시나리오 게임의 진입장벽을 낮추는 도구로, 난이도 측정만을 위한 간단한 읽기 이해 문제로 구성합니다.

            설계 원칙:
            - 초등학교 1-2학년 수준. 게임 목적과 무관한 어려운 어휘/지문 금지.
            - '상황 이해 및 행동 선택'과 직접 연계된 심화 추론을 요구하지 말고, 짧은 문장 읽기 이해만 확인.
            - 상/중/하(= hard/medium/easy) 3단계 문장 복잡도 규칙을 엄격히 준수.

            문장 복잡도 규칙(예시 포함):
            - easy(하): 1문장, 4~6어절, 연결어/종속절 없음, 단순 동사, '~해요' 체계. 예) "친구와 놀았어요"
            - medium(중): 1문장, 7~11어절, 장소/시간 수식어 1개 허용, 1인칭, 간단 연결어 1개 이내. 예) "나는 친구와 같이 놀이터에서 놀았어요"
            - hard(상): 정확히 2문장, 총 12~18어절, 시간/장소 + 부사 1개 + 이유/배경 1개 허용. 메타 문장 금지. 예) "학교가 끝난 뒤, 나는 친구와 놀이터에서 신나게 놀았어요. 집에 가기 전이라서 더 신났어요."

            금지: '이러한 복잡한 상황에서', '가장 적절한 대응 방법' 등 메타 문구, 해설형 문장, 문제 외 설명.

            문제 형식(JSON 배열):
            [
              {
                "id": 1,
                "question": "문장(레벨 규칙 반영)",
                "options": ["보기1", "보기2", "보기3", "보기4"],
                "correctAnswer": 0,
                "level": "easy" | "medium" | "hard"
              }
            ]

            요구사항:
            - 총 ${Math.max(3, count)}문항, 각 레벨 최소 1문항씩 포함(easy/medium/hard).
            - 오답은 정답과 혼동되지 않게 단순·명확.
            - 반드시 유효한 JSON 배열만 출력. 코드블록/설명 금지.`
          },
          {
            role: 'user',
            content: `문해력 퀴즈 ${Math.max(3, count)}문항을 만들어주세요. easy/medium/hard를 고르게 포함하세요.`
          }
        ]
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content ?? '';
    if (text.includes('```')) {
      text = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    }
    const questions = JSON.parse(text);

    return new Response(JSON.stringify({ success: true, questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

