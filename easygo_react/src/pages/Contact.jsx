import React, { useState } from 'react';
import './Contact.scss';

const Contact = () => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    console.log("문의 내용: ", message);
    // API 호출로 메시지 보내기
  };

  return (
    <div className="contact-container">
      <h2>1:1 문의</h2>
      <textarea 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="문의 내용을 작성해주세요"
      />
      <button onClick={handleSubmit} className="submit-button">보내기</button>
    </div>
  );
};

export default Contact;
