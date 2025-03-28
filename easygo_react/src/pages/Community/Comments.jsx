import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import './Comments.scss';

const Comments = ({ articleId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [openReplies, setOpenReplies] = useState(new Set());

  const fetchComments = async () => {
    try {
      const response = await api.get(`/api/articles/${articleId}/comments`);
      console.log('Fetched comments:', response.data);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  useEffect(() => {
    if (articleId) {
      fetchComments();
    }
  }, [articleId]);

  // 댓글 작성
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post(`/api/articles/${articleId}/comments`, {
        content: newComment,
        parentId: null
      });
      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('댓글 작성 실패:', error);
    }
  };

  // 답글 작성
  const handleReplySubmit = async (parentId, content) => {
    if (!content.trim()) return;

    try {
      await api.post(`/api/articles/${articleId}/comments`, {
        content: content,
        parentId: parentId
      });
      await fetchComments();
    } catch (error) {
      console.error('답글 작성 실패:', error);
    }
  };

  // 답글 토글 함수 수정
  const toggleReplies = (commentId) => {
    setOpenReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // 댓글 수정
  const handleCommentEdit = async (commentId, newContent) => {
    try {
      await api.put(`/api/articles/${articleId}/comments/${commentId}`, {
        content: newContent
      });
      
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              content: newContent,
              isEdited: true
            };
          }
          if (comment.children) {
            return {
              ...comment,
              children: comment.children.map(reply => 
                reply.id === commentId 
                  ? { ...reply, content: newContent, isEdited: true }
                  : reply
              )
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('댓글 수정 실패:', error);
    }
  };

  // 댓글 삭제
  const handleCommentDelete = async (commentId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await api.delete(`/api/articles/${articleId}/comments/${commentId}`);
        await fetchComments();
      } catch (error) {
        console.error('댓글 삭제 실패:', error);
      }
    }
  };

  // 댓글 컴포넌트
  const CommentItem = ({ comment, children }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    
    // 현재 로그인한 사용자 ID와 댓글 작성자 ID 비교
    const currentUserId = 1; // 실제로는 로그인 사용자 ID를 받아와야 함
    const isAuthor = comment.userId === currentUserId;

    const replyCount = children?.length || 0;

    return (
      <div className={`comment-item ${comment.parentId ? 'reply' : 'parent-comment'}`}>
        <div className="comment-header">
          <div className="comment-info">
            <span className="nickname">{comment.nickname}</span>
            <span className="date">{new Date(comment.createdAt).toLocaleString()}</span>
          </div>
          {/* 수정/삭제 버튼을 우측에 배치 */}
          <div className="comment-buttons">
            <button 
              className="edit-btn"
              onClick={() => setIsEditing(true)}
            >
              수정
            </button>
            <button 
              className="delete-btn"
              onClick={() => handleCommentDelete(comment.id)}
            >
              삭제
            </button>
          </div>
        </div>
        
        {isEditing ? (
          <div className="edit-form">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="edit-textarea"
            />
            <div className="button-group">
              <button
                className="save-btn"
                onClick={() => {
                  if (editContent.trim()) {
                    handleCommentEdit(comment.id, editContent);
                    setIsEditing(false);
                  }
                }}
              >
                저장
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="comment-content">
              {comment.content}
              {comment.isEdited && <span style={{ color: '#666', marginLeft: '8px', fontSize: '0.9em' }}>(수정됨)</span>}
            </div>
            <div className="comment-actions">
              {!comment.parentId && (
                <>
                  {replyCount > 0 && (
                    <button 
                      className="view-replies-btn"
                      onClick={() => toggleReplies(comment.id)}
                    >
                      {openReplies.has(comment.id) ? '답글 숨기기' : '답글 보기'}
                    </button>
                  )}
                  <button 
                    className="reply-btn"
                    onClick={() => setShowReplyForm(!showReplyForm)}
                  >
                    {showReplyForm ? '답글 취소' : '답글 작성'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
        
        {showReplyForm && (
          <div className="reply-form">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="답글을 입력하세요..."
            />
            <div className="button-group">
              <button 
                className="submit-btn"
                onClick={() => {
                  if (replyContent.trim()) {
                    handleReplySubmit(comment.id, replyContent);
                    setReplyContent('');
                    setShowReplyForm(false);
                  }
                }}
              >
                등록
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent('');
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}
        
        {children && children.length > 0 && openReplies.has(comment.id) && (
          <div className="replies">
            {children.map(reply => (
              <CommentItem 
                key={reply.id} 
                comment={reply}
                children={[]}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // 댓글 목록 렌더링
  const renderComments = () => {
    return comments.map(comment => {
      // children이 있는 최상위 댓글만 렌더링
      if (comment.children) {
        return (
          <div key={comment.id} className="comment-thread">
            <CommentItem 
              comment={comment} 
              children={comment.children}
            />
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="comments-section">
      <div className="comment-form">
        <textarea
          placeholder="댓글을 입력하세요..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button onClick={handleCommentSubmit}>댓글 등록</button>
      </div>

      <div className="comments-list">
        {renderComments()}
      </div>
    </div>
  );
};

export default Comments; 