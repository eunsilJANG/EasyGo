import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './SetNickname.scss';

const SetNickname = () => {
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 초기화 함수를 별도로 분리
  const initializeToken = () => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('access_token', urlToken);
      // URL에서 토큰 파라미터 제거
      navigate('/set-nickname', { replace: true });
    }
  };

  // 컴포넌트 마운트 시 한 번만 실행
  useEffect(() => {
    initializeToken();
  }, []); // 빈 의존성 배열

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    try {
      console.log('Sending token:', localStorage.getItem('access_token'));

      const response = await fetch('http://localhost:8080/api/user/nickname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        credentials: 'include',
        body: JSON.stringify({ nickname })
      });

      console.log('Response status:', response.status);

      if (response.status === 200) {
        console.log('닉네임 설정 성공');
        localStorage.setItem('user_nickname', nickname);
        navigate('/preferences');
        return; // 여기서 완전히 종료
      }

      // 200이 아닌 경우에만 실행
      const errorText = await response.text();
      console.error('서버 응답:', errorText);
      
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
      } else {
        console.error('닉네임 설정 실패:', response.status);
      }
    } catch (error) {
      console.error('API 호출 실패:', error);
    }
  };

  return (
    <div className="set-nickname-page">
      <div className="nickname-container">
        <h2>환영합니다!</h2>
        <p className="welcome-message">사용하실 닉네임을 설정해주세요.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요 (2-10자)"
            maxLength={10}
            minLength={2}
            required
          />
          <button type="submit">시작하기</button>
        </form>
      </div>
    </div>
  );
};

export default SetNickname; 