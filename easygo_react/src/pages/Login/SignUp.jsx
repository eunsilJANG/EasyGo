import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignUp.scss';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nickname: formData.nickname
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '회원가입에 실패했습니다.');
      }

      // 회원가입 성공
      console.log('회원가입 성공:', data.message);
      // 로그인 페이지로 이동
      navigate('/login');
      
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <Link to="/" className="back-button">
        <i className="fas fa-arrow-left back-arrow"></i>
      </Link>
      
      <div className="signup-container">
        <div className="logo">
          <i className="fas fa-paper-plane logo-icon"></i>
          <div className="logo-text">Easy Travel</div>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="input-group">
            <div className="input-field">
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                name="email"
                placeholder="이메일"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="input-field">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                name="password"
                placeholder="비밀번호"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="input-field">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                name="confirmPassword"
                placeholder="비밀번호 확인"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="input-field">
              <i className="fas fa-user"></i>
              <input
                type="text"
                name="nickname"
                placeholder="닉네임"
                value={formData.nickname}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="signup-button"
            disabled={isLoading}
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>

          <div className="social-signup">
            <div className="divider">
              <span>또는</span>
            </div>

            <button 
              type="button" 
              className="google-signup-button"
              disabled={isLoading}
            >
              <img src="/google-icon.png" alt="Google" />
              <span>Google로 회원가입</span>
            </button>

            <button 
              type="button" 
              className="kakao-signup-button"
              disabled={isLoading}
            >
              <img src="/kakao-icon.png" alt="Kakao" />
              <span>Kakao로 회원가입</span>
            </button>
          </div>
        </form>

        <div className="footer-links">
          <Link to="/login" className="footer-link">이미 계정이 있으신가요?</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp; 