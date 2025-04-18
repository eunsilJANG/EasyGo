import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, IMAGE_BASE_URL } from '../../api/axios';
import './ArticleDetail.scss';
import Comments from './Comments';
import useUserStore from '../../store/userStore';

const ArticleDetail = () => {
  const [article, setArticle] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const { id, email } = useUserStore();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const { id: articleId } = useParams();
  const [likecheck, setLikecheck] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const fetchData = async () => {
    try {
      const response = await api.get(`/api/articles/${articleId}`);
      console.log('상세 페이지 데이터:', response.data);
      setArticle(response.data);
      setEditForm({
        title: response.data.title,
        content: response.data.content
      });
      setExistingFiles(response.data.fileUrls || []);
      if (id) {
        setLikecheck(response.data.likecheck);
      }
      setCommentCount(response.data.commentCount || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      if (error.response && error.response.status === 401) {
        setLoading(false);
      } else {
        alert('게시글을 불러오는데 실패했습니다.');
        navigate('/community');
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [articleId]);

  const checkLogin = () => {
    if (!id) {
      alert('로그인이 필요한 서비스입니다.');
      return false;
    }
    return true;
  };

  const handleDelete = async () => {
    if (!checkLogin()) return;
    if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/articles/${articleId}`);
      alert('게시글이 삭제되었습니다.');
      navigate('/community');
    } catch (error) {
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
    
    // 이미지 미리보기 생성
    selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrls(prev => [...prev, reader.result]); // previewUrls에는 base64로 변환된 이미지 URL 저장
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = (index) => { // 클라이언트 상에서만 제거
    setExistingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdate = async () => {
    if (!checkLogin()) return;
    try {
      const formData = new FormData();
      
      const articleData = {
        title: editForm.title,
        content: editForm.content,
        fileUrls: existingFiles
      };

      formData.append('article', new Blob([JSON.stringify(articleData)], {
        type: 'application/json'
      }));

      if (files.length > 0) {
        files.forEach(file => {
          formData.append('files', file);
        });
      }

      await api.put(`/api/articles/${articleId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      alert('게시글이 수정되었습니다.');
      setIsEditing(false);
      await fetchData();
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Update error:', error);
      alert('게시글 수정에 실패했습니다.');
    }
  };

  const handleLike = async () => {
    if (!checkLogin()) return;
    try {
      const response = await api.post(`/api/articles/${articleId}/like`);
      console.log('좋아요 응답:', response.data);
      
      setLikecheck(response.data.likecheck);
      
      setArticle(prev => ({
        ...prev,
        likeCount: response.data.likeCount
      }));
    } catch (error) {
      console.error('Error:', error);
      alert('좋아요 처리에 실패했습니다.');
    }
  };

  // isAuthor 체크를 userId로 변경
  const isAuthor = article?.userId === id;  // 백엔드에서 보내는 필드명과 일치시킴

  // 좋아요 버튼 클릭 시 로그인 체크
  const handleLikeClick = () => {
    if (!checkLogin()) {
      return;
    }
    handleLike();
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (!article) return <div className="error">게시글을 찾을 수 없습니다.</div>;

  return (
    <div className="article-detail-page">
      <div className="article-container">
        {isEditing ? (
          <form className="article-content editing">
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({...editForm, title: e.target.value})}
              placeholder="제목을 입력하세요"
              className="title-input"
            />
            <textarea
              value={editForm.content}
              onChange={(e) => setEditForm({...editForm, content: e.target.value})}
              placeholder="내용을 입력하세요"
            />
            
            <div className="file-upload-section">       
              <h4>새 파일 추가 (이미지 파일만 가능)</h4>    
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
              />
              {previewUrls.length > 0 && (
                <div className="preview-section">
                  {previewUrls.map((url, index) => ( // previewUrls에 있는 base64 이미지 URL을 <img>로 렌더
                    <div key={index} className="preview-item">
                      <img src={url} alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        className="remove-file"
                        onClick={() => handleRemoveFile(index)}
                      >
                        ×
                      </button>
                    </div> 
                  ))}
                </div>
              )}
              {/* 서버에서 받은 파일 URL을 기반으로 실제 이미지 보여줌 */}
              {existingFiles.length > 0 && (
                <div className="existing-files">
                  <h4>기존 첨부 파일</h4>
                  <div className="file-list">
                    {existingFiles.map((url, index) => (
                      <div key={index} className="file-item">
                        <img 
                          src={`${IMAGE_BASE_URL}${url}`}
                          alt={`기존 이미지 ${index + 1}`}
                        />
                        <button
                          type="button"
                          className="remove-file"
                          onClick={() => handleRemoveExistingFile(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="fixed-button-group">
              <button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">
                취소
              </button>
              <button type="button" onClick={handleUpdate} className="save-btn">
                저장
              </button>
            </div>
          </form>
        ) : ( // 수정 모드가 아닐 때
          <div className="article-content">
            <div className="article-header">
              <div className="title-container">
                <h1 className="title">{article.title}</h1>
                {isAuthor && (
                  <div className="action-buttons">
                    <button onClick={() => setIsEditing(true)} className="edit-btn">
                      수정
                    </button>
                    <button onClick={handleDelete} className="delete-btn">
                      삭제
                    </button>
                  </div>
                )}
              </div>
              <div className="article-meta">
                <span className="author">{article.nickname}</span>
                <span className="separator">·</span>
                <span className="date">{new Date(article.createdAt).toLocaleString()}</span>
                <span className="separator">·</span>
                <span className="views">조회 {article.viewCount || 0}</span>
              </div>
            </div>
            
            {!isEditing && (
              <div className="content">
                {article.content}
              </div>
            )}

            {article.fileUrls && article.fileUrls.length > 0 && (
              <div className="file-section">
                <h4>첨부 파일</h4>
                <div className="file-list">
                  {article.fileUrls.map((url, index) => {
                    const fullUrl = `${IMAGE_BASE_URL}${url}`;
                    return (
                      <div key={index} className="file-item">
                        <img 
                          src={fullUrl}
                          alt={`첨부 이미지 ${index + 1}`}
                          onError={(e) => {
                            console.error('Image load error for URL:', fullUrl);
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 좋아요 표시 */}
            {!isEditing && (
              <div 
                className={`like-display ${likecheck ? 'liked' : ''} ${!id ? 'disabled' : ''}`}
                onClick={handleLikeClick}
              >
                <span className="heart-icon">
                  {likecheck ? '♥' : '♡'}
                </span>
                <span className="like-text">
                  좋아요 {article.likeCount || 0}
                </span>
              </div>
            )}

            {!isEditing && (
              <div className="comments-section">
                <div className="comments-header">
                  <div className="comments-title">
                    <h3>댓글</h3>
                    <span className="comment-count">{commentCount}</span>
                  </div>
                  <button onClick={() => navigate('/community')} className="back-btn">
                    목록으로
                  </button>
                </div>
                <Comments 
                  articleId={articleId} 
                  onCommentCountChange={count => setCommentCount(count)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleDetail; 