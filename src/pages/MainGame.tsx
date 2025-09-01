import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, School, TreePine, Bus, Building2, BookOpen, Home } from 'lucide-react';

const MainGame = () => {
  const navigate = useNavigate();

  const themes = [
    {
      title: '학교',
      description: '친구들과 선생님과의 상황',
      icon: School,
      color: 'hsl(var(--kids-primary))',
      theme: 'school'
    },
    {
      title: '놀이터/키즈카페',
      description: '놀이하며 생기는 상황들',
      icon: TreePine,
      color: 'hsl(var(--kids-secondary))',
      theme: 'playground'
    },
    {
      title: '대중교통',
      description: '버스나 지하철에서의 상황',
      icon: Bus,
      color: 'hsl(var(--kids-accent))',
      theme: 'transport'
    },
    {
      title: '병원',
      description: '의사선생님과 병원에서',
      icon: Building2,
      color: 'hsl(var(--kids-warning))',
      theme: 'hospital'
    },
    {
      title: '도서관',
      description: '조용히 공부하는 공간에서',
      icon: BookOpen,
      color: 'hsl(var(--kids-success))',
      theme: 'library'
    },
    {
      title: '가정',
      description: '집에서 가족과 함께',
      icon: Home,
      color: 'hsl(220 100% 45%)',
      theme: 'home'
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
            onClick={() => navigate('/main-menu')}
            className="rounded-full bg-white shadow-md"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">메인 시나리오 게임</h1>
            <p className="text-muted-foreground">상황을 선택해주세요</p>
          </div>
        </div>

        {/* 테마 선택 */}
        <div className="space-y-3">
          {themes.map((theme, index) => {
            const Icon = theme.icon;
            return (
              <Card 
                key={index}
                className="p-4 hover:shadow-lg transition-all duration-300 border-2 cursor-pointer transform hover:scale-105"
                onClick={() => navigate(`/game/${theme.theme}`)}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="p-3 rounded-full text-white flex-shrink-0"
                    style={{ backgroundColor: theme.color }}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {theme.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {theme.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 안내 메시지 */}
        <div className="mt-6 p-4 bg-white rounded-lg shadow-sm">
          <p className="text-center text-primary font-medium text-sm">
            🎮 각 테마마다 20개의 문제가 준비되어 있어요!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainGame;