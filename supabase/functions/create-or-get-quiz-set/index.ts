import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 타입
type Difficulty = "하"|"중"|"상"|"혼합";
type QuizItem = { title: string; situation: string; options: string[]; correct_option: 0|1|2; };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// 간단 난수기(시드 고정) – 같은 seed이면 같은 결과
function mulberry32(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// 난이도 문장 규칙
function levelize(base: { who: string; place?: string; time?: string; action: string; rule: string; }, level: Difficulty): string {
  const W = base.who || "지우";
  const P = base.place ? `${base.place}` : "";
  const T = base.time ? `${base.time}` : "";
  if (level === "하") {
    const core = P ? `${W}가 ${P}에서 ${base.action}어요.` : `${W}가 ${base.action}어요.`;
    return `${core} [규칙 메모] ${base.rule}`;
  }
  if (level === "중") {
    const when = T ? `${T}에 ` : "";
    const where = P ? `${P}에서 ` : "";
    return `${when}${W}가 ${where}${base.action}었어요. [규칙 메모] ${base.rule}`;
  }
  return `${T ? `${T}에 ` : ""}${W}는 ${P ? `${P}에서 ` : ""}서둘러 ${base.action}었어요. 안전을 위해 규칙을 지켜요. [규칙 메모] ${base.rule}`;
}

const TEMPLATES = [
  { title:"복도에서 뛰었을 때", base:{ who:"지우", place:"복도", action:"달렸", rule:"복도에서 뛰지 않기" },
    options:["천천히 걸어간다","더 빨리 달린다","벽을 짚고 달린다"], correct:0 as 0 },
  { title:"급식 줄 새치기", base:{ who:"지우", place:"급식실", action:"앞에 섰", rule:"줄 새치기 금지" },
    options:["자기 자리로 돌아가 줄을 선다","앞에서 그대로 기다린다","옆으로 가서 먼저 받는다"], correct:0 as 0 },
  { title:"수업 중 전자기기", base:{ who:"지우", place:"", action:"폰을 켰", rule:"수업 시간 전자기기 사용 금지" },
    options:["폰을 꺼서 가방에 넣는다","몰래 계속 본다","친구와 같이 본다"], correct:0 as 0 },
  { title:"공유 색연필 사용", base:{ who:"지우", place:"미술실", action:"친구 것부터 집었", rule:"공유물은 차례대로 사용" },
    options:["순서를 기다려 사용한다","먼저 가져가 계속 쓴다","숨겨 두고 혼자 쓴다"], correct:0 as 0 },
  { title:"도서관 소음", base:{ who:"지우", place:"도서관", action:"큰 소리로 움직였", rule:"도서관에서는 조용히 하기" },
    options:["발을 천천히 옮긴다","의자를 세게 끈다","책상을 두드린다"], correct:0 as 0 },
  { title:"운동장 공 안전", base:{ who:"지우", place:"운동장", action:"공을 사람 쪽으로 찼", rule:"사람을 향해 공 차지 않기" },
    options:["빈 공간으로 공을 찬다","친구 쪽으로 세게 찬다","창문 쪽으로 찬다"], correct:0 as 0 },
];

function pick<T>(rng:()=>number, arr:T[]) { return arr[Math.floor(rng()*arr.length)] as T; }
function pickLevel(rng:()=>number, d: Difficulty): Difficulty {
  return d === "혼합" ? pick(rng, ["하","중","상"] as Difficulty[]) : d;
}

function makeDeterministicQuiz(theme:string, count:number, difficulty:Difficulty, seed:string): QuizItem[] {
  const rng = mulberry32(`${theme}|${difficulty}|${count}|${seed}`);
  const items: QuizItem[] = [];
  for (let i=0;i<count;i++){
    const t = TEMPLATES[i % TEMPLATES.length];
    const lvl = pickLevel(rng, difficulty);
    const titled = theme?.trim() ? `${t.title} (${theme})` : t.title;
    items.push({
      title: titled,
      situation: levelize(t.base, lvl),
      options: t.options,
      correct_option: t.correct
    });
  }
  return items;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }
  try {
    const { theme="", difficulty="혼합", count=20, seed="default", version=1 } = await req.json();

    // 1) 이미 존재하면 그 세트와 문제 반환
    const { data: existingSet } = await supabase
      .from("quiz_sets")
      .select("*")
      .eq("theme", theme).eq("difficulty", difficulty)
      .eq("count", count).eq("seed", seed).eq("version", version)
      .maybeSingle();

    if (existingSet) {
      const { data: q } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_set_id", existingSet.id)
        .order("idx", { ascending: true });
      return new Response(JSON.stringify({ quiz_set: existingSet, questions: q ?? [] }), { headers: { "Content-Type":"application/json" } });
    }

    // 2) 없으면 생성 → 저장 → 반환 (시드 기반 결정적 생성)
    const quiz = makeDeterministicQuiz(theme, count, difficulty as Difficulty, seed);

    const { data: newSet, error: setErr } = await supabase
      .from("quiz_sets")
      .insert({ theme, difficulty, count, seed, version, published: true })
      .select("*")
      .single();
    if (setErr) throw setErr;

    const rows = quiz.map((q, idx) => ({
      quiz_set_id: newSet.id, idx, title: q.title,
      situation: q.situation, options: q.options, correct_option: q.correct_option
    }));

    const { error: insErr } = await supabase.from("quiz_questions").insert(rows);
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ quiz_set: newSet, questions: rows }), { headers: { "Content-Type":"application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

