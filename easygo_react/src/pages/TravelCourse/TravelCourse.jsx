import React, { useState, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import './TravelCourse.scss';
import { api } from '../../api/axios';
import useUserStore from '../../store/userStore';

const TravelCourse = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { nickname } = useUserStore();
  
  // 모든 state를 최상단에 선언
  const [courseData, setCourseData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [showEditButton, setShowEditButton] = useState(true);
  const [isModified, setIsModified] = useState(false);

  // ref 선언
  const dragSpot = useRef(null);
  const dragOverSpot = useRef(null);

  // 인증 체크
  useEffect(() => {
    if (!nickname) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login');
      return;
    }
  }, [nickname, navigate]);

  // 코스 데이터 로드
  useEffect(() => {
    if (location.state?.course) {
      setCourseData(location.state.course);
    } else if (location.state?.fromMyPage) {
      navigate('/mypage');
    }
  }, [location.state, navigate]);

  // 조기 반환 처리
  if (!courseData) {
    return null;  // 또는 로딩 컴포넌트
  }

  const getLocationInfo = () => {
    if (!courseData?.days) return '위치 정보 없음';
    
    const locations = new Set();
    courseData.days.forEach(day => {
      day.spots.forEach(spot => {
        if (spot.address) {
          const addressParts = spot.address.split(' ');
          const region = addressParts.slice(0, 2).join(' ');
          locations.add(region);
        }
      });
    });

    const uniqueLocations = Array.from(locations);
    return uniqueLocations.length === 0 ? '위치 정보 없음' : uniqueLocations.join(', ');
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const sourceDay = parseInt(source.droppableId);
    const destinationDay = parseInt(destination.droppableId);

    const newData = { ...courseData };
    const newDays = [...newData.days];

    // 시간 재배치 로직
    const redistributeTimes = (spots) => {
      if (spots.length === 0) return spots;
      const startMinutes = 8 * 60;
      const gap = Math.floor((12 * 60) / Math.max(1, spots.length - 1));
      
      return spots.map((spot, index) => ({
        ...spot,
        time: `${String(Math.floor((startMinutes + (gap * index)) / 60)).padStart(2, '0')}:${String((startMinutes + (gap * index)) % 60).padStart(2, '0')}`
      }));
    };

    if (sourceDay === destinationDay) {
      const daySpots = [...newDays[sourceDay].spots];
      const [movedSpot] = daySpots.splice(source.index, 1);
      daySpots.splice(destination.index, 0, movedSpot);
      newDays[sourceDay].spots = redistributeTimes(daySpots);
    } else {
      const sourceSpots = [...newDays[sourceDay].spots];
      const destinationSpots = [...newDays[destinationDay].spots];
      const [movedSpot] = sourceSpots.splice(source.index, 1);
      destinationSpots.splice(destination.index, 0, movedSpot);
      newDays[sourceDay].spots = redistributeTimes(sourceSpots);
      newDays[destinationDay].spots = redistributeTimes(destinationSpots);
    }

    setIsModified(true);
    setCourseData({ ...newData, days: newDays });
  };

  const handleSaveCourse = async () => {
    if (!courseName.trim()) {
      alert('일정 이름을 입력해주세요.');
      return;
    }

    try {
      const courseToSave = {
        ...courseData,
        name: courseName,
        createdAt: new Date().toISOString(),
      };

      await api.post('/api/courses', courseToSave);
      alert('일정이 저장되었습니다.');
      setShowSaveModal(false);
      navigate('/mypage');
    } catch (error) {
      if (error.response?.status === 401) {
        alert('로그인이 필요한 서비스입니다.');
        navigate('/login');
      } else {
        alert('일정 저장 중 오류가 발생했습니다.');
      }
    }
  };

  const handleUpdateCourse = async () => {
    try {
      // 수정할 데이터 구성
      const updateData = {
        id: courseData._id,  // 코스 ID
        name: courseData.name,  // 코스 이름
        days: courseData.days.map(day => ({
          date: day.date,
          spots: day.spots.map(spot => ({
            name: spot.name,
            address: spot.address,
            description: spot.description,
            time: spot.time,
            // 필요한 spot 데이터만 포함
          }))
        })),
        tags: courseData.tags
      };

      // 서버로 전송
      const response = await api.post('/api/courses', updateData);
      
      if (response.status === 200) {
        alert('일정이 수정되었습니다.');
        navigate('/mypage');
      }
    } catch (error) {
      console.error('Error updating course:', error);
      if (error.response?.status === 401) {
        alert('로그인이 필요한 서비스입니다.');
        navigate('/login');
      } else {
        alert(`일정 수정 중 오류가 발생했습니다: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  return (
    <div className="travel-course">
      <div className="course-header">
        <h2 className="title">여행 일정</h2>
        {location.state?.fromMyPage ? (
          <div className="header-buttons">
            {isModified && (
              <>
                <button 
                  className="save-changes-button"
                  onClick={handleUpdateCourse}
                >
                  <span className="save-icon">💾</span>
                  변경사항 저장
                </button>
                <button 
                  className="cancel-button"
                  onClick={() => navigate('/mypage')}
                >
                  취소
                </button>
              </>
            )}
            {!isModified && (
              <button 
                className="back-button"
                onClick={() => navigate('/mypage')}
              >
                내일정 전체보기
              </button>
            )}
          </div>
        ) : (
          <button 
            className="save-course-button"
            onClick={() => setShowSaveModal(true)}
          >
            <span className="save-icon">💾</span>
            일정 저장하기
          </button>
        )}
      </div>

      <div className="course-info">
        <div className="location">{getLocationInfo()}</div>
        <div className="tags-container">
          {courseData.tags?.map((tag, index) => (
            <span key={index} className="tag">#{tag}</span>
          ))}
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${!isEditMode ? 'active' : ''}`}
          onClick={() => setIsEditMode(false)}
        >
          일정 확인
        </button>
        <button 
          className={`tab ${isEditMode ? 'active' : ''}`}
          onClick={() => setIsEditMode(true)}
        >
          일정 수정
        </button>
        <button className="tab">지도 확인</button>
      </div>

      {isEditMode && (
        <div className="edit-guide">
          <div className="guide-content">
            <span className="guide-icon">✨</span>
            <span className="guide-text">드래그하여 일정을 변경해보세요!</span>
            <span className="guide-icon">↕️</span>
          </div>
          <div className="guide-sub">원하는 순서로 자유롭게 이동할 수 있어요</div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="course-days">
          {courseData.days.map((day, dayIndex) => (
            <div key={dayIndex} className="day-container">
              <div className="day-header">
                <span className="day-number">{dayIndex + 1}일차</span>
                <span className="day-date">
                  {format(new Date(day.date), 'M월 d일', { locale: ko })}
                </span>
              </div>

              <Droppable droppableId={String(dayIndex)}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`timeline ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {day.spots.map((spot, spotIndex) => (
                      <Draggable
                        key={`${dayIndex}-${spotIndex}`}
                        draggableId={`spot-${dayIndex}-${spotIndex}`}
                        index={spotIndex}
                        isDragDisabled={!isEditMode}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`timeline-item ${isEditMode ? 'draggable' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
                            <div className="time-column">
                              <div className="time">{spot.time}</div>
                              {spotIndex < day.spots.length - 1 && <div className="time-line" />}
                            </div>
                            <div className="content-column">
                              <div className="spot-info">
                                <h3>{spot.name}</h3>
                                <p className="address">{spot.address}</p>
                                {spot.description && (
                                  <p className="description">{spot.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showSaveModal && (
        <div className="save-modal">
          <div className="modal-content">
            <h3>일정 저장하기</h3>
            <input
              type="text"
              placeholder="일정 이름을 입력해주세요"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="course-name-input"
            />
            <div className="modal-buttons">
              <button onClick={handleSaveCourse}>저장</button>
              <button onClick={() => setShowSaveModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelCourse; 