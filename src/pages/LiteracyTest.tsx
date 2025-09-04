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
    // 1단계 (하) - 짧은 문장, 기본 어휘
    {
      id: 1,
      question: "친구가 넘어졌어요.",
      options: ["그냥 간다", "도와준다", "웃는다", "말한다"],
      correctAnswer: 1,
      level: 'easy'
    },
    // 2단계 (중) - 중간 길이 문장, 상황 설명 추가
    {
      id: 2,
      question: "나는 교실에서 책을 읽고 있어요. 친구들이 시끄럽게 떠들어요.",
      options: ["같이 떠든다", "조용히 해달라고 한다", "화를 낸다", "그냥 참는다"],
      correctAnswer: 1,
      level: 'medium'
    },
    // 3단계 (상) - 긴 문장, 배경 정보와 세부 상황 포함
    {
      id: 3,
      question: "수업 시간에 짝꿍이 새 지우개를 빌려달라고 했어요. 내가 가져온 지우개는 새 것이고 하나밖에 없어요. 짝꿍은 평소에 물건을 자주 잃어버려요.",
      options: ["빌려주지 않는다", "약속하고 빌려준다", "선생님께 말한다", "다른 친구에게 부탁한다"],
      correctAnswer: 1,
      level: 'hard'
    },
    // 추가 문제들 - 다양한 상황에서의 문해력 측정
    {
      id: 4,
      question: "급식 시간이에요. 내 앞 친구가 우유를 흘렸어요.",
      options: ["모른 척한다", "휴지를 준다", "웃는다", "선생님을 부른다"],
      correctAnswer: 1,
      level: 'easy'
    },
    {
      id: 5,
      question: "나는 운동장에서 축구를 하고 있어요. 다른 반 친구가 같이 하고 싶다고 해요.",
      options: ["안 된다고 한다", "같이 하자고 한다", "무시한다", "도망간다"],
      correctAnswer: 1,
      level: 'medium'
    },
    {
      id: 6,
      question: "도서관에서 조용히 책을 읽고 있을 때 옆 친구가 계속 말을 걸어서 다른 사람들이 쳐다봐요. 나는 집중해서 책을 읽고 싶은데 친구의 기분을 상하게 하고 싶지도 않아요.",
      options: ["큰 소리로 조용히 하라고 한다", "작은 소리로 나중에 이야기하자고 한다", "책을 덮고 나간다", "사서 선생님께 말한다"],
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
    let easyCorrect = 0;
    let mediumCorrect = 0;
    let hardCorrect = 0;
    
    questions.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) {
        if (question.level === 'easy') easyCorrect++;
        else if (question.level === 'medium') mediumCorrect++;
        else if (question.level === 'hard') hardCorrect++;
      }
    });

    let level: 'beginner' | 'intermediate' | 'advanced';
    
    // 하급: 쉬운 문제 중심으로 맞춘 경우
    if (hardCorrect === 0 && mediumCorrect <= 1) {
      level = 'beginner';
    }
    // 상급: 어려운 문제를 대부분 맞춘 경우  
    else if (hardCorrect >= 1 && mediumCorrect >= 1) {
      level = 'advanced';
    }
    // 중급: 중간 수준의 문제를 맞춘 경우
    else {
      level = 'intermediate';
    }

    console.log('📚 Literacy test results:', { easyCorrect, mediumCorrect, hardCorrect, level });

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
            문해력 테스트 완료!
          </h2>
          <p className="text-muted-foreground mb-6">
            여러분의 읽기 실력에 맞는 재미있는 상황 게임을 준비했어요!
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
              문해력 테스트
            </h1>
          </div>
          <p className="text-muted-foreground">
            상황을 이해하는 게임을 시작하기 전에 간단한 문제를 풀어보세요!
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