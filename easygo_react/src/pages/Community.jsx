import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Community.scss';

const Community = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 로그인 상태 확인
  const isLoggedIn = () => {
    return localStorage.getItem('access_token') !== null;
  };

  // 글쓰기 버튼 클릭 핸들러
  const handleWriteClick = () => {
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login');
      return;
    }
    navigate('/community/write');
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8080/api/articles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          throw new Error('로그인이 필요한 서비스입니다.');
        }
        throw new Error('게시글을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      // 데이터 구조 확인을 위한 로그 추가
      console.log('전체 데이터:', data);
      console.log('첫 번째 게시글의 전체 필드:', data[0] ? Object.keys(data[0]) : '데이터 없음');
      console.log('첫 번째 게시글:', data[0]);
      setArticles(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 날짜 포맷팅 함수 더 단순하게
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.floor((now - date) / 1000); // 초 단위 차이

    // 1분 이내
    if (diffTime < 60) {
      return '방금 전';
    }
    
    // 1시간 이내
    if (diffTime < 3600) {
      const minutes = Math.floor(diffTime / 60);
      return `${minutes}분 전`;
    }
    
    // 24시간 이내
    if (diffTime < 86400) {
      const hours = Math.floor(diffTime / 3600);
      return `${hours}시간 전`;
    }
    
    // 7일 이내
    if (diffTime < 604800) {
      const days = Math.floor(diffTime / 86400);
      return `${days}일 전`;
    }
    
    // 7일 이후
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="community-page">
      <div className="community-container">
        <div className="header">
          <h1>커뮤니티</h1>
          <button onClick={handleWriteClick} className="write-button">
            글쓰기
          </button>
        </div>

        <div className="post-list">
          {articles.length === 0 ? (
            <div className="no-posts">
              아직 게시글이 없습니다. 첫 게시글을 작성해보세요!
            </div>
          ) : (
            articles.map((article) => (
              <Link to={`/community/articles/${article.id}`} key={article.id} className="post-item">
                <div className="post-info">
                  <div className="post-title">{article.title}</div>
                  <div className="post-meta">
                    <span className="author">{article.nickname}</span>
                    <span className="separator">•</span>
                    <span className="date">{formatDate(article.createdAt)}</span>
                  </div>
                </div>
                <div className="post-preview">
                  {article.content}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;

