import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const AddScenario = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [problemDescription, setProblemDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleGenerate = async () => {
    if (!problemDescription.trim()) {
      toast({
        title: "입력 필요",
        description: "문제 상황을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-scenarios', {
        body: { problemDescription: problemDescription.trim() }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "시나리오 생성 완료! 🎉",
          description: `${data.count}개의 새로운 시나리오가 생성되었습니다.`,
        });

        // 비밀 임무 수행 페이지로 이동
        navigate('/secret-mission');
      } else {
        throw new Error(data.error || '시나리오 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error generating scenarios:', error);
      toast({
        title: "생성 실패",
        description: "시나리오 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateScenarios = async () => {
    setIsRegenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('regenerate-scenarios', {
        body: {}
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "시나리오 재생성 완료! 🔄",
          description: `${data.count}개의 새로운 메인 시나리오가 생성되었습니다.`,
        });
      } else {
        throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error regenerating scenarios:', error);
      toast({
        title: "재생성 실패",
        description: "시나리오 재생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-primary">시나리오 추가</h1>
            <p className="text-muted-foreground">새로운 상황 문제를 만들어요</p>
          </div>
        </div>

        {/* 안내 카드 */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="text-center">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-bold text-primary mb-2">AI가 도와드려요!</h3>
            <p className="text-sm text-muted-foreground">
              아이가 겪는 문제 상황을 설명해주시면, 
              자동으로 10개의 교육 시나리오를 만들어드려요!
            </p>
          </div>
        </Card>

        {/* 입력 폼 */}
        <Card className="p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 text-center">
            🤔 아이에게 어떤 문제점이 있나요?
          </h3>
          
          <Textarea
            placeholder="예시: 학교에서 친구들과 갈등이 생길 때 어떻게 해야 할지 모르겠어요. 화가 나면 소리를 지르거나 때리려고 해요."
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            className="min-h-32 mb-4 text-base"
            disabled={isGenerating}
          />
          
          <div className="bg-yellow-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-yellow-800">
              <strong>💡 팁:</strong> 구체적으로 설명할수록 더 좋은 시나리오가 만들어져요!
            </p>
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || !problemDescription.trim()}
            className="w-full py-3 text-lg font-bold mb-4"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                AI가 시나리오를 만들고 있어요...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                시나리오 10개 생성하기
              </>
            )}
          </Button>

          <div className="border-t pt-4">
            <h4 className="font-bold text-center mb-3">🔄 메인 시나리오 재생성</h4>
            <p className="text-sm text-muted-foreground text-center mb-4">
              기존 메인 시나리오를 새로운 내용으로 재생성합니다
            </p>
            <Button 
              onClick={handleRegenerateScenarios}
              disabled={isRegenerating}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  재생성 중...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  메인 시나리오 재생성
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* 예시 카드 */}
        <Card className="p-4">
          <h4 className="font-bold text-primary mb-3">📝 입력 예시</h4>
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <strong>학교 상황:</strong> 수업 중에 질문하는 것을 어려워해요
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <strong>친구 관계:</strong> 친구들과 놀 때 양보하지 못해요
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <strong>공공장소:</strong> 마트에서 떼를 쓰며 물건을 사달라고 해요
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AddScenario;