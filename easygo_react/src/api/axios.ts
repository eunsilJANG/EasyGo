import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true  // 모든 요청에 쿠키 포함
});

// 요청 인터셉터: 요청 시 액세스 토큰 자동 첨부
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

// 응답 인터셉터: 토큰 만료 시 자동 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config; //Axios에서 실패한 요청의 설정 정보를 담고 있는 객체예요.
    //즉, 원래 보내려던 요청의 모든 정보가 들어 있습니다.

    // 액세스 토큰이 만료되었을 때 (예: 401 에러)
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 리프레시 토큰은 쿠키에 있으므로 별도로 포함할 필요 없음
        const response = await axios.post('http://localhost:8080/api/token', {}, {
          withCredentials: true  // 쿠키를 포함하여 요청을 보내도록 설정
        });

        const newAccessToken = response.data.accessToken;
        localStorage.setItem('access_token', newAccessToken);

        // 새로운 토큰으로 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (error) {
        // 리프레시 토큰도 만료된 경우 로그아웃 처리
        localStorage.removeItem('access_token');
        // 로그인 페이지로 리다이렉트 등의 처리
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api; 