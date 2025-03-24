import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './WriteArticle.scss';

const WriteArticle = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('로그인이 필요합니다.');
        navigate('/login');
        return;
      }

      // 요청 데이터 로깅
      console.log('Sending data:', { title, content });
      console.log('Using token:', token);

      const response = await fetch('http://localhost:8080/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title,
          content
        })
      });

      // 응답 상태 및 데이터 로깅
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        throw new Error(responseText || '글 작성에 실패했습니다.');
      }

      alert('글이 성공적으로 등록되었습니다.');
      navigate('/community');
    } catch (error) {
      console.error('Error posting article:', error);
      alert('글 작성 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <div className="write-article-page">
      <div className="write-article-container">
        <h1>글 작성하기</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <div className="button-group">
            <button type="submit">등록하기</button>
            <button type="button" onClick={() => navigate('/community')}>
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WriteArticle; 