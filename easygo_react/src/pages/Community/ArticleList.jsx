import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from "../../api/axios";
import './ArticleList.scss';
import useUserStore from '../../store/userStore';

const Community = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { id } = useUserStore();

  const fetchArticles = async () => {
    try {
      const response = await api.get('/api/articles');
      setArticles(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching articles:', error);
      setError('게시글을 불러오는데 실패했습니다.');
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleBackToList = () => {
    fetchArticles();
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.floor((now - date) / 1000);

    if (diffTime < 60) return '방금 전';
    if (diffTime < 3600) return `${Math.floor(diffTime / 60)}분 전`;
    if (diffTime < 86400) return `${Math.floor(diffTime / 3600)}시간 전`;
    if (diffTime < 604800) return `${Math.floor(diffTime / 86400)}일 전`;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }

  const handleWriteClick = () => {
    if (!id) {
      alert('로그인이 필요한 서비스입니다.');
      return;
    }
    navigate('/community/write');
  };

  const handleArticleClick = async (articleId) => {
    if (!id) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/api/articles/${articleId}/view`);
      setArticles(prevArticles => 
        prevArticles.map(article => 
          article.id === articleId 
            ? { ...article, viewCount: response.data.viewCount }
            : article
        )
      );
      navigate(`/community/articles/${articleId}`);
    } catch (error) {
      console.error('Error:', error);
      if (error.response && error.response.status === 401) {
        alert('로그인이 필요한 서비스입니다.');
        navigate('/login');
      }
    }
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="community-page">
      <div className="community-header">
        <div className="header-content">
          <h1>커뮤니티</h1>
          <button onClick={handleWriteClick} className="write-button">
            글쓰기
          </button>
        </div>
      </div>

      <div className="community-container">
        <div className="post-list">
          {articles.map((article) => (
            <div 
              key={article.id} 
              className="post-item"
              onClick={() => handleArticleClick(article.id)}
            >
              <div className="post-info">
                <div className="post-title">{article.title}</div>
                <div className="post-meta">
                  <span className="author">{article.nickname}</span>
                  <span className="separator">•</span>
                  <span className="date">{formatDate(article.createdAt)}</span>
                  <span className="separator">•</span>
                  <span className="views">조회수 {article.viewCount ?? 0}</span>
                  <span className="separator">•</span>
                  <span className="likes">좋아요 {article.likeCount ?? 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Community;

