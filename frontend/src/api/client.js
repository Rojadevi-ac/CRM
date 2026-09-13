import axios from 'axios';

function getApiBaseUrl() {
  const envApi = import.meta.env.VITE_API_BASE_URL;
  if (envApi && !envApi.includes('127.0.0.1') && !envApi.includes('localhost')) {
    return envApi;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  return `http://${hostname}:5000/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: add JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if session expired
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
