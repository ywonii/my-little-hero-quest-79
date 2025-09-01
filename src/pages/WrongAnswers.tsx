import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RotateCcw, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface WrongAnswer {
  id: string;
  correct_count: number;
  scenario: {
    id: string;
    title: string;
    situation: string;
    category: string;
    theme: string;
    options: {
      id: string;
      text: string;
      option_order: number;
      is_correct: boolean;
    }[];
  };
}

const WrongAnswers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [reviewingScenario, setReviewingScenario] = useState<WrongAnswer | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  useEffect(() => {
    // localStorage에서 난이도 설정 확인
    const savedLevel = localStorage.getItem('literacyLevel') as 'beginner' | 'intermediate' | 'advanced';
    if (savedLevel) {
      setDifficultyLevel(savedLevel);
    }
    loadWrongAnswers();
  }, []);

  const loadWrongAnswers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('wrong_answers')
        .select(`
          id,
          correct_count,
          scenario:scenarios (
            id,
            title,
            situation,
            category,
            theme,
            scenario_options (
              id,
              text,
              option_order,
              is_correct
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        ...item,
        scenario: {
          ...item.scenario,
          options: item.scenario.scenario_options.sort((a: any, b: any) => a.option_order - b.option_order)
        }
      })) || [];

      setWrongAnswers(formattedData);
    } catch (error) {
      console.error('Error loading wrong answers:', error);
      toast({
        title: "오류",
        description: "오답노트를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startReview = (wrongAnswer: WrongAnswer) => {
    setReviewingScenario(wrongAnswer);
    setSelectedOption(null);
    setShowResult(false);
    setIsCorrect(false);
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (showResult) return;
    
    setSelectedOption(optionIndex);
    const correctOption = reviewingScenario?.scenario.options.find(opt => opt.is_correct);
    const isAnswerCorrect = optionIndex === correctOption?.option_order;
    
    setIsCorrect(isAnswerCorrect);
    setShowResult(true);
  };

  const handleReviewComplete = async () => {
    if (!reviewingScenario || !isCorrect) return;

    try {
      const newCorrectCount = reviewingScenario.correct_count + 1;

      if (newCorrectCount >= 3) {
        // 3번 맞췄으므로 오답노트에서 제거
        await supabase
          .from('wrong_answers')
          .delete()
          .eq('id', reviewingScenario.id);
        
        toast({
          title: "완벽해요! 🎉",
          description: "이 문제가 오답노트에서 제거되었습니다!",
        });
      } else {
        // 정답 횟수만 증가
        await supabase
          .from('wrong_answers')
          .update({ correct_count: newCorrectCount })
          .eq('id', reviewingScenario.id);
        
        toast({
          title: "잘했어요! 👏",
          description: `${3 - newCorrectCount}번 더 맞추면 완전히 마스터해요!`,
        });
      }

      setReviewingScenario(null);
      loadWrongAnswers();
    } catch (error) {
      console.error('Error updating wrong answer:', error);
      toast({
        title: "오류",
        description: "진행 상황 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const removeFromWrongAnswers = async (wrongAnswerId: string) => {
    try {
      await supabase
        .from('wrong_answers')
        .delete()
        .eq('id', wrongAnswerId);
      
      toast({
        title: "제거 완료",
        description: "오답노트에서 제거되었습니다.",
      });
      
      loadWrongAnswers();
    } catch (error) {
      console.error('Error removing wrong answer:', error);
      toast({
        title: "오류",
        description: "제거하는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-red-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">오답노트를 불러오고 있어요...</p>
        </div>
      </div>
    );
  }

  // 복습 화면
  if (reviewingScenario) {
    const scenario = reviewingScenario.scenario;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-red-50 p-4">
        <div className="max-w-md mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setReviewingScenario(null)}
              className="rounded-full bg-white shadow-md"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">📝 복습 중</p>
              <Badge variant="outline" className="mt-1">
                {reviewingScenario.correct_count}/3 완료
              </Badge>
            </div>
            <div className="w-10"></div>
          </div>

          {/* 문제 카드 */}
          <Card className="p-6 mb-6">
            <h2 className={`font-bold text-primary mb-3 ${difficultyLevel === 'beginner' ? 'text-lg' : difficultyLevel === 'intermediate' ? 'text-base' : 'text-sm'}`}>
              {scenario.title}
            </h2>
            <div className="bg-orange-50 p-4 rounded-lg mb-4">
              <p className={`text-foreground ${difficultyLevel === 'beginner' ? 'text-base leading-relaxed' : difficultyLevel === 'intermediate' ? 'text-sm leading-relaxed' : 'text-sm leading-normal'}`}>
                {scenario.situation}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-100 to-red-100 p-8 rounded-lg mb-4 text-center">
              <div className="text-6xl mb-2">📚</div>
              <p className="text-sm text-orange-600 font-medium">복습 시간이에요!</p>
            </div>
          </Card>

          {/* 선택지 */}
          <div className="space-y-3 mb-6">
            {scenario.options.map((option, index) => {
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
                buttonClass += " border-orange-500 bg-orange-50";
              } else {
                buttonClass += " border-orange-200 hover:border-orange-400 hover:bg-orange-50";
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
                    <span className="font-bold text-orange-600 flex-shrink-0">
                      {String.fromCharCode(97 + index)}.
                    </span>
                    <span className={`${difficultyLevel === 'beginner' ? 'text-sm' : 'text-xs'} leading-relaxed`}>{option.text}</span>
                    {showResult && option.is_correct && (
                      <CheckCircle className="text-green-500 ml-auto flex-shrink-0" size={16} />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>

          {/* 결과 */}
          {showResult && (
            <Card className="p-4 mb-4">
              {isCorrect ? (
                <div className="text-center text-green-600">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="font-bold mb-2">정답이에요! 잘했어요!</p>
                  <p className="text-sm text-muted-foreground">
                    {reviewingScenario.correct_count + 1 >= 3 
                      ? '완전히 마스터했어요!' 
                      : `${3 - (reviewingScenario.correct_count + 1)}번 더 맞추면 완료!`
                    }
                  </p>
                  <Button 
                    className="w-full mt-4 bg-green-600 hover:bg-green-700" 
                    onClick={handleReviewComplete}
                  >
                    <CheckCircle className="mr-2" size={16} />
                    복습 완료
                  </Button>
                </div>
              ) : (
                <div className="text-center text-orange-600">
                  <div className="text-4xl mb-2">💪</div>
                  <p className="font-bold mb-2">다시 한번 생각해봐요!</p>
                  <p className="text-sm text-muted-foreground">정답을 다시 선택해보세요!</p>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => {
                      setSelectedOption(null);
                      setShowResult(false);
                    }}
                  >
                    <RotateCcw className="mr-2" size={16} />
                    다시 도전
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    );
  }

  // 오답노트 목록 화면
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-red-50 p-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full bg-white shadow-md"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">📝 오답노트</h1>
            <p className="text-muted-foreground">틀린 문제를 다시 풀어보세요</p>
          </div>
        </div>

        {wrongAnswers.length === 0 ? (
          <div className="text-center py-12">
            <Card className="p-6">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-primary mb-3">
                완벽해요!
              </h3>
              <p className="text-muted-foreground mb-6">
                틀린 문제가 없어요. 계속해서 열심히 공부해보세요!
              </p>
              <Button onClick={() => navigate('/')}>
                돌아가기
              </Button>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            {wrongAnswers.map((wrongAnswer) => (
              <Card key={wrongAnswer.id} className="p-4 border-orange-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground mb-1">
                      {wrongAnswer.scenario.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {wrongAnswer.scenario.situation}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {wrongAnswer.scenario.category === 'main' ? '메인' : '비밀임무'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {wrongAnswer.scenario.theme}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-center ml-3">
                    <Badge 
                      variant={wrongAnswer.correct_count >= 2 ? "default" : "secondary"}
                      className="mb-2 text-xs"
                    >
                      {wrongAnswer.correct_count}/3
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => startReview(wrongAnswer)}
                    className="flex-1"
                  >
                    <RotateCcw className="mr-1" size={14} />
                    복습하기
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => removeFromWrongAnswers(wrongAnswer.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 안내 메시지 */}
        {wrongAnswers.length > 0 && (
          <div className="mt-6 p-4 bg-white rounded-lg shadow-sm">
            <p className="text-center text-primary font-medium text-sm">
              💡 같은 문제를 3번 연속 맞추면 오답노트에서 사라져요!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WrongAnswers;