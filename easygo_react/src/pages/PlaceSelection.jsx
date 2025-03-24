import React, { useState } from 'react';
import './PlaceSelection.scss';

const PlaceSelection = () => {
  const [category, setCategory] = useState('');
  const [places, setPlaces] = useState([]);

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    // 카테고리에 맞는 장소 데이터를 API에서 받아옵니다.
    fetchPlaces(e.target.value);
  };

  const fetchPlaces = (category) => {
    // 예시 데이터 (실제로는 API 호출)
    const fetchedPlaces = [
      { name: '카페 A', type: '카페' },
      { name: '맛집 B', type: '맛집' },
      { name: '관광지 C', type: '관광지' },
    ];
    setPlaces(fetchedPlaces.filter(place => place.type === category));
  };

  return (
    <div className="place-selection-container">
      <h2>장소 선택</h2>
      <select onChange={handleCategoryChange}>
        <option value="">카테고리 선택</option>
        <option value="카페">카페</option>
        <option value="맛집">맛집</option>
        <option value="관광지">관광지</option>
      </select>
      <ul>
        {places.map((place, index) => (
          <li key={index}>{place.name}</li>
        ))}
      </ul>
      <button className="select-button">선택 완료</button>
    </div>
  );
};

export default PlaceSelection;
