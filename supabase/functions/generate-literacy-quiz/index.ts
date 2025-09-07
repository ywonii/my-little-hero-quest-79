// deno deploy 환경(Edge Function)
// supabase/functions/generate-literacy-quiz/index.ts
// 요청: { theme?: string; count?: number; difficulty?: "하"|"중"|"상"|"혼합" }
// 응답: [{ title, situation, options, correct_option }] 의 배열
// 실패 시 400/500 반환

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type Difficulty = "하" | "중" | "상" | "혼합";
type QuizItem = {
  title: string;
  situation: string; // 단일 문자열(선택 난이도로 생성)
  options: string[];
  correct_option: 0 | 1 | 2;
};

// 난이도별 문장 규칙 적용기
function levelize(base: {
  who: string; place?: string; time?: string; action: string; rule: string;
}, level: Difficulty): string {
  // 문해력 규칙:
  // 하: 1문장, 4~6어절, 단순 동사
  // 중: 1문장, 7~11어절, 장소/시간 수식어 1, 연결어 최대 1
  // 상: 1~2문장, 12~18어절, 시간/장소 + 부사 1 + 이유/배경 1
  const W = base.who || "지우";
  const P = base.place ? `${base.place}` : "";
  const T = base.time ? `${base.time}` : "";

  if (level === "하") {
    // 예: "지우가 복도에서 달렸어요. [규칙 메모] 복도에서 뛰지 않기"
    const core = P ? `${W}가 ${P}에서 ${base.action}어요.` : `${W}가 ${base.action}어요.`;
    return `${core} [규칙 메모] ${base.rule}`;
  }

  if (level === "중") {
    // 예: "쉬는 시간에 지우가 복도에서 급하게 달렸어요. [규칙 메모] 복도에서 뛰지 않기"
    const when = T ? `${T}에 ` : "";
    const where = P ? `${P}에서 ` : "";
    return `${when}${W}가 ${where}${base.action}었어요. [규칙 메모] ${base.rule}`;
  }

  // 상
  // 예: "쉬는 시간에 지우는 복도에서 서둘러 달렸어요. 안전을 위해 복도에서는 천천히 걷기. [규칙 메모] 복도에서 뛰지 않기"
  const when2 = T ? `${T}에 ` : "";
  const where2 = P ? `${P}에서 ` : "";
  return `${when2}${W}는 ${where2}서둘러 ${base.action}었어요. 안전을 위해 규칙을 지켜요. [규칙 메모] ${base.rule}`;
}

// 공통 템플릿(테마와 무관하게 학교생활 규칙이 뚜렷한 유형들)
const TEMPLATES = [
  {
    title: "복도에서 뛰었을 때",
    base: { who: "지우", place: "복도", action: "달렸", rule: "복도에서 뛰지 않기" },
    options: ["천천히 걸어간다", "더 빨리 달린다", "벽을 짚고 달린다"],
    correct: 0 as 0
  },
  {
    title: "급식 줄 새치기",
    base: { who: "지우", place: "급식실", action: "앞에 섰", rule: "줄 새치기 금지" },
    options: ["자기 자리로 돌아가 줄을 선다", "앞에서 그대로 기다린다", "옆으로 가서 먼저 받는다"],
    correct: 0 as 0
  },
  {
    title: "수업 중 전자기기",
    base: { who: "지우", place: "", action: "폰을 켰", rule: "수업 시간 전자기기 사용 금지" },
    options: ["폰을 꺼서 가방에 넣는다", "몰래 계속 본다", "친구와 같이 본다"],
    correct: 0 as 0
  },
  {
    title: "공유 색연필 사용",
    base: { who: "지우", place: "미술실", action: "친구 것부터 집었", rule: "공유물은 차례대로 사용" },
    options: ["순서를 기다려 사용한다", "먼저 가져가 계속 쓴다", "숨겨 두고 혼자 쓴다"],
    correct: 0 as 0
  },
  {
    title: "교실 바닥 물 웅덩이",
    base: { who: "지우", place: "교실", action: "젖은 바닥을 밟았", rule: "미끄럼 위험 지역 피하기" },
    options: ["피해서 천천히 걷는다", "뛰어서 빨리 지나간다", "장난으로 발을 구른다"],
    correct: 0 as 0
  },
  {
    title: "도서관 소음",
    base: { who: "지우", place: "도서관", action: "큰 소리로 움직였", rule: "도서관에서는 조용히 하기" },
    options: ["발을 천천히 옮긴다", "의자를 세게 끈다", "책상을 두드린다"],
    correct: 0 as 0
  },
  {
    title: "운동장 공 안전",
    base: { who: "지우", place: "운동장", action: "공을 사람 쪽으로 찼", rule: "사람을 향해 공 차지 않기" },
    options: ["빈 공간으로 공을 찬다", "친구 쪽으로 세게 찬다", "창문 쪽으로 찬다"],
    correct: 0 as 0
  },
  {
    title: "과학실 장비 다루기",
    base: { who: "지우", place: "과학실", action: "기구를 함부로 흔들었", rule: "실험기구는 정해진 방법으로 사용" },
    options: ["제자리에 두고 기다린다", "계속 흔들며 만진다", "책상 끝에 걸쳐 둔다"],
    correct: 0 as 0
  },
  {
    title: "쓰레기 분리배출",
    base: { who: "지우", place: "복도", action: "아무 통에 넣었", rule: "분리수거 표시에 맞게 버리기" },
    options: ["표시를 보고 맞는 통에 버린다", "가까운 통에 아무거나 버린다", "바닥에 두고 간다"],
    correct: 0 as 0
  },
  {
    title: "교실 자리 이동",
    base: { who: "지우", place: "교실", action: "수업 중 자리를 옮겼", rule: "수업 중에는 정해진 자리에 앉기" },
    options: ["원래 자리로 돌아간다", "친구 자리로 계속 간다", "뒤쪽에 서서 논다"],
    correct: 0 as 0
  }
];

// 테마 반영(선택): theme 키워드가 들어오면, title을 살짝 변형하거나 place를 조정할 수 있음
function applyTheme(title: string, theme?: string) {
  if (!theme || theme.trim().length === 0) return title;
  return `${title} (${theme})`;
}

function pickLevel(difficulty: Difficulty): Difficulty {
  if (difficulty === "혼합") {
    const arr: Difficulty[] = ["하", "중", "상"];
    return arr[Math.floor(Math.random() * 3)];
  }
  return difficulty;
}

function makeQuiz(theme?: string, count = 10, difficulty: Difficulty = "혼합"): QuizItem[] {
  const items: QuizItem[] = [];
  for (let i = 0; i < count; i++) {
    const t = TEMPLATES[i % TEMPLATES.length];
    const level = pickLevel(difficulty);
    items.push({
      title: applyTheme(t.title, theme),
      situation: levelize(t.base, level),
      options: t.options,
      correct_option: t.correct
    });
  }
  return items;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
    }
    const body = await req.json().catch(() => ({}));
    const theme = (body?.theme ?? "") as string;
    const count = Math.max(1, Math.min(50, Number(body?.count ?? 20)));
    const difficulty: Difficulty = (body?.difficulty ?? "혼합") as Difficulty;

    const result = makeQuiz(theme, count, difficulty);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

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

