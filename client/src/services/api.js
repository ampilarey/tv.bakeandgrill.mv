import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Don't redirect if on public pages (display, pair, login)
      const publicPages = ['/login', '/display', '/pair'];
      const isPublicPage = publicPages.some(page => window.location.pathname.startsWith(page));
      
      if (!isPublicPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

