import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { api } from '../api/axios';
import useUserStore from '../store/userStore';
import './SetNickname.scss';

const SetNickname = () => {
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const setUserInfo = useUserStore(state => state.setUserInfo);

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

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token');
    if (token) {
      localStorage.setItem('access_token', token);
      
      // 토큰 저장 후 사용자 정보 가져오기
      fetch('/api/user/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(user => {
        setUserInfo({
          email: user.email,
          nickname: user.nickname || ''  // 닉네임이 없을 수 있으므로 빈 문자열 기본값 설정
        });
      })
      .catch(error => console.error('Failed to fetch user info:', error));
    }
  }, [location, setUserInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    try {
      const response = await api.post('/api/user/nickname', {
        nickname
      });

      if (response.status === 200) {
        console.log('닉네임 설정 성공');
        localStorage.setItem('user_nickname', nickname);
        
        // 상태 업데이트
        setUserInfo(prevState => ({
          ...prevState,
          nickname: nickname
        }));

        // localStorage에서 returnUrl 확인
        const returnUrl = localStorage.getItem('returnUrl');
        
        if (returnUrl) {
          // returnUrl이 있으면 해당 페이지로 이동하고 localStorage 클리어
          localStorage.removeItem('returnUrl');
          window.location.href = returnUrl;
        } else {
          // 처음 로그인하는 경우 preferences로 이동
          navigate('/preferences');
        }
      }
    } catch (error) {
      console.error('API 호출 실패:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
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