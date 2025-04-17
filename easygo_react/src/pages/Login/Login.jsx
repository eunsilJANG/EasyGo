import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import googleLogo from '../../assets/img/google.png';
import './Login.scss';
import useUserStore from '../../store/userStore';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setNickname = useUserStore((state) => state.setNickname);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        throw new Error(data || '로그인에 실패했습니다.');
      }

      // JWT 토큰을 localStorage에 저장
      if (data.jwtToken) {
        localStorage.setItem('access_token', data.jwtToken);
        // 사용자 정보 저장
        useUserStore.getState().setUserInfo(data.user);
        // 로그인 성공 시 preferences 페이지로 직접 이동
        navigate('/preferences');
      } else {
        throw new Error('토큰이 없습니다.');
      }

      // 로그인 성공
      console.log('로그인 성공:', data);
      
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google'; // Spring Security가 설정한 로컬 경로로, 사용자가 인증을 시작하기 위해 리디렉션되는 URL
  };

  const handleKakaoLogin = () => {
    // 카카오 로그인 로직
  };

  const handleGuestLogin = () => {
    // 비회원으로 시작하기 - 로컬 스토리지 초기화 및 preferences 페이지로 이동
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_nickname');
    useUserStore.getState().setUserInfo({ nickname: null });
    navigate('/preferences');
  };

  return (
    <div className="login-page">
      <Link to="/" className="back-button">
        <span className="back-arrow">←</span>
      </Link>
      
      <div className="login-container">
        <div className="logo">
          <span className="logo-text-easy">EASY</span>
          <span className="logo-text-go">GO</span>
          <span className="logo-icon">✈</span>
        </div>
        
        <div className="welcome-text">
          <h2>환영합니다!</h2>
          <p>간편하게 로그인하고 여행을 시작해보세요</p>
        </div>
  
        <div className="login-box">
          <button 
            onClick={handleGoogleLogin} 
            className="google-login-button"
            disabled={isLoading}
          >
            <img src={googleLogo} alt="Sign in with Google" />
          </button>
          
          <button 
            onClick={handleGuestLogin}
            className="guest-login-button"
            disabled={isLoading}
          >
            <span className="guest-icon">👋</span>
            비회원으로 둘러보기
          </button>
        </div>
      </div>

      {/* <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-message">{error}</div>}
        <div className="input-group">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            disabled={isLoading}
          />
        </div>
        <div className="input-group">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            disabled={isLoading}
          />
        </div>
        <button 
          type="submit" 
          className="login-button"
          disabled={isLoading}
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
        <div className="form-footer">
          <Link to="/signup" className="signup-link">회원가입</Link>
          <Link to="/forgot-password" className="forgot-password-link">비밀번호 찾기</Link>
        </div>
      </form>

      <div className="divider">
        <span>또는</span>
      </div> */}

      {/* <div className="footer-links">
        <Link to="/privacy" className="footer-link">개인정보보호침</Link>
        <Link to="/terms" className="footer-link">이용약관</Link>
      </div> */}
    </div>
  );
};

export default Login;
