import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import './Comments.scss';

const Comments = ({ articleId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const fetchComments = async () => {
    try {
      const response = await api.get(`/api/articles/${articleId}/comments`);
      console.log('Fetched comments:', response.data);
      setComments(response.data);
    } catch (error) {
      console.error('댓글 불러오기 실패:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post(`/api/articles/${articleId}/comments`, { content: newComment});
      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      alert('댓글 작성에 실패했습니다.');
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/api/articles/${articleId}/comments/${commentId}`);
      await fetchComments();
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleEditStart = (comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleEditSubmit = async (commentId) => {
    if (!editContent.trim()) return;

    try {
      await api.put(`/api/articles/${articleId}/comments/${commentId}`, { content: editContent });
      setEditingId(null);
      setEditContent('');
      await fetchComments();
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      alert('댓글 수정에 실패했습니다.');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  useEffect(() => {
    fetchComments();
  }, [articleId]);

  return (
    <div className="comments-section">
      <h3>댓글</h3>
      
      <form onSubmit={handleCommentSubmit} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
          rows="3"
        />
        <button type="submit" className="submit-comment">댓글 등록</button>
      </form>

      <div className="comments-list">
        {comments.map((comment) => {
          console.log('Comment full data:', comment);
          
          return (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-author">{comment.nickname}</span>
                <span className="comment-date">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
                {comment.minecheck && (
                  <div className="comment-actions">
                    {editingId === comment.id ? (
                      <>
                        <button 
                          onClick={() => handleEditSubmit(comment.id)}
                          className="save-btn"
                        >
                          저장
                        </button>
                        <button 
                          onClick={handleEditCancel}
                          className="cancel-btn"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEditStart(comment)}
                          className="edit-btn"
                        >
                          수정
                        </button>
                        <button 
                          onClick={() => handleCommentDelete(comment.id)}
                          className="delete-btn"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="comment-content">
                {editingId === comment.id ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows="3"
                  />
                ) : (
                  comment.content
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Comments; 