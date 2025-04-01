import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useUserStore from '../../store/userStore';
import './Header.scss';

const Header = () => {
  const nickname = useUserStore((state) => state.nickname);

  useEffect(() => {
    console.log('Current nickname:', nickname);
  }, [nickname]);

  const handleProfileClick = () => {
    // 현재 페이지 URL을 localStorage에 저장
    localStorage.setItem('returnUrl', window.location.pathname);
    window.location.href = '/set-nickname';
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
        {nickname && (
          <div className="user-profile" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
            <span className="profile-icon">{nickname[0]}</span>
            <span className="username">{nickname}님</span>
          </div>
        )}
        <button className="menu-button">
          <span className="menu-icon"></span>
        </button>
      </div>
    </header>
  );
};

export default Header; 