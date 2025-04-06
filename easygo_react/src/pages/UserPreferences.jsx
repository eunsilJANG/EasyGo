import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import './UserPreferences.scss';
import useUserStore from '../store/userStore';
import { api, aiApi } from '../api/axios';

const UserPreferences = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRegion, setSelectedRegion] = useState('');
  const [startDate, setStartDate] = useState(new Date('2025-03-08'));
  const [endDate, setEndDate] = useState(new Date('2025-03-09'));
  const [selectedAges, setSelectedAges] = useState([]);
  const [travelers, setTravelers] = useState({
    성인: 0,
    청소년: 0,
    어린이: 0,
    영유아: 0,
    반려견: 0
  });
  const [selectedAreas, setSelectedAreas] = useState([]);
  const setUserInfo = useUserStore((state) => state.setUserInfo);

  const regions = [
    { 
      id: 'seoul', 
      name: '서울',
      areas: ['강남구', '서초구', '종로구', '마포구', '용산구', '성동구', '광진구', '중구', '송파구', '강동구', '강서구', '영등포구', '동작구', '관악구', '서대문구', '은평구']
    },
    { 
      id: 'jeju', 
      name: '제주',
      areas: ['제주시', '서귀포시', '애월읍', '한림읍', '협재', '중문', '성산읍', '표선면', '조천읍', '구좌읍', '우도면', '추자면', '남원읍', '대정읍']
    },
    { 
      id: 'busan', 
      name: '부산',
      areas: ['해운대구', '수영구', '남구', '중구', '서구', '동구', '영도구', '부산진구', '연제구', '동래구', '금정구', '북구', '사상구', '사하구', '기장군']
    },
    { 
      id: 'gangwon', 
      name: '강원도',
      areas: ['춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '양구군', '인제군', '고성군', '양양군']
    },
    { 
      id: 'gyeonggi', 
      name: '경기도',
      areas: ['수원시', '성남시', '의정부시', '안양시', '부천시', '광명시', '평택시', '동두천시', '안산시', '고양시', '과천시', '구리시', '남양주시', '오산시', '시흥시', '군포시', '의왕시', '하남시', '용인시', '파주시', '이천시', '안성시', '김포시', '화성시', '광주시', '양주시', '포천시']
    },
    { 
      id: 'incheon', 
      name: '인천',
      areas: ['중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군']
    },
    { 
      id: 'gyeongsang', 
      name: '경상도',
      areas: [
        // 경북
        '포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '군위군', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군',
        // 경남
        '창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'
      ]
    },
    { 
      id: 'jeolla', 
      name: '전라도',
      areas: [
        // 전북
        '전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군',
        // 전남
        '목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'
      ]
    },
    { 
      id: 'chungcheong', 
      name: '충청도',
      areas: [
        // 충북
        '청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군',
        // 충남
        '천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'
      ]
    }
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
    const params = new URLSearchParams(location.search);
    const tokenInUrl = params.get('token');
    
    // 1. URL에 토큰이 있으면 저장
    if (tokenInUrl) {
      console.log('New token from URL:', tokenInUrl);
      localStorage.setItem('access_token', tokenInUrl);
      navigate('/preferences', { replace: true });
    }

    // 2. 사용자 정보 가져오기
    const fetchUserInfo = async () => {
      try {
        const response = await api.get('/api/user/me');
        console.log('User data:', response.data);
        
        if (response.data?.nickname) {
          localStorage.setItem('user_nickname', response.data.nickname);
          console.log('Nickname saved:', response.data.nickname);
          setUserInfo(prevState => ({
            ...prevState,
            nickname: response.data.nickname
          }));
          
          // 닉네임을 저장한 후 페이지 새로고침
          window.location.reload();
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    // 첫 로드 시에만 실행되도록 플래그 확인
    const isFirstLoad = sessionStorage.getItem('isFirstLoad') !== 'false';
    if (isFirstLoad && (tokenInUrl || localStorage.getItem('access_token'))) {
      sessionStorage.setItem('isFirstLoad', 'false'); // 플래그 업데이트
      fetchUserInfo();
    }
  }, [setUserInfo, navigate, location.search]);

  const onSavePreferences = async () => {
    try {
        const selectedRegionObj = regions.find(r => r.id === selectedRegion);
        if (!selectedRegionObj) {
            alert('지역을 선택해주세요.');
            return;
        }

        if (selectedRegionObj.areas && selectedAreas.length === 0) {
            alert('세부 지역을 하나 이상 선택해주세요.');
            return;
        }

        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        const preferences = {
            region: selectedRegionObj.name,
            areas: selectedAreas,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            ageGroups: selectedAges,
            travelers: {
                adult: travelers['성인'],
                teen: travelers['청소년'],
                child: travelers['어린이'],
                infant: travelers['영유아'],
                pet: travelers['반려견']
            }
        };

        console.log("Sending preferences:", preferences);
        const response = await aiApi.post('generate_course', preferences);
        console.log("Received response:", response.data);

        if (response.data) {
            navigate('/travel-course', { 
                state: { 
                    course: response.data 
                } 
            });
        } else {
            throw new Error('No data received from server');
        }

    } catch (error) {
        console.error("Error generating course:", error);
        if (error.response) {
            console.error("Error status:", error.response.status);
            console.error("Error data:", error.response.data);
        }
        alert('여행 코스 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

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
                onClick={() => {
                  setSelectedRegion(region.id);
                  setSelectedAreas([]); // 지역 변경 시 선택된 세부 지역 초기화
                }}
              >
                {region.name}
              </button>
            ))}
          </div>
          
          {/* 선택된 지역의 세부 지역 선택 UI */}
          {selectedRegion && regions.find(r => r.id === selectedRegion)?.areas && (
            <div className="area-section">
              <h4>세부 지역 선택 (다중 선택 가능)</h4>
              <div className="area-grid">
                {regions.find(r => r.id === selectedRegion)?.areas.map((area) => (
                  <button
                    key={area}
                    className={`area-button ${selectedAreas.includes(area) ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedAreas(prev => 
                        prev.includes(area) 
                          ? prev.filter(a => a !== area)
                          : [...prev, area]
                      );
                    }}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          )}
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
          <h3>연령대 (다중 선택 가능)</h3>
          <div className="age-groups">
            {ageGroups.map((age) => (
              <button
                key={age}
                className={`age-button ${selectedAges.includes(age) ? 'active' : ''}`}
                onClick={() => {
                  setSelectedAges(prev => 
                    prev.includes(age)
                      ? prev.filter(a => a !== age)
                      : [...prev, age]
                  );
                }}
              >
                {age}
              </button>
            ))}
          </div>
          {selectedAges.length === 0 && (
            <p className="age-warning">하나 이상의 연령대를 선택해주세요.</p>
          )}
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

        <button className="save-button" onClick={onSavePreferences}>
          설정 완료
        </button>
      </div>
    </div>
  );
};

export default UserPreferences;
