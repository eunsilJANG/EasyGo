import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiLink, HiMap, HiUser, HiChat } from 'react-icons/hi';
import './Footer.scss';

const Footer = () => {
  const location = useLocation();

  const navItems = [
    { path: '/content-input', icon: HiLink, text: '콘텐츠' },  
    { path: '/preferences', icon: HiMap, text: '여행' },
    { path: '/mypage', icon: HiUser, text: '마이' },
    { path: '/community', icon: HiChat, text: '커뮤니티' },
  ];

  return (
    <footer className="footer">
      <nav className="footer-nav">
        {navItems.map(({ path, icon: Icon, text }) => (
          <Link
            key={path}
            to={path}
            className={`nav-item ${location.pathname === path ? 'active' : ''}`}
          >
            <Icon />
            <span>{text}</span>
          </Link>
        ))}
      </nav>
    </footer>
  );
};

export default Footer; 