import { create } from 'zustand';

const useUserStore = create((set) => ({
  nickname: localStorage.getItem('user_nickname'),
  setNickname: (nickname) => {
    localStorage.setItem('user_nickname', nickname);
    set({ nickname });
  },
  clearNickname: () => {
    localStorage.removeItem('user_nickname');
    set({ nickname: null });
  }
}));

export default useUserStore; 