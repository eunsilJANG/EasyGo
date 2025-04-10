import React, { useState, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLocation, Navigate } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import './TravelCourse.scss';

const TravelCourse = () => {
  const location = useLocation();
  const [courseData, setCourseData] = useState(location.state?.course);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragSpot = useRef(null);
  const dragOverSpot = useRef(null);

  // isEditMode 상태 변화 확인
  useEffect(() => {
    console.log('Edit Mode Changed:', isEditMode);
    
    // DOM이 준비된 후에 드래그 핸들 존재 여부 확인
    const timelineItem = document.querySelector('.timeline-item');
    const dragHandle = document.querySelector('.drag-handle');
    
    console.log('Timeline item exists:', !!timelineItem);
    console.log('Drag handle exists:', !!dragHandle);
    
    if (timelineItem) {
      console.log('Timeline item draggable:', timelineItem.draggable);
    }
  }, [isEditMode]);

  // courseData 확인
  useEffect(() => {
    console.log('Course Data:', courseData);
  }, [courseData]);

  // 스크롤 방지 함수
  const handleScroll = useCallback((e) => {
    if (isEditMode && isDragging) {
      const scrollArea = document.querySelector('.course-days');
      if (scrollArea) {
        const rect = scrollArea.getBoundingClientRect();
        const buffer = 50;

        if (e.clientY < rect.top + buffer) {
          scrollArea.scrollBy(0, -10);
        } else if (e.clientY > rect.bottom - buffer) {
          scrollArea.scrollBy(0, 10);
        }
      }
    }
  }, [isEditMode, isDragging]);

  // 컴포넌트 마운트/언마운트 시 스크롤 이벤트 처리
  useEffect(() => {
    if (isEditMode) {
      window.addEventListener('wheel', handleScroll, { passive: false });
      return () => window.removeEventListener('wheel', handleScroll);
    }
  }, [isEditMode, handleScroll]);

  // courseData 디버깅
  useEffect(() => {
    console.log('Initial courseData:', location.state?.course);
    console.log('Days array:', location.state?.course?.days);
  }, []);

  if (!courseData) {
    return <Navigate to="/preferences" replace />;
  }

  // 드래그 시작 시 상태 확인
  const onDragStart = (result) => {
    console.log('Drag started:', {
      draggableId: result.draggableId,
      source: result.source,
      isEditMode
    });
  };

  // 드래그 종료 시 상태 확인
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const sourceDay = parseInt(source.droppableId);
    const destinationDay = parseInt(destination.droppableId);

    const newData = { ...courseData };
    const newDays = [...newData.days];

    // 시간 간격 계산 함수 (분 단위)
    const calculateTimeGap = (spots) => {
      if (spots.length <= 1) return 90; // 기본 간격 90분
      const totalMinutes = (20 * 60) - (8 * 60); // 20:00 - 08:00 = 12시간
      return Math.floor(totalMinutes / (spots.length - 1));
    };

    // 시간 문자열을 분으로 변환
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // 분을 시간 문자열로 변환 (HH:mm 형식)
    const minutesToTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    // 스팟들의 시간 재배치
    const redistributeTimes = (spots) => {
      if (spots.length === 0) return spots;

      // 첫 스팟은 08:00에 시작
      const startMinutes = 8 * 60; // 08:00
      const gap = calculateTimeGap(spots);

      return spots.map((spot, index) => ({
        ...spot,
        time: minutesToTime(startMinutes + (gap * index))
      }));
    };

    // 같은 날짜 내에서의 이동
    if (sourceDay === destinationDay) {
      const daySpots = [...newDays[sourceDay].spots];
      const [movedSpot] = daySpots.splice(source.index, 1);
      daySpots.splice(destination.index, 0, movedSpot);
      // 시간 재배치
      newDays[sourceDay].spots = redistributeTimes(daySpots);
    } 
    // 다른 날짜로의 이동
    else {
      const sourceSpots = [...newDays[sourceDay].spots];
      const destinationSpots = [...newDays[destinationDay].spots];
      const [movedSpot] = sourceSpots.splice(source.index, 1);
      destinationSpots.splice(destination.index, 0, movedSpot);
      // 양쪽 날짜 모두 시간 재배치
      newDays[sourceDay].spots = redistributeTimes(sourceSpots);
      newDays[destinationDay].spots = redistributeTimes(destinationSpots);
    }

    setCourseData({ ...newData, days: newDays });
  };

  console.log('Current course data:', courseData);

  const getLocationInfo = () => {
    if (!courseData?.days) return '위치 정보 없음';
    
    // 모든 장소의 주소에서 지역 정보 추출
    const locations = new Set();
    
    courseData.days.forEach(day => {
      day.spots.forEach(spot => {
        if (spot.address) {
          const addressParts = spot.address.split(' ');
          // 시/도와 시/군/구 정보 추출 (예: '제주특별자치도 제주시')
          const region = addressParts.slice(0, 2).join(' ');
          locations.add(region);
        }
      });
    });

    // 중복 제거된 지역 정보를 문자열로 변환
    const uniqueLocations = Array.from(locations);
    
    if (uniqueLocations.length === 0) return '위치 정보 없음';
    if (uniqueLocations.length === 1) return uniqueLocations[0];
    
    // 여러 지역인 경우 쉼표로 구분
    return uniqueLocations.join(', ');
  };

  const sortSpotsByTime = (spots) => {
    if (!spots) return [];
    return [...spots].sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });
  };

  const handleSpotMove = (fromDayIndex, fromSpotIndex, toDayIndex, toSpotIndex) => {
    setCourseData(prev => {
      const newData = { ...prev };
      const newDays = [...newData.days];
      
      // 원본 위치에서 spot 제거
      const [movedSpot] = newDays[fromDayIndex].spots.splice(fromSpotIndex, 1);
      
      // 새로운 위치에 spot 삽입
      newDays[toDayIndex].spots.splice(toSpotIndex, 0, movedSpot);
      
      // 시간 순서대로 재정렬
      newDays[toDayIndex].spots = sortSpotsByTime(newDays[toDayIndex].spots);
      
      return { ...newData, days: newDays };
    });
  };

  // 타임라인 영역 스크롤 처리
  const handleTimelineScroll = useCallback((e) => {
    if (isEditMode) {
        const timelineArea = document.querySelector('.timeline-container');
        if (timelineArea) {
            const rect = timelineArea.getBoundingClientRect();
            const mouseY = e.clientY;
            const scrollSpeed = 15;
            const scrollBuffer = 100; // 스크롤 시작 영역 크기

            // 타임라인 상단 근처에서 드래그 중일 때
            if (mouseY < rect.top + scrollBuffer) {
                timelineArea.scrollBy({
                    top: -scrollSpeed,
                    behavior: 'smooth'
                });
            }
            // 타임라인 하단 근처에서 드래그 중일 때
            else if (mouseY > rect.bottom - scrollBuffer) {
                timelineArea.scrollBy({
                    top: scrollSpeed,
                    behavior: 'smooth'
                });
            }
        }
    }
  }, [isEditMode]);

  return (
    <div className="travel-course">
      <div className="course-header">
        <h2 className="title">여행 일정</h2>
        <div className="course-info">
          <div className="location">{getLocationInfo()}</div>
          <div className="tags-container">
            {courseData.tags?.map((tag, index) => (
              <span key={index} className="tag">#{tag}</span>
            ))}
          </div>
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
        <button 
          className="tab"
          onClick={() => {/* 지도 보기 로직 */}}
        >
          지도 확인
        </button>
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
                        disableInteractiveElementBlocking={true}
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
    </div>
  );
};

export default TravelCourse; 