import React from 'react';
import { Link } from 'react-router-dom';
import useUserStore from '../../store/userStore';
import './Header.scss';

const Header = () => {
  const nickname = useUserStore((state) => state.nickname);

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
          <div className="user-profile">
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