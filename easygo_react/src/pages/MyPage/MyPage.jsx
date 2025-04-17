import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyPage.scss';
import { api } from '../../api/axios';

const MyPage = () => {
  const [savedCourses, setSavedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const navigate = useNavigate();

  // 저장된 일정 불러오기
  useEffect(() => {
    const fetchSavedCourses = async () => {
      try {
        const response = await api.get('/api/courses/user');
        console.log('=== API 응답 데이터 상세 로그 ===');
        console.log('전체 응답:', JSON.stringify(response.data, null, 2));
        
        // 각 코스별 상세 정보 로깅
        response.data.forEach((course, index) => {
          console.log(`\n[코스 ${index + 1} 상세 정보]`);
          console.log('코스 전체 데이터:', JSON.stringify(course, null, 2));
          console.log('코스 ID:', course.id);
          console.log('코스 이름:', course.name);
          console.log('위치:', course.location);
          console.log('소스 URL:', course.source_url);
          console.log('source_url 타입:', typeof course.source_url);
          console.log('일정:', course.days);
        });

        setSavedCourses(response.data);
      } catch (error) {
        console.error('=== API 에러 상세 로그 ===');
        console.error('에러 객체:', error);
        console.error('에러 응답:', error.response);
        console.error('에러 메시지:', error.message);
        
        if (error.response?.status === 401) {
          alert('로그인이 필요한 서비스입니다.');
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedCourses();
  }, []);

  // 일정 클릭 시 상세 페이지로 이동
  const handleCourseClick = (course) => {
    const courseId = course.id || course._id;
    
    // location이 URL 형태인지 확인하는 함수
    const isLocationUrl = (location) => {
      try {
        return location && (
          location.includes('youtube.com') ||
          location.includes('blog.naver.com') ||
          location.includes('in.naver.com') ||
          location.includes('tv.naver.com')
        );
      } catch {
        return false;
      }
    };
    
    navigate('/travel-course', { 
      state: { 
        course: {
          ...course,
          id: courseId
        },
        fromMyPage: true,
        hideMap: isLocationUrl(course.location)  // location이 URL인 경우에만 지도 숨김
      } 
    });
  };

  // 일정 삭제 처리
  const handleDeleteCourse = async (courseId, e) => {
    e.stopPropagation(); // 상위 요소 클릭 이벤트 방지
    
    if (!courseId) {
      console.error('Invalid course ID:', courseId);
      alert('유효하지 않은 코스입니다.');
      return;
    }

    if (!window.confirm('정말로 이 일정을 삭제하시겠습니까?')) {
      return;
    }

    try {
      console.log('Deleting course with ID:', courseId); // 삭제하려는 ID 확인
      await api.delete(`/api/courses/${courseId}`);
      
      setSavedCourses(prevCourses => 
        prevCourses.filter(course => course.id !== courseId)
      );
      
      alert('일정이 삭제되었습니다.');
    } catch (error) {
      console.error('Delete error:', error);
      
      if (error.response?.status === 401) {
        alert('로그인이 필요한 서비스입니다.');
        navigate('/login');
      } else {
        alert('일정 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 제목 수정 모드 시작
  const handleEditStart = (course) => {
    setEditingId(course.id);
    setEditingTitle(course.name);
  };

  // 제목 수정 취소
  const handleEditCancel = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  // 제목 수정 저장
  const handleEditSave = async (courseId) => {
    if (!editingTitle.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      await api.patch(`/api/courses/${courseId}`, { name: editingTitle });
      
      setSavedCourses(prevCourses =>
        prevCourses.map(course =>
          course.id === courseId
            ? { ...course, name: editingTitle }
            : course
        )
      );
      
      setEditingId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Update error:', error);
      if (error.response?.status === 401) {
        alert('로그인이 필요한 서비스입니다.');
        navigate('/login');
      } else {
        alert('제목 수정 중 오류가 발생했습니다.');
      }
    }
  };

  // 키보드 이벤트 처리
  const handleKeyPress = (e, courseId) => {
    if (e.key === 'Enter') {
      handleEditSave(courseId);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  if (isLoading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="mypage">
      <div className="mypage-header">
        <div className="header-left">
          <h1>My trip</h1>
        </div>
        <div className="header-right">
          <button 
            className="new-course-button"
            onClick={() => navigate('/preferences')}
          >
            + 새 일정 만들기
          </button>
        </div>
      </div>

      {savedCourses.length === 0 ? (
        <div className="no-courses">
          <p>저장된 일정이 없습니다.</p>
          <p>새로운 여행 일정을 만들어보세요!</p>
        </div>
      ) : (
        <div className="courses-grid">
          {savedCourses.map(course => {
            console.log('\n=== 코스 카드 렌더링 정보 ===');
            console.log('렌더링 중인 코스:', course);
            console.log('source_url 존재 여부:', !!course.source_url);
            console.log('source_url 값:', course.source_url);
            
            return (
              <div 
                key={course.id}
                className="course-card"
                onClick={() => !editingId && handleCourseClick(course)}
              >
                <div className="course-info">
                  {editingId === course.id ? (
                    <div className="title-edit-container">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, course.id)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="title-edit-input"
                      />
                      <div className="edit-buttons">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSave(course.id);
                          }}
                          className="save-button"
                        >
                          저장
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCancel();
                          }}
                          className="cancel-button"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h3 className="course-title">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStart(course);
                        }}
                        className="title-wrapper"
                      >
                        {course.name}
                        <button className="edit-button">수정</button>
                      </div>
                    </h3>
                  )}
                  <div className="course-details">
                    <span className="location">
                      {course.location && (
                        <div className="url-display-container">
                          <span className="url-type">
                            {(() => {
                              const url = course.location;
                              if (url.includes('youtube.com')) return '🎥 유튜브 콘텐츠';
                              if (url.includes('blog.naver.com')) return '📝 네이버 블로그';
                              if (url.includes('in.naver.com')) return '📱 네이버 인플루언서';
                              if (url.includes('tv.naver.com')) return '📺 네이버 TV';
                              return '🔗 원본 콘텐츠';
                            })()}
                          </span>
                        </div>
                      )}
                    </span>
                    <span className="date">
                      {new Date(course.days[0].date).toLocaleDateString()} - 
                      {new Date(course.days[course.days.length - 1].date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button 
                  className="delete-button"
                  onClick={(e) => handleDeleteCourse(course.id, e)}
                  title="일정 삭제"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyPage; 