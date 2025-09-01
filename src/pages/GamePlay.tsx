import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Star, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Scenario {
  id: string;
  title: string;
  situation: string;
  options: {
    id: string;
    text: string;
    option_order: number;
    is_correct: boolean;
  }[];
}

const GamePlay = () => {
  const navigate = useNavigate();
  const { theme } = useParams<{ theme: string }>();
  const { toast } = useToast();
  
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  // 세션 ID 생성 (임시로 timestamp 사용)
  const userSession = `session_${Date.now()}`;

  useEffect(() => {
    // localStorage에서 난이도 설정 확인
    const savedLevel = localStorage.getItem('literacyLevel') as 'beginner' | 'intermediate' | 'advanced';
    console.log('📚 Saved literacy level from localStorage:', savedLevel);
    if (savedLevel && savedLevel !== difficultyLevel) {
      setDifficultyLevel(savedLevel);
      console.log('📚 Setting difficulty level to:', savedLevel);
    }
  }, [theme]); // difficultyLevel 제거

  useEffect(() => {
    console.log('📚 Difficulty level changed, reloading scenarios:', difficultyLevel);
    loadScenarios();
  }, [difficultyLevel]); // 별도 useEffect로 분리

  const adjustScenariosDifficulty = (scenarios: Scenario[]) => {
    return scenarios.map(scenario => {
      const adjustedTitle = adjustTextByDifficulty(scenario.title, 'title');
      const adjustedSituation = adjustTextByDifficulty(scenario.situation, 'situation');
      const adjustedOptions = scenario.options.map(option => ({
        ...option,
        text: adjustTextByDifficulty(option.text, 'option')
      }));

      return {
        ...scenario,
        title: adjustedTitle,
        situation: adjustedSituation,
        options: adjustedOptions
      };
    });
  };

  const adjustTextByDifficulty = (text: string, type: 'title' | 'situation' | 'option') => {
    console.log(`🔧 Adjusting ${type} for difficulty ${difficultyLevel}:`, text);
    
    if (difficultyLevel === 'beginner') {
      // 초급: 매우 간단한 어휘와 짧은 문장
      let adjusted = text;
      
      if (type === 'title') {
        adjusted = text.replace(/숙제를 안 해왔을 때/g, '숙제 안 했어요')
                      .replace(/친구가 괴롭힘을 당할 때/g, '친구가 힘들어해요')
                      .replace(/교실에서 떠들 때/g, '교실에서 시끄러워요')
                      .substring(0, 10);
      } else if (type === 'situation') {
        adjusted = text.replace(/습니다|하세요|했습니다/g, '해요')
                      .replace(/받고 있어요/g, '당해요')
                      .replace(/선생님이|선생님께서/g, '선생님이')
                      .replace(/보여달라고 하셨어요/g, '보여달래요')
                      .split('.')[0] + '.'; // 첫 번째 문장만
      } else {
        adjusted = text.replace(/합니다|하세요/g, '해요')
                      .replace(/말씀드린다/g, '말해요')
                      .replace(/약속한다/g, '약속해요')
                      .substring(0, 15);
      }
      
      console.log(`🔧 Beginner adjusted:`, adjusted);
      return adjusted;
      
    } else if (difficultyLevel === 'advanced') {
      // 고급: 더 복잡하고 구체적인 표현
      let adjusted = text;
      
      if (type === 'title') {
        adjusted = text + ' - 상황 판단하기';
      } else if (type === 'situation') {
        adjusted = text + ' 이런 상황에서 여러분은 어떤 선택을 하시겠습니까? 각 선택지의 결과를 신중히 고려해보세요.';
      } else {
        if (text.includes('말씀드린다')) {
          adjusted = text.replace('말씀드린다', '정중하게 설명드리고 이해를 구한다');
        }
        if (text.includes('사과한다')) {
          adjusted = text.replace('사과한다', '진심으로 사과하고 앞으로 조심하겠다고 약속한다');
        }
      }
      
      console.log(`🔧 Advanced adjusted:`, adjusted);
      return adjusted;
    }
    
    console.log(`🔧 Intermediate (unchanged):`, text);
    return text; // intermediate는 원본 유지
  };

  const loadScenarios = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('scenarios')
        .select(`
          id,
          title,
          situation,
          scenario_options (
            id,
            text,
            option_order,
            is_correct
          )
        `)
        .eq('category', 'main')
        .eq('theme', theme)
        .limit(20);

      if (error) throw error;

      if (!data || data.length === 0) {
        // 샘플 데이터 생성
        await createSampleData();
        return;
      }

      const formattedScenarios = data.map(scenario => ({
        id: scenario.id,
        title: scenario.title,
        situation: scenario.situation,
        options: scenario.scenario_options.sort((a, b) => a.option_order - b.option_order)
      }));

      // 랜덤하게 섞기
      const shuffled = [...formattedScenarios].sort(() => Math.random() - 0.5);
      
      // 난이도에 맞게 시나리오 조정
      console.log('Current difficulty level:', difficultyLevel);
      const adjustedScenarios = adjustScenariosDifficulty(shuffled);
      console.log('Adjusted scenarios:', adjustedScenarios);
      setScenarios(adjustedScenarios);
    } catch (error) {
      console.error('Error loading scenarios:', error);
      toast({
        title: "오류",
        description: "시나리오를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    // 테마별 샘플 시나리오 생성 (난이도에 따라)
    const sampleScenarios = getSampleScenarios(theme || '', difficultyLevel);
    
    for (const scenario of sampleScenarios) {
      try {
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

        if (scenarioError) throw scenarioError;

        for (let i = 0; i < scenario.options.length; i++) {
          await supabase
            .from('scenario_options')
            .insert([{
              scenario_id: scenarioData.id,
              text: scenario.options[i],
              option_order: i,
              is_correct: i === scenario.correctOption
            }]);
        }
      } catch (error) {
        console.error('Error creating sample data:', error);
      }
    }

    // 데이터 생성 후 다시 로드
    loadScenarios();
  };

  const handleOptionSelect = async (optionIndex: number) => {
    if (showResult) return;
    
    setSelectedOption(optionIndex);
    const currentScenario = scenarios[currentScenarioIndex];
    const correctOption = currentScenario.options.find(opt => opt.is_correct);
    const isAnswerCorrect = optionIndex === correctOption?.option_order;
    
    setIsCorrect(isAnswerCorrect);
    setShowResult(true);

    // 진행 상황 저장
    try {
      await supabase
        .from('user_progress')
        .insert([{
          scenario_id: currentScenario.id,
          user_session: userSession,
          is_correct: isAnswerCorrect,
          attempts: 1,
          completed_at: isAnswerCorrect ? new Date().toISOString() : null
        }]);

      // 틀린 경우 오답노트에 추가
      if (!isAnswerCorrect) {
        await supabase
          .from('wrong_answers')
          .insert([{
            scenario_id: currentScenario.id,
            user_session: userSession,
            correct_count: 0
          }]);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleNext = () => {
    if (isCorrect) {
      // 정답인 경우 다음 문제로
      if (currentScenarioIndex < scenarios.length - 1) {
        setCurrentScenarioIndex(prev => prev + 1);
        resetQuestion();
      } else {
        // 모든 문제 완료
        toast({
          title: "축하합니다! 🎉",
          description: "모든 문제를 완료했습니다!",
        });
        navigate('/');
      }
    } else {
      // 오답인 경우 다시 도전
      resetQuestion();
    }
  };

  const resetQuestion = () => {
    setSelectedOption(null);
    setShowResult(false);
    setIsCorrect(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">문제를 준비하고 있어요...</p>
        </div>
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4 flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">아직 문제가 준비되지 않았어요.</p>
          <Button onClick={() => navigate('/')}>돌아가기</Button>
        </Card>
      </div>
    );
  }

  const currentScenario = scenarios[currentScenarioIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full bg-white shadow-md"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">문제 {currentScenarioIndex + 1} / {scenarios.length}</p>
            <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentScenarioIndex + 1) / scenarios.length) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* 문제 카드 */}
        <Card className="p-6 mb-6">
          <h2 className={`font-bold text-primary mb-3 ${difficultyLevel === 'beginner' ? 'text-lg' : difficultyLevel === 'intermediate' ? 'text-base' : 'text-sm'}`}>
            {currentScenario.title}
          </h2>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className={`text-foreground ${difficultyLevel === 'beginner' ? 'text-base leading-relaxed' : difficultyLevel === 'intermediate' ? 'text-sm leading-relaxed' : 'text-sm leading-normal'}`}>
              {currentScenario.situation}
            </p>
          </div>
          
          {/* 일러스트 영역 (임시) */}
          <div className="bg-gradient-to-br from-yellow-100 to-orange-100 p-8 rounded-lg mb-4 text-center">
            <div className="text-6xl mb-2">🤔</div>
            <p className="text-sm text-muted-foreground">어떻게 해야 할까요?</p>
          </div>
        </Card>

        {/* 선택지 */}
        <div className="space-y-3 mb-6">
          {currentScenario.options.map((option, index) => {
            let buttonClass = "p-4 text-left h-auto border-2 transition-all duration-300";
            
            if (showResult) {
              if (option.is_correct) {
                buttonClass += " bg-green-100 border-green-500 text-green-700";
              } else if (selectedOption === index) {
                buttonClass += " bg-red-100 border-red-500 text-red-700";
              } else {
                buttonClass += " bg-gray-100 border-gray-300 text-gray-600";
              }
            } else if (selectedOption === index) {
              buttonClass += " border-primary bg-blue-50";
            } else {
              buttonClass += " border-gray-200 hover:border-primary hover:bg-blue-50";
            }

            return (
              <Button
                key={option.id}
                variant="outline"
                className={buttonClass}
                onClick={() => handleOptionSelect(index)}
                disabled={showResult}
              >
                <div className="flex items-start gap-3 w-full">
                  <span className="font-bold text-primary flex-shrink-0">
                    {String.fromCharCode(97 + index)}.
                  </span>
                  <span className="text-sm leading-relaxed">{option.text}</span>
                  {showResult && option.is_correct && (
                    <Star className="text-yellow-500 ml-auto flex-shrink-0" size={16} />
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        {/* 결과 및 다음 버튼 */}
        {showResult && (
          <Card className="p-4 mb-4">
            {isCorrect ? (
              <div className="text-center text-green-600">
                <div className="text-4xl mb-2">🎉</div>
                <p className="font-bold mb-2">정답이에요! 잘했어요!</p>
                <p className="text-sm text-muted-foreground">다음 문제에 도전해보세요!</p>
              </div>
            ) : (
              <div className="text-center text-orange-600">
                <div className="text-4xl mb-2">💪</div>
                <p className="font-bold mb-2">다시 한번 생각해봐요!</p>
                <p className="text-sm text-muted-foreground">정답을 다시 선택해보세요!</p>
              </div>
            )}
            
            <Button 
              className="w-full mt-4" 
              onClick={handleNext}
            >
              {isCorrect ? 
                (currentScenarioIndex < scenarios.length - 1 ? '다음 문제' : '완료') 
                : '다시 도전'
              }
              {!isCorrect && <RotateCcw className="ml-2" size={16} />}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

// 테마별 샘플 시나리오 데이터 (난이도별)
const getSampleScenarios = (theme: string, difficulty: 'beginner' | 'intermediate' | 'advanced') => {
  const scenarios = {
    school: [
      // 1-10
      {
        title: difficulty === 'beginner' ? "숙제 안 해왔을 때" : difficulty === 'intermediate' ? "숙제를 깜빡했을 때" : "과제 미완성 상황에서의 대처",
        situation: difficulty === 'beginner' ? 
          "숙제를 안 했어요. 선생님이 숙제를 보여달라고 해요." :
          difficulty === 'intermediate' ?
          "지우는 숙제를 깜빡하고 못 해왔어요. 선생님이 숙제를 보여달라고 하셨어요." :
          "지우는 어제 밤 가족 행사로 인해 숙제를 완성하지 못했습니다. 선생님께서 과제 제출을 요청하셨을 때 어떻게 대응하는 것이 가장 적절할까요?",
        options: difficulty === 'beginner' ? [
          "친구 것을 베낀다.",
          "선생님께 말씀드린다.", 
          "거짓말을 한다."
        ] : difficulty === 'intermediate' ? [
          "친구 숙제를 빌려서 그대로 베낀다.",
          "숙제를 못 한 이유를 솔직히 말씀드리고, 다음 시간에 해오겠다고 약속한다.",
          "숙제장을 집에 두고 왔다고 거짓말한다."
        ] : [
          "급하게 친구의 과제를 참고하여 유사하게 작성한 후 제출한다.",
          "상황을 정직하게 설명하고 연장 기한을 요청하며, 책임감 있는 완성 계획을 제시한다.",
          "다양한 핑계를 대며 제출을 미루고 상황을 모면하려고 시도한다."
        ],
        correctOption: 1
      },
      {
        title: "친구가 괴롭힘을 당할 때",
        situation: "쉬는 시간에 친구가 다른 아이들에게 놀림을 받고 있어요.",
        options: [
          "모른 척하고 지나간다.",
          "선생님께 말씀드린다.",
          "같이 놀림에 참여한다."
        ],
        correctOption: 1
      },
      {
        title: "교실에서 떠들 때",
        situation: "수업 시간에 친구가 재미있는 농담을 해서 웃음이 나와요.",
        options: [
          "큰 소리로 웃는다.",
          "입을 가리고 조용히 웃거나 참는다.",
          "친구에게도 큰 소리로 이야기한다."
        ],
        correctOption: 1
      },
      {
        title: "급식 시간에 싫은 음식이 나왔을 때",
        situation: "오늘 급식에 브로콜리가 나왔는데 정말 싫어해요.",
        options: [
          "브로콜리를 바닥에 버린다.",
          "조금이라도 먹어보거나 선생님께 말씀드린다.",
          "친구에게 브로콜리를 주면서 도망간다."
        ],
        correctOption: 1
      },
      {
        title: "친구와 싸웠을 때",
        situation: "좋아하는 친구와 사소한 일로 싸웠어요.",
        options: [
          "다시는 말을 걸지 않는다.",
          "먼저 사과하고 화해한다.",
          "다른 친구들에게 그 친구 흉을 본다."
        ],
        correctOption: 1
      },
      {
        title: "반 친구가 도움을 요청할 때",
        situation: "옆자리 친구가 연필을 깎을 연필깎이가 없어서 빌려달라고 해요.",
        options: [
          "내 것만 쓰겠다고 거절한다.",
          "기꺼이 빌려준다.",
          "친구에게 돈을 받고 빌려준다."
        ],
        correctOption: 1
      },
      {
        title: "선생님이 혼낼 때",
        situation: "실수로 친구를 다치게 해서 선생님께 꾸중을 듣고 있어요.",
        options: [
          "선생님께 대들고 화를 낸다.",
          "잘못을 인정하고 앞으로 조심하겠다고 말씀드린다.",
          "친구 탓이라고 변명한다."
        ],
        correctOption: 1
      },
      {
        title: "시험에서 모르는 문제가 나왔을 때",
        situation: "시험 중에 어려운 문제가 나와서 전혀 모르겠어요.",
        options: [
          "옆 친구 답안지를 슬쩍 본다.",
          "아는 만큼만 써내고 모르는 것은 비워둔다.",
          "선생님께 문제가 너무 어렵다고 불평한다."
        ],
        correctOption: 1
      },
      {
        title: "친구 물건을 실수로 망가뜨렸을 때",
        situation: "친구 연필을 빌려 쓰다가 실수로 부러뜨렸어요.",
        options: [
          "모른 척하고 조용히 자리에 놓는다.",
          "친구에게 사과하고 새 연필을 사서 주겠다고 약속한다.",
          "원래 부러져 있었다고 거짓말한다."
        ],
        correctOption: 1
      },
      {
        title: "청소 시간에",
        situation: "청소 시간인데 놀고 싶어서 청소를 하기 싫어요.",
        options: [
          "화장실에 숨어서 청소를 안 한다.",
          "맡은 구역을 깨끗하게 청소한다.",
          "대충 청소하고 빨리 놀러간다."
        ],
        correctOption: 1
      },
      // 11-20
      {
        title: "새로 온 전학생을 만났을 때",
        situation: "오늘 우리 반에 새로운 친구가 전학을 왔어요.",
        options: [
          "관심없다는 듯이 무시한다.",
          "먼저 다가가서 인사하고 친구가 되어준다.",
          "다른 친구들과 수근수근 이야기한다."
        ],
        correctOption: 1
      },
      {
        title: "체육 시간에 축구팀을 나눌 때",
        situation: "체육 시간에 축구를 하는데, 축구를 잘 못하는 친구가 우리 팀에 들어왔어요.",
        options: [
          "그 친구를 다른 팀으로 보내려고 한다.",
          "함께 열심히 하면서 친구를 도와준다.",
          "그 친구가 공을 만지지 못하게 한다."
        ],
        correctOption: 1
      },
      {
        title: "복도에서 뛰고 싶을 때",
        situation: "화장실에 급하게 가고 싶은데 복도에서 뛰면 안 된다고 했어요.",
        options: [
          "아무도 안 보니까 뛰어간다.",
          "급해도 빠르게 걸어간다.",
          "선생님께 달려가도 되는지 물어본다."
        ],
        correctOption: 1
      },
      {
        title: "친구가 비밀을 말해줬을 때",
        situation: "가장 친한 친구가 다른 사람에게는 절대 말하지 말라며 비밀을 말해줬어요.",
        options: [
          "재미있으니까 다른 친구들에게 말해준다.",
          "친구와의 약속을 지키고 비밀을 지킨다.",
          "선생님께만 말씀드린다."
        ],
        correctOption: 1
      },
      {
        title: "친구가 준비물을 안 가져왔을 때",
        situation: "미술 시간인데 친구가 색연필을 안 가져와서 그림을 그릴 수 없어요.",
        options: [
          "내 것만 쓰고 친구는 신경 안 쓴다.",
          "색연필을 나누어서 함께 사용한다.",
          "친구에게 왜 안 가져왔냐고 혼낸다."
        ],
        correctOption: 1
      },
      {
        title: "수업 중에 화장실이 급할 때",
        situation: "수업 시간인데 화장실이 너무 급해요.",
        options: [
          "그냥 참고 수업을 듣는다.",
          "손을 들고 선생님께 화장실에 가고 싶다고 말한다.",
          "선생님 몰래 교실을 나간다."
        ],
        correctOption: 1
      },
      {
        title: "친구가 울고 있을 때",
        situation: "쉬는 시간에 친구가 혼자서 울고 있어요.",
        options: [
          "울고 있는 이유를 친구들에게 말하고 다닌다.",
          "다가가서 괜찮은지 물어보고 위로해준다.",
          "울음은 부끄러운 거라고 놀린다."
        ],
        correctOption: 1
      },
      {
        title: "수업 시간에 모르는 것이 있을 때",
        situation: "선생님이 설명하시는 내용이 어려워서 이해가 안 돼요.",
        options: [
          "모르는 척하고 그냥 넘어간다.",
          "손을 들고 다시 설명해달라고 요청한다.",
          "친구에게 수업 중에 물어본다."
        ],
        correctOption: 1
      },
      {
        title: "반 대표를 뽑을 때",
        situation: "반 대표를 뽑는 선거에서 누구를 뽑을지 고민돼요.",
        options: [
          "친하다는 이유만으로 친구를 뽑는다.",
          "누가 반을 잘 이끌 수 있을지 생각해서 뽑는다.",
          "아무나 대충 뽑는다."
        ],
        correctOption: 1
      },
      {
        title: "교실에서 쓰레기를 발견했을 때",
        situation: "내 자리 근처 바닥에 쓰레기가 떨어져 있어요. 내가 버린 쓰레기는 아니에요.",
        options: [
          "내가 버린 게 아니니까 그냥 둔다.",
          "누가 버린 것이든 주워서 쓰레기통에 버린다.",
          "누가 버렸는지 찾아서 혼낸다."
        ],
        correctOption: 1
      }
    ],
    playground: [
      // 1-10
      {
        title: "놀이기구를 기다릴 때",
        situation: "미끄럼틀에 많은 친구들이 줄을 서 있어요. 빨리 타고 싶어요.",
        options: [
          "줄을 새치기한다.",
          "차례대로 기다린다.",
          "다른 친구들을 밀어낸다."
        ],
        correctOption: 1
      },
      {
        title: "그네를 타고 싶을 때",
        situation: "그네를 타고 싶은데 한 친구가 계속 타고 있어요.",
        options: [
          "그네를 흔들어서 내려오게 한다.",
          "잠깐 바꿔달라고 정중하게 부탁한다.",
          "그 친구를 밀어서 그네에서 떨어뜨린다."
        ],
        correctOption: 1
      },
      {
        title: "친구가 놀이기구에서 다쳤을 때",
        situation: "미끄럼틀에서 친구가 넘어져서 무릎을 다쳤어요.",
        options: [
          "재미있다며 웃는다.",
          "괜찮은지 확인하고 어른에게 알려준다.",
          "다친 것은 자기 잘못이라고 말한다."
        ],
        correctOption: 1
      },
      {
        title: "모래놀이를 할 때",
        situation: "모래놀이터에서 성을 쌓고 있는데 다른 친구가 모래를 뿌려요.",
        options: [
          "그 친구에게 모래를 더 세게 뿌려서 복수한다.",
          "그만하라고 말하고 함께 놀자고 제안한다.",
          "울면서 집에 가겠다고 한다."
        ],
        correctOption: 1
      },
      {
        title: "공놀이 할 때",
        situation: "축구를 하다가 공이 다른 사람의 모래성을 망가뜨렸어요.",
        options: [
          "모른 척하고 계속 축구를 한다.",
          "사과하고 함께 다시 만들어준다.",
          "공이 잘못 굴러간 거라고 변명한다."
        ],
        correctOption: 1
      },
      {
        title: "작은 친구들이 놀고 있을 때",
        situation: "놀이터에 나보다 훨씬 어린 친구들이 놀고 있어요.",
        options: [
          "어린 친구들을 밀어내고 내가 논다.",
          "어린 친구들을 보호하고 함께 놀아준다.",
          "어린 친구들이 노는 것을 방해한다."
        ],
        correctOption: 1
      },
      {
        title: "시소를 탈 때",
        situation: "시소를 타는데 상대방이 갑자기 뛰어내려서 나는 쿵 하고 떨어졌어요.",
        options: [
          "화가 나서 그 친구를 때린다.",
          "아프다고 말하고 안전하게 노는 방법을 설명해준다.",
          "똑같이 갑자기 뛰어내려서 복수한다."
        ],
        correctOption: 1
      },
      {
        title: "놀이터에서 새로운 친구를 만났을 때",
        situation: "놀이터에서 처음 보는 친구가 혼자서 놀고 있어요.",
        options: [
          "혼자 놀라고 하며 무시한다.",
          "다가가서 함께 놀자고 제안한다.",
          "그 친구를 쳐다보며 수근거린다."
        ],
        correctOption: 1
      },
      {
        title: "비 온 후 놀이터에서",
        situation: "비가 온 후라서 놀이기구가 젖어있어요.",
        options: [
          "젖어있어도 그냥 놀이기구를 탄다.",
          "놀이기구를 닦고 나서 안전하게 논다.",
          "다른 친구들이 먼저 타보게 한다."
        ],
        correctOption: 1
      },
      {
        title: "놀이터 규칙을 어기는 친구를 봤을 때",
        situation: "놀이터에서 위험하게 노는 친구를 봤어요.",
        options: [
          "나도 따라서 위험하게 논다.",
          "위험하다고 말해주고 안전하게 놀자고 한다.",
          "그 친구가 다칠 때까지 기다려본다."
        ],
        correctOption: 1
      },
      // 11-20
      {
        title: "킥보드를 탈 때",
        situation: "놀이터에서 킥보드를 타는데 앞에 어린 친구가 걸어가고 있어요.",
        options: [
          "빨리 가라고 소리친다.",
          "속도를 줄이고 '지나갈게요'라고 말한다.",
          "그냥 빠르게 지나간다."
        ],
        correctOption: 1
      },
      {
        title: "벤치에서 쉴 때",
        situation: "벤치에서 쉬고 있는데 할머니가 오셨어요.",
        options: [
          "할머니가 서 계셔도 그냥 앉아있는다.",
          "자리를 양보해드린다.",
          "다른 곳으로 피한다."
        ],
        correctOption: 1
      },
      {
        title: "동물을 만났을 때",
        situation: "놀이터에서 귀여운 강아지를 만났어요.",
        options: [
          "주인 허락 없이 만진다.",
          "주인에게 만져도 되는지 물어본다.",
          "강아지를 무서워하며 도망간다."
        ],
        correctOption: 1
      },
      {
        title: "친구와 숨바꼭질할 때",
        situation: "숨바꼭질을 하는데 친구가 위험한 곳에 숨었어요.",
        options: [
          "나도 더 위험한 곳에 숨는다.",
          "친구에게 위험하다고 말하고 안전한 곳으로 오라고 한다.",
          "그 친구를 찾지 않고 포기한다."
        ],
        correctOption: 1
      },
      {
        title: "쓰레기를 봤을 때",
        situation: "놀이터 바닥에 과자봉지가 떨어져 있어요.",
        options: [
          "누군가 치울 거라고 생각하고 그냥 둔다.",
          "주워서 쓰레기통에 버린다.",
          "발로 차서 더 멀리 보낸다."
        ],
        correctOption: 1
      },
      {
        title: "놀이기구가 고장났을 때",
        situation: "그네 하나가 고장나서 위험해 보여요.",
        options: [
          "고장난 그네를 타보고 싶다.",
          "다른 사람들에게 위험하다고 알려준다.",
          "고장난 것을 더 망가뜨린다."
        ],
        correctOption: 1
      },
      {
        title: "놀이터에서 음식을 먹을 때",
        situation: "놀이터에서 간식을 먹고 있는데 개미들이 몰려와요.",
        options: [
          "개미들을 밟아버린다.",
          "다른 곳으로 가서 먹거나 개미들을 피해준다.",
          "개미들에게 음식을 던져준다."
        ],
        correctOption: 1
      },
      {
        title: "다른 아이가 울고 있을 때",
        situation: "놀이터에서 어린 친구가 엄마를 찾으며 울고 있어요.",
        options: [
          "울음소리가 시끄럽다고 화낸다.",
          "어른을 찾아서 도움을 요청한다.",
          "울지 말라고 혼낸다."
        ],
        correctOption: 1
      },
      {
        title: "공유 장난감을 사용할 때",
        situation: "놀이터에 있는 공용 모래놀이 도구를 쓰고 싶어요.",
        options: [
          "다른 아이가 쓰고 있어도 뺏어온다.",
          "순서를 기다리거나 함께 사용하자고 제안한다.",
          "그 아이가 안 쓸 때까지 숨어서 지켜본다."
        ],
        correctOption: 1
      },
      {
        title: "놀이터에서 집에 가야 할 시간",
        situation: "엄마가 집에 갈 시간이라고 하는데 아직 더 놀고 싶어요.",
        options: [
          "엄마 말을 안 듣고 계속 논다.",
          "아쉽지만 엄마와 함께 집에 간다.",
          "5분만 더 놀겠다고 떼를 쓴다."
        ],
        correctOption: 1
      }
    ],
    transport: [
      // 1-10
      {
        title: "지하철에서 자리를 양보할 때",
        situation: "지하철에 할머니가 타셨는데 빈 자리가 없어요.",
        options: [
          "모른 척한다.",
          "자리를 양보해드린다.",
          "다른 사람이 양보하기를 기다린다."
        ],
        correctOption: 1
      },
      {
        title: "버스에서 큰 소리로 이야기할 때",
        situation: "버스에서 친구와 재미있는 이야기를 하고 싶어요.",
        options: [
          "큰 소리로 이야기한다.",
          "작은 목소리로 이야기한다.",
          "핸드폰으로 큰 소리로 통화한다."
        ],
        correctOption: 1
      },
      {
        title: "지하철에서 밀려서 다른 사람을 건드렸을 때",
        situation: "지하철이 갑자기 멈춰서 옆 사람에게 부딪혔어요.",
        options: [
          "모른 척하고 딴 곳을 본다.",
          "죄송하다고 사과한다.",
          "지하철 탓이라고 말한다."
        ],
        correctOption: 1
      },
      {
        title: "버스에서 음식을 먹고 싶을 때",
        situation: "버스에서 배가 고파서 가져온 과자를 먹고 싶어요.",
        options: [
          "냄새나는 음식을 꺼내서 먹는다.",
          "다른 사람에게 방해되지 않을 음식만 조용히 먹는다.",
          "바닥에 부스러기를 떨어뜨리며 먹는다."
        ],
        correctOption: 1
      },
      {
        title: "교통카드가 없을 때",
        situation: "버스를 타려는데 교통카드를 깜빡하고 안 가져왔어요.",
        options: [
          "그냥 몰래 타고 간다.",
          "기사님께 사정을 말씀드리고 현금으로 요금을 낸다.",
          "다른 사람 뒤에 숨어서 탄다."
        ],
        correctOption: 1
      },
      {
        title: "지하철에서 휴대폰을 사용할 때",
        situation: "지하철에서 게임을 하고 싶어요.",
        options: [
          "소리를 크게 하고 게임한다.",
          "이어폰을 끼거나 소리를 끄고 게임한다.",
          "다른 사람들도 보라고 화면을 크게 한다."
        ],
        correctOption: 1
      },
      {
        title: "버스에서 임산부를 봤을 때",
        situation: "버스에서 배가 부른 임산부 아주머니를 봤어요.",
        options: [
          "못 본 척한다.",
          "자리를 양보해드린다.",
          "임산부는 집에만 있어야 한다고 말한다."
        ],
        correctOption: 1
      },
      {
        title: "지하철에서 발을 밟혔을 때",
        situation: "사람이 많은 지하철에서 누군가 제 발을 밟았어요.",
        options: [
          "화를 내며 그 사람을 밀어낸다.",
          "괜찮다고 말하거나 조심해달라고 정중하게 말한다.",
          "그 사람 발도 밟아서 복수한다."
        ],
        correctOption: 1
      },
      {
        title: "버스에서 소지품을 떨어뜨렸을 때",
        situation: "버스에서 필통을 떨어뜨렸는데 앞자리 사람 발 아래 들어갔어요.",
        options: [
          "그냥 포기한다.",
          "정중하게 필통을 주워달라고 부탁한다.",
          "그 사람 다리를 건드려서 비켜달라고 한다."
        ],
        correctOption: 1
      },
      {
        title: "지하철 출입문에서",
        situation: "지하철 문이 열렸는데 내리는 사람들이 많아요.",
        options: [
          "사람들을 밀치고 먼저 탄다.",
          "내리는 사람들이 다 내린 후에 탄다.",
          "문 앞에서 기다리지 않고 끝에서 탄다."
        ],
        correctOption: 1
      },
      // 11-20
      {
        title: "버스에서 뒷문으로 내릴 때",
        situation: "버스에서 내려야 하는데 앞쪽에 사람이 많아요.",
        options: [
          "사람들을 거칠게 밀면서 지나간다.",
          "'죄송해요, 내려주세요'라고 정중하게 말한다.",
          "뒷문이 열릴 때까지 기다린다."
        ],
        correctOption: 1
      },
      {
        title: "지하철에서 가방이 다른 사람을 건드릴 때",
        situation: "등에 멘 가방이 앉아있는 사람에게 계속 닿아요.",
        options: [
          "그냥 그대로 둔다.",
          "가방을 앞으로 메거나 자리를 옮긴다.",
          "앉아있는 사람에게 자리를 옮기라고 한다."
        ],
        correctOption: 1
      },
      {
        title: "버스에서 할아버지가 지팡이를 떨어뜨렸을 때",
        situation: "버스에서 할아버지가 지팡이를 떨어뜨리셨어요.",
        options: [
          "누군가 도와주겠지 하고 기다린다.",
          "재빨리 지팡이를 주워드린다.",
          "할아버지가 직접 줍기를 기다린다."
        ],
        correctOption: 1
      },
      {
        title: "지하철에서 음악을 들을 때",
        situation: "지하철에서 좋아하는 음악을 듣고 싶어요.",
        options: [
          "스피커로 크게 틀어서 듣는다.",
          "이어폰을 끼고 나만 들리게 한다.",
          "다른 사람들도 함께 들으라고 크게 틀어놓는다."
        ],
        correctOption: 1
      },
      {
        title: "버스에서 친구를 기다릴 때",
        situation: "버스에 먼저 탔는데 친구가 아직 안 왔어요.",
        options: [
          "버스 문을 손으로 막고 기다린다.",
          "친구에게 다음 버스를 타라고 연락한다.",
          "기사님께 잠깐 기다려달라고 부탁한다."
        ],
        correctOption: 1
      },
      {
        title: "지하철에서 길을 물어볼 때",
        situation: "지하철에서 어느 역에서 내려야 할지 모르겠어요.",
        options: [
          "아무나 붙잡고 계속 물어본다.",
          "바쁘지 않아 보이는 사람에게 정중하게 물어본다.",
          "그냥 아무 역에서나 내린다."
        ],
        correctOption: 1
      },
      {
        title: "버스에서 잠이 올 때",
        situation: "버스를 오래 타다 보니 졸려서 자고 싶어요.",
        options: [
          "옆 사람에게 기대서 잔다.",
          "내릴 역을 놓치지 않게 조심하며 잔다.",
          "큰 소리로 코를 골며 잔다."
        ],
        correctOption: 1
      },
      {
        title: "지하철에서 통화할 때",
        situation: "지하철에서 엄마가 전화를 걸어왔어요.",
        options: [
          "큰 소리로 통화한다.",
          "작은 목소리로 짧게 통화하거나 문자로 답한다.",
          "스피커폰으로 통화한다."
        ],
        correctOption: 1
      },
      {
        title: "버스에서 창문을 열고 싶을 때",
        situation: "버스 안이 더워서 창문을 열고 싶어요.",
        options: [
          "다른 사람 의견은 상관없이 창문을 연다.",
          "주변 사람들에게 창문을 열어도 되는지 물어본다.",
          "에어컨을 더 틀어달라고 기사님께 요청한다."
        ],
        correctOption: 1
      },
      {
        title: "지하철에서 마스크를 착용할 때",
        situation: "지하철에서 기침이 나오려고 해요.",
        options: [
          "손으로 가리지 않고 그냥 기침한다.",
          "마스크를 쓰거나 옷소매로 입을 가리고 기침한다.",
          "다른 사람 쪽으로 고개를 돌리고 기침한다."
        ],
        correctOption: 1
      }
    ],
    hospital: [
      // 1-10
      {
        title: "병원에서 주사를 맞을 때",
        situation: "의사선생님이 주사를 놓으려고 하는데 무서워요.",
        options: [
          "소리를 지르며 도망간다.",
          "무서워도 참고 주사를 맞는다.",
          "의사선생님을 때린다."
        ],
        correctOption: 1
      },
      {
        title: "병원 대기실에서 기다릴 때",
        situation: "병원 대기실에서 오래 기다려야 해서 지루해요.",
        options: [
          "큰 소리로 떠들며 뛰어다닌다.",
          "조용히 책을 읽거나 조용한 놀이를 한다.",
          "다른 환자들에게 계속 말을 건다."
        ],
        correctOption: 1
      },
      {
        title: "의사선생님이 진료할 때",
        situation: "의사선생님이 어디가 아픈지 물어보세요.",
        options: [
          "아픈 곳이 없다고 거짓말한다.",
          "아픈 곳을 정확하게 설명해드린다.",
          "다른 이야기만 계속한다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 약을 받을 때",
        situation: "약국에서 쓴 약을 받았는데 먹고 싶지 않아요.",
        options: [
          "약을 먹지 않겠다고 떼를 쓴다.",
          "아파도 약을 먹어야 낫는다는 것을 이해하고 먹는다.",
          "약을 몰래 버린다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 다른 환자를 봤을 때",
        situation: "병원에서 붕대를 감고 있는 다른 환자를 봤어요.",
        options: [
          "신기해서 계속 쳐다본다.",
          "예의를 지키고 쳐다보지 않는다.",
          "무서워서 소리를 지른다."
        ],
        correctOption: 1
      },
      {
        title: "간호사 선생님이 체온을 잴 때",
        situation: "간호사 선생님이 체온계를 입에 물라고 하세요.",
        options: [
          "체온계를 깨물어서 부순다.",
          "가만히 있으면서 체온을 잰다.",
          "체온계를 뱉어낸다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 X-레이를 찍을 때",
        situation: "뼈가 부러졌는지 확인하려고 X-레이를 찍어야 해요.",
        options: [
          "무서워서 울면서 거부한다.",
          "의사선생님 말씀을 듣고 가만히 있는다.",
          "X-레이 기계를 만지려고 한다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 혈액검사를 할 때",
        situation: "혈액검사를 위해 피를 조금 뽑아야 해요.",
        options: [
          "팔을 빼면서 도망간다.",
          "무섭지만 검사를 위해 참는다.",
          "간호사 선생님을 밀어낸다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 엄마와 떨어져야 할 때",
        situation: "검사하는 동안 엄마는 밖에서 기다려야 한다고 해요.",
        options: [
          "엄마 없이는 절대 안 한다고 떼를 쓴다.",
          "무섭지만 의사선생님을 믿고 검사를 받는다.",
          "몰래 엄마를 부른다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 기다리는 동안 화장실이 급할 때",
        situation: "진료를 기다리는 중인데 화장실이 급해요.",
        options: [
          "그냥 참는다.",
          "엄마나 직원에게 화장실 위치를 물어본다.",
          "아무 곳에나 가서 본다."
        ],
        correctOption: 1
      },
      // 11-20
      {
        title: "치과에서 치료받을 때",
        situation: "치과에서 충치 치료를 받아야 해요.",
        options: [
          "입을 벌리지 않고 버틴다.",
          "무섭지만 입을 크게 벌리고 치료받는다.",
          "치과 기구를 만지려고 한다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 처치를 받을 때",
        situation: "상처 소독을 위해 약을 발라야 하는데 따가워요.",
        options: [
          "아프다고 손을 빼버린다.",
          "아파도 참고 치료를 받는다.",
          "의사선생님께 화를 낸다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 물을 마시고 싶을 때",
        situation: "목이 말라서 물을 마시고 싶은데 검사 전이라 마시면 안 된다고 해요.",
        options: [
          "몰래 물을 마신다.",
          "검사가 끝날 때까지 참는다.",
          "물 대신 다른 음료를 마신다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 약 복용법을 들을 때",
        situation: "의사선생님이 약 먹는 방법을 설명해주세요.",
        options: [
          "딴 생각을 하며 듣지 않는다.",
          "집중해서 듣고 모르는 것은 다시 물어본다.",
          "알아서 먹겠다고 말한다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 진료복을 입을 때",
        situation: "검사를 위해 병원에서 제공하는 옷으로 갈아입어야 해요.",
        options: [
          "내 옷이 좋다고 거절한다.",
          "검사를 위해 필요하다는 것을 이해하고 갈아입는다.",
          "진료복을 더럽힌다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 다른 아이가 우는 소리를 들을 때",
        situation: "옆 진료실에서 다른 아이가 무서워서 울고 있어요.",
        options: [
          "그 아이를 놀린다.",
          "나도 무섭지만 용감하게 진료를 받는다.",
          "나도 따라서 운다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 MRI 검사를 받을 때",
        situation: "MRI 검사를 받는데 큰 소리가 나서 무서워요.",
        options: [
          "검사를 중단해달라고 소리친다.",
          "무섭지만 검사가 끝날 때까지 가만히 있는다.",
          "검사 중에 움직인다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 물리치료를 받을 때",
        situation: "다친 다리를 위해 물리치료를 받아야 하는데 힘들어요.",
        options: [
          "아프다고 치료를 거부한다.",
          "힘들어도 빨리 나으려면 필요하다고 생각하고 열심히 한다.",
          "치료사 선생님께 짜증을 낸다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 입원해야 할 때",
        situation: "병이 심해서 며칠 동안 병원에 입원해야 한다고 해요.",
        options: [
          "집에 가겠다고 떼를 쓴다.",
          "빨리 낫기 위해 필요한 일이라고 받아들인다.",
          "다른 환자들을 방해한다."
        ],
        correctOption: 1
      },
      {
        title: "병원에서 재진을 받을 때",
        situation: "치료 후 다시 병원에 와서 어떻게 나았는지 확인받아요.",
        options: [
          "괜찮다고 거짓말한다.",
          "정직하게 어떤 느낌인지 말씀드린다.",
          "의사선생님 말씀을 안 듣는다."
        ],
        correctOption: 1
      }
    ],
    library: [
      // 1-10
      {
        title: "도서관에서 조용히 해야 할 때",
        situation: "도서관에서 친구와 재미있는 이야기를 하고 싶어요.",
        options: [
          "큰 소리로 이야기한다.",
          "속삭이거나 밖으로 나가서 이야기한다.",
          "다른 사람들에게 시끄럽다고 불평한다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 책을 찾을 때",
        situation: "읽고 싶은 책을 찾고 있는데 어디 있는지 모르겠어요.",
        options: [
          "책장을 마구 뒤진다.",
          "사서 선생님께 도움을 요청한다.",
          "다른 사람이 읽는 책을 뺏어서 본다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 책을 빌릴 때",
        situation: "읽고 싶은 책이 있는데 다른 사람이 먼저 빌려갔어요.",
        options: [
          "그 사람에게 빨리 돌려달라고 재촉한다.",
          "예약을 하거나 비슷한 다른 책을 찾아본다.",
          "그 사람이 안 볼 때 책을 가져간다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 책을 읽을 때",
        situation: "재미있는 만화책을 읽고 있는데 웃음이 나와요.",
        options: [
          "큰 소리로 웃는다.",
          "입을 가리고 조용히 웃거나 참는다.",
          "친구들에게 재미있는 부분을 큰 소리로 알려준다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 컴퓨터를 사용할 때",
        situation: "도서관 컴퓨터로 숙제를 하고 있는데 게임을 하고 싶어요.",
        options: [
          "숙제 대신 게임을 한다.",
          "숙제를 먼저 끝내고 시간이 남으면 게임을 한다.",
          "게임 소리를 크게 틀어놓는다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 음식을 먹고 싶을 때",
        situation: "도서관에서 공부하다가 배가 고파져서 간식을 먹고 싶어요.",
        options: [
          "도서관 안에서 과자를 먹는다.",
          "밖으로 나가서 먹거나 허용된 곳에서 먹는다.",
          "몰래 책상 아래에서 먹는다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 책을 손상시켰을 때",
        situation: "실수로 빌린 책에 물을 쏟아서 젖게 했어요.",
        options: [
          "모른 척하고 그냥 반납한다.",
          "사서 선생님께 사과하고 어떻게 해야 할지 문의한다.",
          "다른 같은 책으로 바꿔치기한다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 자리를 잡을 때",
        situation: "도서관에 사람이 많아서 앉을 자리가 거의 없어요.",
        options: [
          "다른 사람 책을 치우고 그 자리에 앉는다.",
          "빈 자리를 찾거나 잠시 기다린다.",
          "누군가 일어날 때까지 뒤에서 계속 지켜본다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 휴대폰이 울릴 때",
        situation: "도서관에서 공부하고 있는데 휴대폰이 울려요.",
        options: [
          "그냥 도서관에서 전화를 받는다.",
          "빠르게 끄고 밖으로 나가서 전화를 받는다.",
          "진동으로 바꾸고 문자로 답한다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 책을 반납할 때",
        situation: "빌린 책의 반납 기한이 지났어요.",
        options: [
          "연체료가 무서워서 반납하지 않는다.",
          "늦었지만 빨리 반납하고 앞으로 주의하겠다고 말한다.",
          "다른 사람 이름으로 반납한다."
        ],
        correctOption: 1
      },
      // 11-20
      {
        title: "도서관에서 그룹 스터디를 할 때",
        situation: "친구들과 함께 과제를 하려고 도서관에 왔어요.",
        options: [
          "일반 열람실에서 큰 소리로 토론한다.",
          "그룹 스터디룸을 예약하거나 토론 가능한 구역에서 한다.",
          "다른 사람들에게 조용히 하라고 한다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 잠이 올 때",
        situation: "도서관에서 공부하다가 너무 졸려요.",
        options: [
          "책상에 엎드려서 큰 소리로 코를 골며 잔다.",
          "잠깐 휴게 공간에서 쉬거나 집에 가서 잔다.",
          "다른 사람들도 깨우면서 잔다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 책을 고를 때",
        situation: "책장에서 책을 꺼내보고 있는데 원하는 책이 아니에요.",
        options: [
          "책을 아무 곳에나 꽂아둔다.",
          "원래 있던 자리에 정확히 꽂아둔다.",
          "바닥에 놓고 간다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 분실물을 발견했을 때",
        situation: "도서관 책상에서 누군가 지갑을 놓고 간 것을 발견했어요.",
        options: [
          "지갑을 가져간다.",
          "사서 선생님께 전해드린다.",
          "그냥 모른 척한다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 프린터를 사용할 때",
        situation: "도서관 프린터로 자료를 출력하는데 앞에 사람이 많이 기다리고 있어요.",
        options: [
          "새치기해서 먼저 출력한다.",
          "차례를 기다리고 빠르게 출력한다.",
          "다른 사람들을 재촉한다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 에어컨 온도가 너무 추울 때",
        situation: "도서관이 너무 추워서 집중이 안 돼요.",
        options: [
          "마음대로 에어컨을 조작한다.",
          "사서 선생님께 온도 조절을 요청한다.",
          "다른 사람들에게 춥다고 계속 불평한다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 연필을 깎고 싶을 때",
        situation: "연필이 뭉뚝해져서 깎고 싶은데 연필깎이 소리가 날 것 같아요.",
        options: [
          "다른 사람들 상관없이 그냥 깎는다.",
          "조용한 곳으로 가서 깎거나 샤프펜슬을 사용한다.",
          "다른 사람에게 대신 깎아달라고 한다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 화장실에 갈 때",
        situation: "화장실에 가고 싶은데 자료와 가방을 그대로 두고 가야 해요.",
        options: [
          "아무에게나 물건을 맡겨달라고 한다.",
          "귀중품만 챙기고 빠르게 다녀온다.",
          "모든 물건을 들고 화장실에 간다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 다른 사람이 시끄럽게 할 때",
        situation: "옆에서 공부하는 사람이 계속 소리를 내서 집중이 안 돼요.",
        options: [
          "그 사람에게 화를 내며 조용히 하라고 한다.",
          "사서 선생님께 말씀드리거나 다른 자리로 옮긴다.",
          "나도 더 큰 소리를 낸다."
        ],
        correctOption: 1
      },
      {
        title: "도서관에서 책 추천을 받고 싶을 때",
        situation: "읽을 만한 재미있는 책을 찾고 있어요.",
        options: [
          "다른 사람이 읽는 책을 보고 똑같은 책만 찾는다.",
          "사서 선생님께 추천을 부탁드린다.",
          "아무 책이나 대충 골라서 빌린다."
        ],
        correctOption: 1
      }
    ],
    home: [
      // 1-10
      {
        title: "집에서 식사 시간에",
        situation: "저녁 식사 시간인데 게임을 더 하고 싶어요.",
        options: [
          "게임을 계속한다.",
          "게임을 끄고 가족과 함께 식사한다.",
          "밥을 먹으면서 게임을 한다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 숙제할 시간에",
        situation: "숙제를 해야 하는데 TV에서 재미있는 프로그램이 나와요.",
        options: [
          "TV를 보고 숙제는 나중에 한다.",
          "숙제를 먼저 끝내고 TV를 본다.",
          "TV를 보면서 숙제를 대충한다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 동생과 장난감을 나눠 쓸 때",
        situation: "동생이 내가 가지고 놀던 장난감을 갖고 싶어해요.",
        options: [
          "절대 안 준다고 거절한다.",
          "조금 더 놀고 나서 나눠서 가지고 논다.",
          "동생 장난감을 빼앗아온다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 청소를 도와달라고 할 때",
        situation: "엄마가 방 정리를 도와달라고 하셨어요.",
        options: [
          "나중에 하겠다고 미룬다.",
          "지금 바로 도와드린다.",
          "동생이 하라고 한다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 잠자리에 들 시간에",
        situation: "잠잘 시간이 됐는데 아직 더 놀고 싶어요.",
        options: [
          "몰래 일어나서 계속 논다.",
          "내일 더 놀 수 있다고 생각하고 잔다.",
          "자겠다고 거짓말하고 이불 속에서 게임한다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 전화가 올 때",
        situation: "집 전화가 울리는데 부모님이 안 계세요.",
        options: [
          "전화를 받지 않는다.",
          "정중하게 전화를 받고 부모님께 전해드린다고 한다.",
          "장난전화인 척한다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 친구가 놀러왔을 때",
        situation: "친구가 집에 놀러왔는데 부모님이 안 계세요.",
        options: [
          "부모님 허락 없이 친구를 들어오게 한다.",
          "부모님께 먼저 연락드리고 허락을 받는다.",
          "친구와 밖에서만 논다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 용돈을 받았을 때",
        situation: "용돈을 받았는데 갖고 싶은 것이 너무 많아요.",
        options: [
          "모든 돈을 한 번에 써버린다.",
          "필요한 것과 갖고 싶은 것을 구분해서 계획적으로 쓴다.",
          "부모님께 용돈을 더 달라고 한다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 실수로 물건을 깨뜨렸을 때",
        situation: "뛰어다니다가 실수로 꽃병을 깨뜨렸어요.",
        options: [
          "모른 척하고 숨는다.",
          "부모님께 솔직하게 말씀드리고 사과한다.",
          "동생이 깨뜨렸다고 거짓말한다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 애완동물을 키울 때",
        situation: "키우는 강아지가 실수를 해서 바닥을 더럽혔어요.",
        options: [
          "모른 척하고 그냥 둔다.",
          "바로 치우고 강아지를 돌본다.",
          "강아지를 혼낸다."
        ],
        correctOption: 1
      },
      // 11-20
      {
        title: "집에서 손님이 오셨을 때",
        situation: "부모님 친구분이 집에 오셨어요.",
        options: [
          "인사하지 않고 방에 들어간다.",
          "정중하게 인사드린다.",
          "손님을 무시한다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 컴퓨터 사용 시간이 끝났을 때",
        situation: "컴퓨터 사용 시간이 끝났는데 게임이 끝나지 않았어요.",
        options: [
          "게임이 끝날 때까지 계속한다.",
          "아쉽지만 약속한 시간을 지키고 끈다.",
          "5분만 더 하겠다고 부모님을 설득한다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 심부름을 부탁받았을 때",
        situation: "부모님이 마트에서 우유를 사오라고 하셨어요.",
        options: [
          "귀찮다고 거절한다.",
          "기꺼이 심부름을 해드린다.",
          "나중에 하겠다고 계속 미룬다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 음식을 만들 때",
        situation: "부모님과 함께 요리를 하고 있는데 재미있어요.",
        options: [
          "음식 재료로 장난을 친다.",
          "부모님 말씀을 잘 듣고 도와드린다.",
          "맛만 보고 만들지는 않는다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 감기에 걸렸을 때",
        situation: "감기에 걸려서 기침이 많이 나와요.",
        options: [
          "가족들 앞에서 기침을 마구 한다.",
          "마스크를 쓰고 손으로 입을 가린다.",
          "감기약을 먹지 않는다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 학교 준비물을 챙길 때",
        situation: "내일 학교에 가져갈 준비물을 챙겨야 해요.",
        options: [
          "내일 아침에 하겠다고 미룬다.",
          "미리미리 차근차근 준비한다.",
          "부모님이 대신 챙겨주기를 기다린다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 가족 영화를 볼 때",
        situation: "가족끼리 영화를 보는데 제가 보고 싶은 영화가 아니에요.",
        options: [
          "다른 영화로 바꿔달라고 떼를 쓴다.",
          "가족이 함께하는 시간이 중요하다고 생각하고 본다.",
          "중간에 방으로 들어간다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 새로운 규칙이 생겼을 때",
        situation: "부모님이 게임 시간을 줄이는 새로운 규칙을 만드셨어요.",
        options: [
          "규칙을 지키지 않겠다고 반항한다.",
          "규칙의 이유를 이해하고 지키려고 노력한다.",
          "몰래 규칙을 어긴다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 할아버지, 할머니가 오셨을 때",
        situation: "오랜만에 할아버지, 할머니가 집에 오셨어요.",
        options: [
          "인사만 하고 내 할 일만 한다.",
          "할아버지, 할머니와 많은 시간을 보내려고 노력한다.",
          "시끄럽다고 불평한다."
        ],
        correctOption: 1
      },
      {
        title: "집에서 이웃집에서 불평이 들어왔을 때",
        situation: "이웃집에서 우리 집이 너무 시끄럽다고 하셨어요.",
        options: [
          "이웃집이 예민하다고 생각한다.",
          "앞으로 더 조용히 하려고 노력한다.",
          "더 크게 소리를 낸다."
        ],
        correctOption: 1
      }
    ]
  };

  return scenarios[theme as keyof typeof scenarios] || scenarios.school;
};

export default GamePlay;