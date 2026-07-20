import { create } from 'zustand';
import api from '../services/api';

interface AuthState {
  user: any;
  token: string | null;
  login: (phone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('adminToken'),

  login: async (phone, password) => {
    try {
      const { data } = await api.post('/auth/login', { phone, password });
      if (data.role !== 'admin') {
        return { success: false, message: 'Bạn không có quyền truy cập.' };
      }
      localStorage.setItem('adminToken', data.token);
      set({ user: data, token: data.token });
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || 'Đăng nhập thất bại' };
    }
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    set({ user: null, token: null });
  },
}));
