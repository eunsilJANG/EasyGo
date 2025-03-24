import React, { useState } from 'react';
import './TravelSchedule.scss';

const TravelSchedule = () => {
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [ageGroup, setAgeGroup] = useState('');

  const handleCreateSchedule = () => {
    // AI 모델을 통해 일정 생성
    console.log({ destination, date, ageGroup });
  };

  return (
    <div className="schedule-container">
      <h2>여행 일정 생성</h2>
      <input
        type="text"
        placeholder="여행지"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
        <option value="">연령대 선택</option>
        <option value="teen">10대</option>
        <option value="adult">성인</option>
        <option value="senior">노인</option>
      </select>
      <button onClick={handleCreateSchedule} className="create-button">일정 생성</button>
    </div>
  );
};

export default TravelSchedule;
