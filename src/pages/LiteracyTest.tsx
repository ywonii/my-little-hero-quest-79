import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  level: 'easy' | 'medium' | 'hard'; // 하, 중, 상
}

const LiteracyTest = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[] | null>(null);

  const fallbackQuestions: Question[] = [
    // 1단계 (하) - 간단한 상황 이해
    {
      id: 1,
      question: "친구가 울고 있어요. 어떻게 해야 할까요?",
      options: ["그냥 지나간다", "달려가서 도와준다", "다른 친구와 논다", "모르는 척한다"],
      correctAnswer: 1,
      level: 'easy'
    },
    // 2단계 (중) - 문장 이해 및 상황 판단
    {
      id: 2,
      question: "민수가 교실에서 책을 읽고 있는데 친구들이 시끄럽게 떠들고 있습니다. 민수는 어떻게 해야 할까요?",
      options: ["같이 떠든다", "조용히 해달라고 말한다", "화를 낸다", "그냥 참는다"],
      correctAnswer: 1,
      level: 'medium'
    },
    // 3단계 (상) - 복잡한 상황 분석 및 판단
    {
      id: 3,
      question: "수업 시간에 짝ꍍ이 지우개를 빌려달라고 했는데, 내가 가져온 지우개는 새 것이고 하나밖에 없습니다. 하지만 짝ꍍ은 평소에 물건을 잘 잃어버리는 편이에요. 어떻게 하는 것이 가장 좋을까요?",
      options: ["절대 빌려주지 않는다", "조건을 정하고 빌려준다", "선생님께 말씀드린다", "다른 친구에게 부탁한다"],
      correctAnswer: 1,
      level: 'hard'
    }
  ];

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // 테스트 완료
      calculateLevel(newAnswers);
      setIsComplete(true);
    }
  };

  const calculateLevel = (userAnswers: number[]) => {
    let correctCount = 0;
    (questions || fallbackQuestions).forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) {
        correctCount++;
      }
    });

    let level: 'beginner' | 'intermediate' | 'advanced';
    if (correctCount === 3) {
      level = 'advanced'; // 상급 (3학년 수준)
    } else if (correctCount === 2) {
      level = 'intermediate'; // 중급 (2학년 수준)
    } else {
      level = 'beginner'; // 초급 (1학년 수준)
    }

    // 결과를 localStorage에 저장
    localStorage.setItem('literacyLevel', level);
    localStorage.setItem('literacyTestCompleted', 'true');
  };

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);
        // 캐시 확인
        const cached = sessionStorage.getItem('literacy_quiz_v1');
        if (cached) {
          setQuestions(JSON.parse(cached));
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke('generate-literacy-quiz', {
          body: { count: 3 }
        });
        if (error || !data?.success || !Array.isArray(data.questions)) {
          setQuestions(null);
          setLoading(false);
          return;
        }
        // 타입 정규화
        const normalized: Question[] = data.questions.map((q: any, idx: number) => ({
          id: q.id ?? idx + 1,
          question: String(q.question),
          options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
          correctAnswer: Number(q.correctAnswer ?? 0),
          level: (q.level === 'easy' || q.level === 'medium' || q.level === 'hard') ? q.level : 'medium',
        }));
        // 최소 3문항 보장
        const picked = normalized.slice(0, 3);
        sessionStorage.setItem('literacy_quiz_v1', JSON.stringify(picked));
        setQuestions(picked);
      } catch (e) {
        setQuestions(null);
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, []);

  const qList = questions || fallbackQuestions;
  const progress = ((currentQuestion + 1) / qList.length) * 100;

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4 flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-primary mb-4">
            국어 실력 테스트 완료!
          </h2>
          <p className="text-muted-foreground mb-6">
            이제 여러분의 실력에 맞는 재미있는 게임을 즐길 수 있어요!
          </p>
          <Button 
            onClick={() => navigate('/main-menu')}
            className="w-full"
          >
            게임 시작하기
            <ArrowRight className="ml-2" size={16} />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="text-primary" size={28} />
            <h1 className="text-2xl font-bold text-primary">
              국어 실력 테스트
            </h1>
          </div>
          <p className="text-muted-foreground">
            게임을 시작하기 전에 간단한 국어 문제를 풀어보세요!
          </p>
        </div>

        {/* 진행률 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>문제 {currentQuestion + 1} / {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 질문 */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4 leading-relaxed">
            {qList[currentQuestion].question}
          </h2>

          <div className="space-y-3">
            {qList[currentQuestion].options.map((option, index) => (
              <Button
                key={index}
                variant={selectedAnswer === index ? "default" : "outline"}
                className="w-full text-left justify-start p-4 h-auto"
                onClick={() => handleAnswerSelect(index)}
              >
                <span className="text-base leading-relaxed">{option}</span>
              </Button>
            ))}
          </div>
        </Card>

        {/* 다음 버튼 */}
        <Button 
          onClick={handleNextQuestion}
          disabled={selectedAnswer === null}
          className="w-full"
          size="lg"
        >
          {currentQuestion < qList.length - 1 ? '다음 문제' : '완료'}
          <ArrowRight className="ml-2" size={16} />
        </Button>

        {/* 격려 메시지 */}
        <div className="text-center mt-6 p-4 bg-white rounded-lg shadow-sm">
          <p className="text-primary font-medium text-sm">
            🌟 천천히 생각해서 답해보세요! 🌟
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiteracyTest;