import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, ArrowRight } from 'lucide-react';

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

  const questions: Question[] = [
    // 하: 주어 + 서술어 (기본 구조)
    {
      id: 1,
      question: "친구가 울어요.",
      options: ["도와줘요", "지나가요", "모르는 척해요", "다른 친구랑 놀아요"],
      correctAnswer: 0,
      level: 'easy'
    },
    // 중: 주어 + 서술어 + 목적어 + 보어 
    {
      id: 2,
      question: "민수가 교실에서 조용히 책을 읽고 있어요. 친구들이 크게 떠들고 있어요.",
      options: ["같이 떠들어요", "조용히 해달라고 말해요", "화내요", "그냥 참아요"],
      correctAnswer: 1,
      level: 'medium'
    },
    // 상: 주어 + 서술어 + 부사어 + 목적어 + 보어 (어휘와 수식어 복잡)
    {
      id: 3,
      question: "수업 시간에 옆자리 친구가 갑자기 새로 산 예쁜 지우개를 빌려달라고 정중하게 부탁했어요. 하지만 그 친구는 평소에 빌린 물건을 자주 잃어버리는 습관이 있어요.",
      options: [
        "단호하게 거절해요", 
        "신중하게 조건을 정하고 빌려줘요", 
        "담임선생님께 상황을 말씀드려요", 
        "다른 친구에게 대신 부탁해요"
      ],
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
    questions.forEach((question, index) => {
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

  const progress = ((currentQuestion + 1) / questions.length) * 100;

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
            {questions[currentQuestion].question}
          </h2>

          <div className="space-y-3">
            {questions[currentQuestion].options.map((option, index) => (
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
          {currentQuestion < questions.length - 1 ? '다음 문제' : '완료'}
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