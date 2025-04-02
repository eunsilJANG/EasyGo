import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from "../../api/axios";
import './WriteArticle.scss';

const WriteArticle = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]); // 파일 상태 추가
  const [previewUrls, setPreviewUrls] = useState([]); // 이미지 미리보기용
  const navigate = useNavigate();

  // 파일 선택 핸들러
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);

    // 이미지 미리보기 생성
    const urls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  // 파일 삭제 핸들러
  const handleRemoveFile = (index) => {
    const newFiles = [...files];
    const newUrls = [...previewUrls];
    
    // 미리보기 URL 해제
    URL.revokeObjectURL(newUrls[index]);
    
    newFiles.splice(index, 1);
    newUrls.splice(index, 1);
    
    setFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
        const formData = new FormData();
        
        // article 데이터를 JSON 문자열로 변환하여 추가
        const articleData = {
            title: title,
            content: content
        };
        formData.append('article', new Blob([JSON.stringify(articleData)], {
            type: 'application/json'
        }));
        
        // 파일들 추가
        files.forEach(file => {
            formData.append('files', file);
        });

        const response = await api.post('/api/articles', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });

        console.log('Response status:', response.status);
        console.log('Response data:', response.data);

        alert('글이 성공적으로 등록되었습니다.');
        navigate('/community');
    } catch (error) {
        console.error('Error posting article:', error);
        alert('글 작성 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <div className="write-article-page">
      <div className="article-container">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="title-input"
          />
          <textarea
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          
          {/* 파일 업로드 입력 필드 */}
          <div className="file-upload-section">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              accept="image/*"  // 이미지 파일만 허용
              className="file-input"
            />
          </div>

          {/* 이미지 미리보기 영역 */}
          {previewUrls.length > 0 && (
            <div className="preview-section">
              {previewUrls.map((url, index) => (
                <div key={index} className="preview-item">
                  <img src={url} alt={`Preview ${index + 1}`} />
                  <button 
                    type="button" 
                    onClick={() => handleRemoveFile(index)}
                    className="remove-file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="button-group">
            <button type="submit">등록하기</button>
            <button type="button" onClick={() => navigate('/community')}>
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WriteArticle; 