import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import './UserPreferences.scss';
import useUserStore from '../store/userStore';

const UserPreferences = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRegion, setSelectedRegion] = useState('');
  const [startDate, setStartDate] = useState(new Date('2025-03-08'));
  const [endDate, setEndDate] = useState(new Date('2025-03-09'));
  const [selectedAge, setSelectedAge] = useState(null);
  const [travelers, setTravelers] = useState({
    성인: 0,
    청소년: 0,
    어린이: 0,
    영유아: 0,
    반려견: 0
  });
  const setNickname = useUserStore((state) => state.setNickname);

  const regions = [
    { id: 'seoul', name: '서울' },
    { id: 'busan', name: '부산' },
    { id: 'jeju', name: '제주' },
    { id: 'gangwon', name: '강원도' },
    { id: 'gyeonggi', name: '경기도' },
    { id: 'incheon', name: '인천' },
    { id: 'gyeongsang', name: '경상도' },
    { id: 'jeolla', name: '전라도' },
    { id: 'chungcheong', name: '충청도' }
  ];

  const handleTravelerChange = (type, operation) => {
    setTravelers(prev => ({
      ...prev,
      [type]: operation === 'add' ? prev[type] + 1 : Math.max(0, prev[type] - 1)
    }));
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  const ageGroups = ['10대', '20대', '30대', '40대', '50대', '60대', '70대', '80대'];

  useEffect(() => {
    // token이 이미 localStorage에 있다면 사용자 정보 가져오기
    navigate('/preferences', { replace: true });
    const existingToken = localStorage.getItem('access_token');
    if (existingToken) {
      console.log('Using existing token:', existingToken);
      fetch('http://localhost:8080/api/user/me', {
        headers: {
          'Authorization': `Bearer ${existingToken}`
        },
        credentials: 'include'
      })
      .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) throw new Error('Failed to fetch user info');
        return response.json();
      })
      .then(user => {
        console.log('User data:', user);
        if (user && user.nickname) {
          localStorage.setItem('user_nickname', user.nickname);
          console.log('Nickname saved:', user.nickname);
          setNickname(user.nickname);
        }
      })
      .catch(error => {
        console.error('Error fetching user info:', error);
      });
      return;
    }

    // URL에서 token을 찾아 저장 (OAuth 로그인 시)
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      console.log('New token from URL:', token);
      localStorage.setItem('access_token', token);
      
      // 토큰 저장 후 URL 정리
      navigate('/preferences', { replace: true });
      
      fetch('http://localhost:8080/api/user/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })
      .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) throw new Error('Failed to fetch user info');
        return response.json();
      })
      .then(user => {
        console.log('User data:', user);
        if (user && user.nickname) {
          localStorage.setItem('user_nickname', user.nickname);
          console.log('Nickname saved:', user.nickname);
          setNickname(user.nickname);
        }
      })
      .catch(error => {
        console.error('Error fetching user info:', error);
      });
    }
  }, [location, setNickname, navigate]);

  return (
    <div className="page-container">
      <div className="user-preferences">
        <h2>여행 정보 설정</h2>

        {/* 지역 선택 섹션 */}
        <section className="region-section">
          <h3>여행 지역</h3>
          <div className="region-grid">
            {regions.map((region) => (
              <button
                key={region.id}
                className={`region-button ${selectedRegion === region.id ? 'active' : ''}`}
                onClick={() => setSelectedRegion(region.id)}
              >
                {region.name}
              </button>
            ))}
          </div>
        </section>

        {/* 날짜 선택 섹션 */}
        <section className="date-section">
          <h3>여행 일정</h3>
          <div className="date-display">
            <div className="calendar-container">
              <DatePicker
                selected={startDate}
                onChange={handleDateChange}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                inline
                locale={ko}
                monthsShown={1}
                minDate={new Date()}
              />
            </div>
            <div className="selected-info">
              <div className="calendar-preview">
                <div className="calendar-header">선택된 일정</div>
                <div className="selected-dates">
                  {startDate ? startDate.toLocaleDateString() : ''} ~ 
                  {endDate ? endDate.toLocaleDateString() : ''}
                </div>
              </div>
              <div className="weather-info">
                <span className="weather-icon">☀️</span>
                <div className="weather-text">
                  예상 날씨 - 맑음<br />
                  <small>2025-03-07 기준 날씨 정보입니다.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 연령대 선택 섹션 */}
        <section className="age-section">
          <h3>연령대</h3>
          <div className="age-groups">
            {ageGroups.map((age) => (
              <button
                key={age}
                className={`age-button ${selectedAge === age ? 'active' : ''}`}
                onClick={() => setSelectedAge(age)}
              >
                {age}
              </button>
            ))}
          </div>
        </section>

        {/* 인원 설정 섹션 */}
        <section className="travelers-section">
          <h3>일행</h3>
          <div className="travelers-list">
            {Object.entries(travelers).map(([type, count]) => (
              <div key={type} className="traveler-item">
                <span className="traveler-type">{type}</span>
                <div className="traveler-controls">
                  <button 
                    className="control-button"
                    onClick={() => handleTravelerChange(type, 'subtract')}
                  >
                    -
                  </button>
                  <span className="traveler-count">{count}명</span>
                  <button 
                    className="control-button"
                    onClick={() => handleTravelerChange(type, 'add')}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <button className="save-button">설정 완료</button>
      </div>
    </div>
  );
};

export default UserPreferences;
