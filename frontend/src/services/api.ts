// API Service Layer
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token
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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Suppress 404 errors for settings endpoints (expected when settings don't exist yet)
    if (error.response?.status === 404 && error.config?.url?.includes('/settings/')) {
      // Silently handle 404 for settings - they're expected when settings don't exist yet
      return Promise.reject(error);
    }
    
    // Only redirect on 401 if it's NOT a login request
    // Login requests should handle 401 errors themselves
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (data: {
    username: string;
    email?: string;
    password: string;
    role?: string;
    fullName?: string;
  }) => api.post('/auth/register', data),
  
  getProfile: () => api.get('/auth/profile'),
  
  getSalespersons: () => api.get('/auth/salespersons'),
};

// Export default api instance for custom requests
export default api;







