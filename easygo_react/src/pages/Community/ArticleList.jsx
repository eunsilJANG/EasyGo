import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from "../../api/axios";
import './ArticleList.scss';

const Community = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  const handleArticleClick = async (articleId) => {
    try {
      // 1. 조회수 증가 및 업데이트된 게시글 정보 받기
      const response = await api.post(`/api/articles/${articleId}/view`);
      
      // 2. 게시글 목록 업데이트
      setArticles(prevArticles => 
        prevArticles.map(article => 
          article.id === articleId 
            ? { ...article, viewCount: response.data.viewCount }
            : article
        )
      );

      // 3. 상세 페이지로 이동
      navigate(`/community/articles/${articleId}`);
    } catch (error) {
      console.error('Error:', error);
      navigate(`/community/articles/${articleId}`);
    }
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="community-page">
      <div className="community-header">
        <div className="header-content">
          <h1>커뮤니티</h1>
          <button onClick={() => navigate('/community/write')} className="write-button">
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

