import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, ArrowLeft, BookOpen } from 'lucide-react';

const DifficultySettings = () => {
  const navigate = useNavigate();

  const setDifficultyLevel = (level: 'beginner' | 'intermediate' | 'advanced') => {
    localStorage.setItem('literacyLevel', level);
    localStorage.setItem('literacyTestCompleted', 'true');
    navigate('/main-menu');
  };

  const levels = [
    {
      level: 'beginner' as const,
      title: '쉬운 단계',
      description: '간단한 단어와 짧은 문장으로 구성된 게임',
      emoji: '🌱',
      color: 'hsl(var(--kids-success))'
    },
    {
      level: 'intermediate' as const,
      title: '보통 단계', 
      description: '조금 더 긴 문장과 다양한 어휘로 구성된 게임',
      emoji: '🌿',
      color: 'hsl(var(--kids-primary))'
    },
    {
      level: 'advanced' as const,
      title: '어려운 단계',
      description: '복잡한 문장과 다양한 상황으로 구성된 게임',
      emoji: '🌳',
      color: 'hsl(var(--kids-accent))'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4">
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
            <h1 className="text-2xl font-bold text-primary">난이도 설정</h1>
            <p className="text-muted-foreground">원하는 단계를 선택해주세요</p>
          </div>
        </div>

        {/* 난이도 선택 */}
        <div className="space-y-4">
          {levels.map((item) => (
            <Card 
              key={item.level}
              className="p-6 hover:shadow-lg transition-all duration-300 border-2 cursor-pointer transform hover:scale-105"
              onClick={() => setDifficultyLevel(item.level)}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-full text-white text-2xl flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                >
                  {item.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 테스트 버튼 */}
        <div className="mt-6">
          <Button 
            onClick={() => navigate('/literacy-test')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <BookOpen className="mr-2" size={16} />
            국어 실력 테스트 먼저 해보기
          </Button>
        </div>

        {/* 안내 메시지 */}
        <div className="text-center mt-6 p-4 bg-white rounded-lg shadow-sm">
          <p className="text-primary font-medium text-sm">
            💡 언제든지 설정에서 난이도를 바꿀 수 있어요!
          </p>
        </div>
      </div>
    </div>
  );
};

export default DifficultySettings;