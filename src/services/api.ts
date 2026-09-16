import axios from 'axios';

const MAIN_API_URL = 'https://api-vuaxoso.vipmarts.com/api';
const LOCAL_API_URL = 'http://localhost:5001/api';

const api = axios.create({
  // baseURL: 'https://api-vuaxoso.vipmarts.com/api',
  baseURL: import.meta.env.DEV ? LOCAL_API_URL : MAIN_API_URL,
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

export default api;
