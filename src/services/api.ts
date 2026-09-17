import axios from 'axios';

const MAIN_API_URL = 'https://api-vuaxoso.vipmarts.com/api';
const LOCAL_API_URL = 'http://localhost:5001/api';

const api = axios.create({
  // baseURL: 'https://api-vuaxoso.vipmarts.com/api',
  // baseURL: import.meta.env.DEV ? LOCAL_API_URL : MAIN_API_URL,
  baseURL: MAIN_API_URL, // Tạm thời trỏ thẳng vào Prod để test
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
