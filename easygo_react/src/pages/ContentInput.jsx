import React, { useState } from 'react';
import './ContentInput.scss';

const ContentInput = () => {
  const [link, setLink] = useState('');

  const handleSubmit = () => {
    console.log('여행 콘텐츠 링크: ', link);
    // 링크를 통해 여행 일정 생성
  };

  return (
    <div className="content-input-container">
      <h2>여행 콘텐츠 링크 입력</h2>
      <input
        type="url"
        placeholder="여행 콘텐츠 링크 입력"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      <button onClick={handleSubmit} className="submit-button">일정 생성</button>
    </div>
  );
};

export default ContentInput;
