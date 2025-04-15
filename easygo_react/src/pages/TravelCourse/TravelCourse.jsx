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
  
  // state 선언
  const [courseData, setCourseData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [showEditButton, setShowEditButton] = useState(true);
  const [isModified, setIsModified] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [isLoading, setIsLoading] = useState(true);
  const [map, setMap] = useState(null);
  
  // ref 선언
  const mapRef = useRef(null);
  const dragSpot = useRef(null);
  const dragOverSpot = useRef(null);

  // 인증 체크
  useEffect(() => {
    if (!nickname) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login');
    }
  }, [nickname, navigate]);

  // 코스 데이터 로드
  useEffect(() => {
    const loadCourseData = async () => {
      setIsLoading(true);
      try {
        if (location.state?.course) {
          setCourseData(location.state.course);
        } else {
          // API에서 사용자의 코스 데이터 가져오기
          const response = await api.get('/api/courses/user');
          if (response.data && response.data.length > 0) {
            setCourseData(response.data[0]); // 가장 최근 코스
          }
        }
      } catch (error) {
        console.error('Error loading course data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCourseData();
  }, [location.state]);

  // 지도 컨테이너 스타일 추가
  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    marginTop: '20px',
    marginBottom: '30px',
    border: '1px solid #dee2e6',
    borderRadius: '8px'
  };

  // initializeMap 함수 수정
  const initializeMap = useCallback(async (dayIndex, mapContainer) => {
    if (!window.kakao?.maps || !mapContainer || !courseData?.days) {
      console.log('Missing required data');
      return;
    }

    try {
      const mapOption = {
        center: new window.kakao.maps.LatLng(37.566826, 126.978656),
        level: 7
      };

      const mapInstance = new window.kakao.maps.Map(mapContainer, mapOption);
      const bounds = new window.kakao.maps.LatLngBounds();
      const geocoder = new window.kakao.maps.services.Geocoder();
      
      // 해당 일차의 스팟들만 처리
      const day = courseData.days[dayIndex];
      const dayColor = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][dayIndex % 4];

      for (let spotIndex = 0; spotIndex < day.spots.length; spotIndex++) {
        const spot = day.spots[spotIndex];
        
        await new Promise((resolve) => {
          geocoder.addressSearch(spot.address, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const position = new window.kakao.maps.LatLng(result[0].y, result[0].x);
              bounds.extend(position);

              // 마커 생성
              const marker = new window.kakao.maps.Marker({
                position: position,
                map: mapInstance
              });

              // 순서를 표시하는 커스텀 오버레이
              const customOverlay = new window.kakao.maps.CustomOverlay({
                position: position,
                content: `<div style="
                  padding: 5px 10px;
                  background: ${dayColor};
                  color: white;
                  border-radius: 15px;
                  font-weight: bold;
                  font-size: 12px;
                  margin-bottom: 35px;
                ">${spotIndex + 1}</div>`,
                yAnchor: 1
              });
              customOverlay.setMap(mapInstance);

              // 인포윈도우 생성
              const infowindow = new window.kakao.maps.InfoWindow({
                content: `
                  <div style="padding:10px;width:200px;">
                    <strong>${spot.name}</strong>
                    <p style="margin-top:5px;font-size:13px;">
                      ${spot.time} - ${spot.description || ''}
                    </p>
                  </div>
                `
              });

              // 마커 클릭 이벤트
              window.kakao.maps.event.addListener(marker, 'click', () => {
                infowindow.open(mapInstance, marker);
              });

              // 이전 스팟과 연결하는 선 그리기
              if (spotIndex > 0) {
                const prevSpot = day.spots[spotIndex - 1];
                geocoder.addressSearch(prevSpot.address, (prevResult, prevStatus) => {
                  if (prevStatus === window.kakao.maps.services.Status.OK) {
                    const prevPosition = new window.kakao.maps.LatLng(
                      prevResult[0].y,
                      prevResult[0].x
                    );
                    
                    const polyline = new window.kakao.maps.Polyline({
                      path: [prevPosition, position],
                      strokeWeight: 3,
                      strokeColor: dayColor,
                      strokeOpacity: 0.7,
                      strokeStyle: 'solid'
                    });
                    polyline.setMap(mapInstance);
                  }
                });
              }
            }
            resolve();
          });
        });
      }

      // 지도 범위 재설정
      if (!bounds.isEmpty()) {
        mapInstance.setBounds(bounds);
      }

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [courseData]);

  // 카카오맵 스크립트 로드 함수 수정
  const loadKakaoMapScript = useCallback(() => {
    if (window.kakao && window.kakao.maps) {
      console.log('Kakao maps already loaded');
      return Promise.resolve();
    }

    const script = document.createElement('script');
    script.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=2a0cdb38e6e033b77f2994ff96234ec4&libraries=services&autoload=false";
    script.async = false;

    script.onload = () => {
      window.kakao.maps.load(() => {
        console.log('Kakao maps loaded successfully');
      });
    };

    document.head.appendChild(script);

    return Promise.resolve();
  }, []);

  // 탭 변경 시 지도 초기화 수정
  useEffect(() => {
    if (activeTab === 'map' && courseData?.days) {
      console.log('Map tab activated, loading map');
      loadKakaoMapScript().then(() => {
        courseData.days.forEach((day, dayIndex) => {
          initializeMap(dayIndex, mapRef.current);
        });
      });
    }
  }, [activeTab, courseData, loadKakaoMapScript, initializeMap]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!courseData) {
    return <div>No course data available.</div>;
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

  const handleSpotDelete = (dayIndex, spotIndex) => {
    if (!window.confirm('이 장소를 일정에서 삭제하시겠습니까?')) {
      return;
    }

    const newData = { ...courseData };
    const newDays = [...newData.days];
    const daySpots = [...newDays[dayIndex].spots];
    
    // 해당 스팟 삭제
    daySpots.splice(spotIndex, 1);
    
    // 남은 스팟들의 시간 재배치
    if (daySpots.length > 0) {
      const startMinutes = 8 * 60;  // 오전 8시 시작
      const gap = Math.floor((12 * 60) / Math.max(1, daySpots.length - 1));  // 12시간 동안 균등 분배
      
      daySpots.forEach((spot, index) => {
        const minutes = startMinutes + (gap * index);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        spot.time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      });
    }

    newDays[dayIndex].spots = daySpots;
    setIsModified(true);
    setCourseData({ ...newData, days: newDays });
  };

  return (
    <div className="travel-course">
      {/* 고정될 헤더 섹션 */}
      <div className="fixed-header">
        <div className="course-header">
          <h2 className="title">여행 일정</h2>
          {location.state?.fromMyPage ? (
            <div className="header-buttons">
              {isModified && (
                <>
                  <button className="save-changes-button" onClick={handleUpdateCourse}>
                    <span className="save-icon">💾</span>
                    변경사항 저장
                  </button>
                  <button className="cancel-button" onClick={() => navigate('/mypage')}>
                    취소
                  </button>
                </>
              )}
              {!isModified && (
                <button className="back-button" onClick={() => navigate('/mypage')}>
                  내일정 전체보기
                </button>
              )}
            </div>
          ) : (
            <button className="save-course-button" onClick={() => setShowSaveModal(true)}>
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
            className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('schedule');
              setIsEditMode(false);
            }}
          >
            일정 확인
          </button>
          <button 
            className={`tab ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('map');
              setIsEditMode(false);
            }}
          >
            지도 확인
          </button>
          <button 
            className={`tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('edit');
              setIsEditMode(true);
            }}
          >
            일정 수정
          </button>
        </div>
      </div>

      {/* 스크롤되는 컨텐츠 섹션 */}
      <div className="scrollable-content">
        {/* 탭 컨텐츠 */}
        {activeTab === 'schedule' && (
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
                                  {isEditMode && (
                                    <button 
                                      className="delete-spot-button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSpotDelete(dayIndex, spotIndex);
                                      }}
                                    >
                                      ×
                                    </button>
                                  )}
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
        )}

        {activeTab === 'map' && (
          <div className="daily-maps">
            {courseData.days.map((day, dayIndex) => (
              <div key={dayIndex} className="day-map-container">
                <div className="day-header">
                  <span className="day-number">{dayIndex + 1}일차</span>
                  <span className="day-date">
                    {format(new Date(day.date), 'M월 d일', { locale: ko })}
                  </span>
                </div>
                <div 
                  ref={el => {
                    if (el) {
                      // 각 지도 컨테이너가 생성될 때 지도 초기화
                      loadKakaoMapScript().then(() => {
                        initializeMap(dayIndex, el);
                      });
                    }
                  }}
                  style={mapContainerStyle}
                />
                <div className="spots-summary">
                  {day.spots.map((spot, spotIndex) => (
                    <div key={spotIndex} className="spot-item">
                      <span className="spot-number">{spotIndex + 1}</span>
                      <span className="spot-time">{spot.time}</span>
                      <span className="spot-name">{spot.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'edit' && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="edit-guide">
              <div className="guide-content">
                <span className="guide-icon">✨</span>
                <span className="guide-text">드래그하여 일정을 변경해보세요!</span>
                <span className="guide-icon">↕️</span>
              </div>
              <div className="guide-sub">원하는 순서로 자유롭게 이동할 수 있어요</div>
            </div>
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
                                  {isEditMode && (
                                    <button 
                                      className="delete-spot-button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSpotDelete(dayIndex, spotIndex);
                                      }}
                                    >
                                      ×
                                    </button>
                                  )}
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
        )}

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
    </div>
  );
};

export default TravelCourse; 