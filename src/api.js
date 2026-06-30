import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE,
});

// Request interceptor: Har request mein token apne aap lag jayega
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('final_token') || localStorage.getItem('temp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;