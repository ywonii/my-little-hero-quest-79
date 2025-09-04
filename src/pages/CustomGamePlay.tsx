import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Star, RotateCcw, Zap } from 'lucide-react';
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

const CustomGamePlay = () => {
  const navigate = useNavigate();
  const { themeName } = useParams<{ themeName: string }>();
  const { toast } = useToast();
  
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  const userSession = `session_${Date.now()}`;
  const decodedThemeName = decodeURIComponent(themeName || '');

  useEffect(() => {
    // localStorage에서 난이도 설정 확인
    const savedLevel = localStorage.getItem('literacyLevel') as 'beginner' | 'intermediate' | 'advanced';
    console.log('📚 Custom - Saved literacy level from localStorage:', savedLevel);
    if (savedLevel && savedLevel !== difficultyLevel) {
      setDifficultyLevel(savedLevel);
      console.log('📚 Custom - Setting difficulty level to:', savedLevel);
    }
  }, [themeName]); // difficultyLevel 제거

  useEffect(() => {
    console.log('📚 Custom - Difficulty level changed, reloading scenarios:', difficultyLevel);
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
    console.log(`🔧 Custom - Adjusting ${type} for difficulty ${difficultyLevel}:`, text);
    
    if (difficultyLevel === 'beginner') {
      // 하급: 간단한 이야기 형식 - "친구와 놀았어요"
      let adjusted = text;
      
      if (type === 'title') {
        // 핵심 주제만 간단하게
        adjusted = text.split(' - ')[0]
                      .replace(/상황에서의 대처/g, '')
                      .replace(/괴롭힘/g, '힘든 일')
                      .replace(/대처법/g, '')
                      .trim();
      } else if (type === 'situation') {
        // 짧고 간단한 이야기 형식으로 변환
        adjusted = text
                      .replace(/~습니다|~하셨습니다/g, '~어요')
                      .replace(/어떻게 해야 할까요\?/g, '뭘 할까요?')
                      .replace(/상황입니다/g, '일이에요')
                      .replace(/놀림을 받고 있습니다/g, '힘들어해요')
                      .replace(/괴롭힘을 당하고/g, '힘든 일을 당하고')
                      .split('.')[0] + '어요.'; // 첫 문장만 사용하고 간단하게
        
        // 이야기 형식으로 만들기
        if (!adjusted.includes('나는') && !adjusted.includes('저는')) {
          adjusted = '나는 ' + adjusted.toLowerCase();
        }
      } else {
        // 선택지도 간단한 이야기 형식으로
        adjusted = text.replace(/선생님께 말씀드린다/g, '선생님께 말해요')
                      .replace(/사과한다/g, '미안하다고 해요')
                      .replace(/도움을 준다/g, '도와줘요')
                      .replace(/무시한다/g, '모르는 척해요');
      }
      
      console.log(`🔧 Custom - Beginner adjusted:`, adjusted);
      return adjusted;
      
    } else if (difficultyLevel === 'advanced') {
      // 상급: 상세한 이야기 형식 - "나는 학교가 끝난 뒤 친구와 놀이터에서 신나게 놀았어요"
      let adjusted = text;
      
      if (type === 'title') {
        // 구체적인 상황 설명 추가
        if (!text.includes(' - ')) {
          adjusted = text + ' - 상황 분석 및 해결 방안';
        }
      } else if (type === 'situation') {
        // 배경과 상세한 이야기 형식으로 확장
        let storyText = text;
        
        // 이야기 형식으로 만들기 - 상세한 배경 추가
        if (!storyText.includes('이러한 상황에서')) {
          storyText = storyText + ' 이러한 복잡한 상황에서 여러 요소를 고려하여 가장 적절한 대응 방법을 선택해야 합니다.';
        }
        
        // 1인칭 이야기 형식으로 변환
        if (!storyText.includes('나는') && !storyText.includes('저는')) {
          storyText = '나는 ' + storyText;
        }
        
        adjusted = storyText;
      } else {
        // 선택지에 구체적인 행동과 이유 추가
        if (text.includes('선생님께 말한다')) {
          adjusted = text.replace('선생님께 말한다', '상황을 정확히 파악한 뒤 담당 선생님께 구체적으로 보고한다');
        } else if (text.includes('사과한다')) {
          adjusted = text.replace('사과한다', '진심으로 사과하고 앞으로 주의하겠다고 약속한다');
        } else if (text.includes('도움을 준다')) {
          adjusted = text.replace('도움을 준다', '상대방의 입장을 이해하고 적절한 도움을 제공한다');
        } else {
          // 다른 선택지들도 상세하게
          adjusted = text + ' (구체적인 방법과 이유를 생각해보세요)';
        }
      }
      
      console.log(`🔧 Custom - Advanced adjusted:`, adjusted);
      return adjusted;
      
    } else {
      // 중급: 중간 수준의 이야기 형식 - "나는 친구와 같이 놀이터에서 놀았어요"
      let adjusted = text;
      
      if (type === 'situation') {
        // 중간 수준의 이야기 형식으로 변환
        if (!adjusted.includes('나는') && !adjusted.includes('저는')) {
          adjusted = '나는 ' + adjusted;
        }
      }
      
      console.log(`🔧 Custom - Intermediate adjusted:`, adjusted);
      return adjusted;
    }
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
        .eq('category', 'custom')
        .eq('theme', decodedThemeName);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "시나리오 없음",
          description: "이 테마에 대한 시나리오를 찾을 수 없습니다.",
          variant: "destructive"
        });
        navigate('/secret-mission');
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
      if (currentScenarioIndex < scenarios.length - 1) {
        setCurrentScenarioIndex(prev => prev + 1);
        resetQuestion();
      } else {
        toast({
          title: "🎊 비밀 임무 완료!",
          description: "모든 임무를 성공적으로 수행했습니다!",
        });
        navigate('/secret-mission');
      }
    } else {
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
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">비밀 임무를 준비하고 있어요...</p>
        </div>
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 p-4 flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">비밀 임무가 준비되지 않았어요.</p>
          <Button onClick={() => navigate('/secret-mission')}>돌아가기</Button>
        </Card>
      </div>
    );
  }

  const currentScenario = scenarios[currentScenarioIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/secret-mission')}
            className="rounded-full bg-white shadow-md"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
              <Zap size={16} className="text-purple-600" />
              임무 {currentScenarioIndex + 1} / {scenarios.length}
            </p>
            <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentScenarioIndex + 1) / scenarios.length) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* 테마 정보 */}
        <Card className="p-4 mb-4 bg-gradient-to-r from-purple-100 to-pink-100">
          <div className="text-center">
            <h2 className="font-bold text-purple-700 text-sm">🕵️ 비밀 임무</h2>
            <p className="text-xs text-purple-600">{decodedThemeName}</p>
          </div>
        </Card>

        {/* 문제 카드 */}
        <Card className="p-6 mb-6 border-purple-200">
          <h2 className={`font-bold text-primary mb-3 ${difficultyLevel === 'beginner' ? 'text-lg' : difficultyLevel === 'intermediate' ? 'text-base' : 'text-sm'}`}>
            {currentScenario.title}
          </h2>
          <div className="bg-purple-50 p-4 rounded-lg mb-4 border border-purple-100">
            <p className={`text-foreground ${difficultyLevel === 'beginner' ? 'text-base leading-relaxed' : difficultyLevel === 'intermediate' ? 'text-sm leading-relaxed' : 'text-sm leading-normal'}`}>
              {currentScenario.situation}
            </p>
          </div>
          
          {/* 일러스트 영역 */}
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 rounded-lg mb-4 text-center">
            <div className="text-6xl mb-2">🤔</div>
            <p className="text-sm text-purple-600 font-medium">어떻게 해야 할까요?</p>
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
              buttonClass += " border-purple-500 bg-purple-50";
            } else {
              buttonClass += " border-purple-200 hover:border-purple-400 hover:bg-purple-50";
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
                  <span className="font-bold text-purple-600 flex-shrink-0">
                    {String.fromCharCode(97 + index)}.
                  </span>
                  <span className={`${difficultyLevel === 'beginner' ? 'text-sm' : 'text-xs'} leading-relaxed`}>{option.text}</span>
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
          <Card className="p-4 mb-4 border-purple-200">
            {isCorrect ? (
              <div className="text-center text-green-600">
                <div className="text-4xl mb-2">🎉</div>
                <p className="font-bold mb-2">임무 성공! 훌륭해요!</p>
                <p className="text-sm text-muted-foreground">다음 비밀 임무에 도전해보세요!</p>
              </div>
            ) : (
              <div className="text-center text-orange-600">
                <div className="text-4xl mb-2">💪</div>
                <p className="font-bold mb-2">다시 한번 도전해봐요!</p>
                <p className="text-sm text-muted-foreground">임무를 다시 수행해보세요!</p>
              </div>
            )}
            
            <Button 
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700" 
              onClick={handleNext}
            >
              {isCorrect ? 
                (currentScenarioIndex < scenarios.length - 1 ? '다음 임무' : '임무 완료') 
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

export default CustomGamePlay;