import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyPage.scss';
import { api } from '../../api/axios';

const MyPage = () => {
  const [savedCourses, setSavedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // 저장된 일정 불러오기
  useEffect(() => {
    const fetchSavedCourses = async () => {
      try {
        const response = await api.get('/api/courses/user');
        console.log('Fetched courses:', response.data); // 데이터 구조 확인
        setSavedCourses(response.data);
      } catch (error) {
        console.error('Error fetching courses:', error);
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
    navigate('/travel-course', { 
      state: { 
        course: course,
        fromMyPage: true  // 마이페이지에서 왔다는 표시
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
            console.log('Course data:', course); // 각 코스의 데이터 구조 확인
            return (
              <div 
                key={course.id} // MongoDB에서 온 id 필드 사용
                className="course-card"
                onClick={() => handleCourseClick(course)}
              >
                <div className="course-info">
                  <h3>{course.name}</h3>
                  <div className="course-details">
                    <span className="location">{course.location}</span>
                    <span className="date">
                      {new Date(course.days[0].date).toLocaleDateString()} - 
                      {new Date(course.days[course.days.length - 1].date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button 
                  className="delete-button"
                  onClick={(e) => handleDeleteCourse(course.id, e)} // MongoDB에서 온 id 필드 사용
                >
                  삭제
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