import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookOpen, Zap, Plus, RotateCcw, Settings } from 'lucide-react';

const MainMenu = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: '메인 시나리오 게임',
      description: '상황에 맞는 올바른 행동을 선택해보세요!',
      icon: BookOpen,
      color: 'hsl(var(--kids-primary))',
      path: '/main-game'
    },
    {
      title: '비밀 임무 수행',
      description: '특별히 만들어진 시나리오에 도전해보세요!',
      icon: Zap,
      color: 'hsl(var(--kids-accent))',
      path: '/secret-mission'
    },
    {
      title: '시나리오 추가',
      description: '새로운 상황 문제를 만들어보세요!',
      icon: Plus,
      color: 'hsl(var(--kids-secondary))',
      path: '/add-scenario'
    },
    {
      title: '오답노트',
      description: '틀린 문제를 다시 풀어보세요!',
      icon: RotateCcw,
      color: 'hsl(var(--kids-warning))',
      path: '/wrong-answers'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="text-center py-8 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/difficulty-settings')}
            className="absolute top-4 right-4 rounded-full bg-white shadow-md"
          >
            <Settings size={20} />
          </Button>
          <h1 className="text-3xl font-bold text-primary mb-2">
            🌟 똑똑한 선택왕 🌟
          </h1>
          <p className="text-muted-foreground text-lg">
            올바른 선택을 연습해보아요!
          </p>
        </div>

        {/* 메뉴 버튼들 */}
        <div className="space-y-4">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card 
                key={index}
                className="p-6 hover:shadow-lg transition-all duration-300 border-2 cursor-pointer transform hover:scale-105"
            onClick={() => navigate(item.path)}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="p-3 rounded-full text-white"
                    style={{ backgroundColor: item.color }}
                  >
                    <Icon size={28} />
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
            );
          })}
        </div>

        {/* 하단 격려 메시지 */}
        <div className="text-center mt-8 p-4 bg-white rounded-lg shadow-sm">
          <p className="text-primary font-medium">
            🎯 매일 조금씩 연습하면 더 똑똑해져요! 🎯
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;