import { create } from 'zustand';
import { api } from '../api/axios';

const useUserStore = create((set) => ({
  nickname: null,
  email: null,
  id: null,

  // 현재 로그인한 사용자 정보 가져오기
  fetchCurrentUser: async () => {
    try {
      const response = await api.get('/api/user/me');
      const user = response.data;
      console.log('Fetched user data:', user);
      localStorage.setItem('user_nickname', user.nickname);
      set({ 
        nickname: user.nickname, 
        email: user.email,
        id: user.id
      });
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  },

  setUserInfo: (user) => {
    set({ 
      nickname: user.nickname,
      email: user.email,
      id: user.id
    });
  },

  clearUserInfo: () => {
    localStorage.removeItem('user_nickname');
    set({ 
      nickname: null,
      email: null,
      id: null
    });
  }
}));

export default useUserStore; 