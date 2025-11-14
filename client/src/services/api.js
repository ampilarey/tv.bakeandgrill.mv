import axios from 'axios';

// Detect if we're on mobile/network access and need to use IP address
const getApiBaseURL = () => {
  // In development, check if we're accessing via IP (not localhost)
  if (import.meta.env.DEV) {
    const hostname = window.location.hostname;
    // If accessing via IP address (not localhost/127.0.0.1), use direct API URL
    // IP addresses contain dots, so check if it's NOT localhost
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // This is an IP address or domain - use it for API calls
      // For mobile devices accessing via IP, we need to connect directly to backend
      const port = window.location.port || '5173';
      // Use the same hostname but port 4000 for API
      return `http://${hostname}:4000/api`;
    }
  }
  // Default: use relative path (works with Vite proxy or same origin)
  return '/api';
};

// Create axios instance
const api = axios.create({
  baseURL: getApiBaseURL(),
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
      // Check both pathname (for BrowserRouter) and hash (for HashRouter)
      const pathname = window.location.pathname;
      const hash = window.location.hash;
      const publicPages = ['/login', '/display', '/pair'];
      const isPublicPage = publicPages.some(page => 
        pathname.startsWith(page) || hash.includes(page)
      );
      
      if (!isPublicPage) {
        // Use hash routing since we're using HashRouter
        window.location.href = '/#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

