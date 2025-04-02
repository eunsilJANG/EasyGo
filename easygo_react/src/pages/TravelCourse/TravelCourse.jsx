import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLocation, Navigate } from 'react-router-dom';
import './TravelCourse.scss';

const TravelCourse = () => {
  const location = useLocation();
  const course = location.state?.course;

  // 디버깅을 위한 로그 추가
  console.log("Location state:", location.state);
  console.log("Course data:", course);
  console.log("Days data:", course?.days);

  if (!course) {
    console.log("No course data found, redirecting...");
    return <Navigate to="/preferences" replace />;
  }

  // 지역 정보 추출 (첫 번째 장소의 주소에서)
  const getLocationInfo = () => {
    const firstSpot = course.days[0]?.spots[0];
    console.log("First spot:", firstSpot);  // 로그 추가
    if (firstSpot?.address) {
      const addressParts = firstSpot.address.split(' ');
      return `${addressParts[0]} ${addressParts[1] || ''}`.trim();
    }
    return '위치 정보 없음';
  };

  // 시간을 기준으로 정렬하는 함수
  const sortSpotsByTime = (spots) => {
    if (!spots) return [];  // 안전 처리 추가
    console.log("Sorting spots:", spots);  // 로그 추가
    return [...spots].sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });
  };

  // 날짜를 기준으로 정렬하는 함수
  const sortDaysByDate = (days) => {
    if (!days) return [];  // 안전 처리 추가
    console.log("Sorting days:", days);  // 로그 추가
    return [...days].sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const sortedDays = sortDaysByDate(course.days || []);
  console.log("Sorted days:", sortedDays);  // 로그 추가

  return (
    <div className="travel-course">
      <div className="course-header">
        <div className="tabs">
          <button className="tab active">일정 확인</button>
          <button className="tab">일정 수정</button>
          <button className="tab">지도 확인</button>
        </div>
      </div>

      <div className="course-title">
        <h2>여행 일정</h2>
        <div className="location">{getLocationInfo()}</div>
        <div className="tags">
          {course.tags?.map((tag, index) => (
            <span key={index} className="tag">#{tag}</span>
          ))}
        </div>
      </div>

      <div className="course-days">
        {sortedDays.length === 0 ? (
          <div className="no-data">일정 데이터가 없습니다.</div>
        ) : (
          sortedDays.map((day, dayIndex) => {
            console.log(`Rendering day ${dayIndex}:`, day);  // 로그 추가
            const sortedSpots = sortSpotsByTime(day.spots || []);
            return (
              <div key={dayIndex} className="day-container">
                <div className="day-header">
                  <span className="day-number">{dayIndex + 1}일차</span>
                  <span className="day-date">
                    {format(new Date(day.date), 'M월 d일', { locale: ko })}
                  </span>
                </div>

                <div className="timeline">
                  {sortedSpots.map((spot, spotIndex) => {
                    console.log(`Rendering spot ${spotIndex}:`, spot);  // 로그 추가
                    return (
                      <div key={spotIndex} className="timeline-item">
                        <div className="time-column">
                          <div className="time">{spot.time}</div>
                          {spotIndex < sortedSpots.length - 1 && <div className="time-line" />}
                        </div>
                        <div className="content-column">
                          <div className="spot-info">
                            <h3>{spot.name}</h3>
                            <p className="address">{spot.address}</p>
                            {spot.description && <p className="description">{spot.description}</p>}
                          </div>
                          <button className="edit-button">
                            <span className="edit-icon">✏️</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TravelCourse; 