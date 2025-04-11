import axios from 'axios';

export const API_BASE_URL = 'http://localhost:8080';
export const AI_BASE_URL = 'http://localhost:8000';
export const IMAGE_BASE_URL = 'http://localhost:8080';

// Spring Boot API용 인스턴스
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// FastAPI용 인스턴스
export const aiApi = axios.create({
  baseURL: AI_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// 요청 인터셉터 설정
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_nickname');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
); 