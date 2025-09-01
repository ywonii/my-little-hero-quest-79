import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainMenu from './MainMenu';

const MainMenuWrapper = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 문해력 테스트를 완료했는지 확인
    const isTestCompleted = localStorage.getItem('literacyTestCompleted');
    
    if (!isTestCompleted) {
      // 테스트를 완료하지 않았다면 문해력 테스트 페이지로 이동
      navigate('/literacy-test');
    }
  }, [navigate]);

  return <MainMenu />;
};

export default MainMenuWrapper;