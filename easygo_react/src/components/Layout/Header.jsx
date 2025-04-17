import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useUserStore from '../../store/userStore';
import './Header.scss';
import { api } from '../../api/axios';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const nickname = useUserStore((state) => state.nickname);
  const setUserInfo = useUserStore((state) => state.setUserInfo);

  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    console.log('Current nickname:', nickname);
  }, [nickname]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    // 현재 페이지 URL을 localStorage에 저장
    localStorage.setItem('returnUrl', window.location.pathname);
    window.location.href = '/set-nickname';
  };

  const handleLogout = () => {
    // 로그아웃 처리
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_nickname');
    setUserInfo({ nickname: null });
    setIsMenuOpen(false);
    navigate('/login');
  };

  const handleWithdrawal = async () => {
    const confirmed = window.confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (confirmed) {
      try {
        const token = localStorage.getItem('access_token');
        // API 호출 시 인증 헤더 추가
        const response = await api.delete('/api/user/withdrawal', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.status === 200) {
          // 로컬 스토리지 클리어
          localStorage.clear();
          
          // 유저 정보 초기화
          setUserInfo({ nickname: null });
          
          // 메뉴 닫기
          setIsMenuOpen(false);
          
          // 로그인 페이지로 이동
          navigate('/login');
          
          alert('회원탈퇴가 완료되었습니다.');
        }
      } catch (error) {
        console.error('회원탈퇴 실패:', error);
        if (error.response?.status === 401) {
          alert('로그인이 필요합니다.');
          navigate('/login');
        } else {
          alert('회원탈퇴 처리 중 오류가 발생했습니다.');
        }
      }
    }
  };

  return (
    <header className="header">
      <div className="header__left">
        <Link to="/" className="header__logo">
          <span className="logo-text-easy">EASY</span>
          <span className="logo-text-travel">GO</span>
        </Link>
      </div>
      <div className="header__right">
        {nickname ? (
          <>
            <div className="user-profile" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
              <span className="profile-icon">{nickname[0]}</span>
              <span className="username">{nickname}님</span>
            </div>
            <div className="menu-container" ref={menuRef}>
              <button 
                className={`menu-button ${isMenuOpen ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <span className="menu-icon"></span>
              </button>
              {isMenuOpen && (
                <div className="dropdown-menu">
                  <Link 
                    to="/set-nickname" 
                    className="dropdown-item"
                    onClick={() => {
                      localStorage.setItem('returnUrl', window.location.pathname);
                      setIsMenuOpen(false);
                    }}
                  >
                    닉네임 변경
                  </Link>
                  <button className="dropdown-item" onClick={handleLogout}>
                    로그아웃
                  </button>
                  <button 
                    className="dropdown-item withdrawal" 
                    onClick={handleWithdrawal}
                  >
                    회원탈퇴
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          !isLoginPage && (
            <Link to="/login" className="login-button">
              로그인
            </Link>
          )
        )}
      </div>
    </header>
  );
};

export default Header; 