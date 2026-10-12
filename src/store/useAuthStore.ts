import { create } from 'zustand';
import api from '../services/api';

const savedUserStr = localStorage.getItem('adminUser');
let initialUser = null;
try {
  if (savedUserStr) {
    initialUser = JSON.parse(savedUserStr);
    if (initialUser && (initialUser.name === 'Admin Master' || initialUser.phone === '0899955742' || initialUser.phone === 'admin' || (initialUser.role === 'admin' && (!initialUser.permissions?.tabs || Object.keys(initialUser.permissions.tabs).length === 0)))) {
      initialUser.isMasterAdmin = true;
    }
  }
} catch (e) {
  initialUser = null;
}

interface AuthState {
  user: any;
  token: string | null;
  login: (phone: string, password: string) => Promise<{ success: boolean; message?: string, code?: string }>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  hasPermission: (tab: string, action?: 'view' | 'create' | 'update' | 'delete') => boolean;
  canViewField: (field: string) => boolean;
  isMasterAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  token: localStorage.getItem('adminToken'),

  login: async (phone, password) => {
    try {
      const { data } = await api.post('/auth/login', { phone, password });
      if (data.role !== 'admin' && data.role !== 'staff') {
        return { success: false, message: 'Bạn không có quyền truy cập.' };
      }
      const isMaster = !!(data.name === 'Admin Master' || data.isMasterAdmin || data.phone === 'admin' || data.phone === '0899955742' || (data.role === 'admin' && (!data.permissions?.tabs || Object.keys(data.permissions.tabs).length === 0)));
      const userToStore = { ...data, isMasterAdmin: isMaster };
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(userToStore));
      set({ user: userToStore, token: data.token });
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Đăng nhập thất bại',
        code: error.response?.data?.code 
      };
    }
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    set({ user: null, token: null });
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/auth/profile');
      if (data) {
        const current = get().user;
        const isMaster = !!(current?.isMasterAdmin || data.name === 'Admin Master' || data.isMasterAdmin || data.phone === 'admin' || data.phone === '0899955742' || (data.role === 'admin' && (!data.permissions?.tabs || Object.keys(data.permissions.tabs).length === 0)));
        const userToStore = { ...data, isMasterAdmin: isMaster };
        localStorage.setItem('adminUser', JSON.stringify(userToStore));
        set({ user: userToStore });
      }
    } catch (err) {
      console.error('Failed to fetch admin profile', err);
    }
  },

  isMasterAdmin: () => {
    const user = get().user;
    if (!user) return false;
    if (user.name === 'Admin Master' || user.phone === '0899955742' || user.phone === 'admin') return true;
    if (user.isMasterAdmin) return true;
    // Fallback: if user is admin role and has no custom restricted tabs defined yet, treat as Master
    if (user.role === 'admin' && (!user.permissions?.tabs || Object.keys(user.permissions.tabs).length === 0)) {
      return true;
    }
    return false;
  },

  hasPermission: (tab: string, action: 'view' | 'create' | 'update' | 'delete' = 'view') => {
    const user = get().user;
    if (!user) return false;
    if (get().isMasterAdmin()) return true;

    const tabs = user.permissions?.tabs;
    if (!tabs || !tabs[tab]) return false;
    return !!tabs[tab][action];
  },

  canViewField: (field: string) => {
    const user = get().user;
    if (!user) return false;
    if (get().isMasterAdmin()) return true;

    const fields = user.permissions?.userFields;
    if (!fields) return false;
    return !!fields[field];
  }
}));

export default useAuthStore;

