import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { aiApi, api } from '../../api/axios';
import './ContentInput.scss';

const ContentInput = () => {
  const [link, setLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [schedule, setSchedule] = useState(null);
  const scheduleRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (schedule && scheduleRef.current) {
      scheduleRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [schedule]);

  const validateLink = (url) => {
    const patterns = {
      youtube: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
      naverBlog: /^(https?:\/\/)?(m\.)?(blog\.naver\.com)\/.+$/,
      naverIn: /^(https?:\/\/)?in\.naver\.com\/.+$/,
      naverTv: /^(https?:\/\/)?tv\.naver\.com\/.+$/
    };

    return Object.values(patterns).some(pattern => pattern.test(url));
  };

  const handleSubmit = async () => {
    if (!link) {
      setError('링크를 입력해주세요.');
      return;
    }

    if (!validateLink(link)) {
      setError('유효한 YouTube, 네이버 블로그, 네이버 인플루언서, 또는 네이버 TV 링크를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSchedule(null);

    try {
      const response = await aiApi.post('/api/content/extract', { url: link });
      console.log('콘텐츠 추출 응답:', response.data);
      setSchedule(response.data);
    } catch (error) {
      console.error('콘텐츠 추출 에러:', error);
      setError(error.response?.data?.detail || '콘텐츠 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!schedule) return;

    try {
      const courseData = {
        name: schedule.title || `${schedule.region} 여행`,
        region: schedule.region,
        location: link,
        days: [{
          date: schedule.date || new Date().toISOString(),
          spots: schedule.spots.map(spot => ({
            name: spot.name,
            description: spot.description || '',
            time_required: spot.time_required || ''
          }))
        }]
      };

      console.log('저장할 코스 데이터:', courseData);
      const response = await api.post('/api/courses', courseData);
      console.log('저장 응답:', response.data);

      if (response.data) {
        alert('일정이 저장되었습니다!');
        navigate('/mypage');
      }
    } catch (error) {
      console.error('저장 에러:', error);
      if (error.response?.status === 401) {
        alert('로그인이 필요한 서비스입니다.');
        navigate('/login');
      } else {
        alert('일정 저장 중 오류가 발생했습니다.');
      }
    }
  };

  const renderSchedule = () => {
    if (!schedule) return null;

    return (
      <div ref={scheduleRef} className="schedule-result">
        <div className="schedule-header">
          <h3>🗺️ 여행 일정</h3>
          <div className="schedule-summary">
            <p className="region">{schedule.region}</p>
            <p className="days">추천 여행 일수: {schedule.recommended_days}일</p>
          </div>
          <button 
            className="save-button"
            onClick={handleSaveCourse}
          >
            일정 저장하기
          </button>
        </div>

        <div className="schedule-content">
          <div className="summary-section">
            <h4>📝 여행 요약</h4>
            <p>{schedule.summary}</p>
          </div>

          <div className="spots-section">
            <h4>📍 방문 장소</h4>
            <div className="spots-list">
              {schedule.spots.map((spot, index) => (
                <div key={index} className="spot-item">
                  <div className="spot-header">
                    <h5>{spot.name}</h5>
                    <span className="category">{spot.category}</span>
                  </div>
                  <p className="description">{spot.description}</p>
                  <span className="time">예상 소요 시간: {spot.time_required}분</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="content-input-container">
      <div className="content-header">
        <h2>EASY <span className="highlight">GO</span></h2>
        <p className="subtitle">여행 콘텐츠 분석</p>
        <p className="description">
          여행 콘텐츠 링크를 입력하시면<br />
          AI가 자동으로 여행 코스를 만들어드립니다
        </p>
      </div>

      <div className="input-section">
        <div className="platform-icons">
          <div className="platform">
            <div className="icon youtube">
              <svg 
                viewBox="0 0 24 24" 
                width="24" 
                height="24" 
                className="youtube-play-icon"
              >
                <path 
                  fill="#FFFFFF" 
                  d="M8 5v14l11-7z"
                />
              </svg>
            </div>
            <span>YouTube</span>
            <div className="url-example">
              <span className="label">지원 URL</span>
              <span className="text">유튜브 영상</span>
            </div>
          </div>

          <div className="platform">
            <div className="icon naver">
              <svg 
                viewBox="0 0 24 24" 
                width="24" 
                height="24" 
                className="naver-icon"
              >
                <path 
                  fill="#FFFFFF" 
                  d="M16.273 12.845L7.376 0H0v24h7.726V11.155L16.624 24H24V0h-7.727z"
                />
              </svg>
            </div>
            <span>네이버</span>
            <div className="url-example">
              <span className="label">지원 URL</span>
              <span className="text">네이버 블로그</span>
              <span className="text">네이버 인플루언서</span>
              <span className="text">네이버 TV</span>
            </div>
          </div>
        </div>

        <div className="input-wrapper">
          <input
            type="url"
            placeholder="여행 콘텐츠 링크를 붙여넣어주세요"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={isLoading}
          />
          {error && <div className="error-message">{error}</div>}
        </div>

        <button 
          onClick={handleSubmit} 
          className={`submit-button ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? '분석중...' : '여행 코스 만들기'}
        </button>
      </div>

      {!schedule && (
        <div className="info-box">
          <h3>✨ 이런 콘텐츠를 분석할 수 있어요</h3>
          <div className="info-items">
            <div className="info-item">
              <span className="icon">📹</span>
              <span className="text">여행 브이로그</span>
            </div>
            <div className="info-item">
              <span className="icon">📝</span>
              <span className="text">여행 후기 블로그</span>
            </div>
            <div className="info-item">
              <span className="icon">🗺️</span>
              <span className="text">여행 코스 추천</span>
            </div>
            <div className="info-item">
              <span className="icon">⭐</span>
              <span className="text">관광지 리뷰</span>
            </div>
          </div>
        </div>
      )}

      {renderSchedule()}
    </div>
  );
};

export default ContentInput;