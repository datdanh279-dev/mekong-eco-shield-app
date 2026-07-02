import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message: string; code: string; details?: Record<string, string[]> }>) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          window.location.href = '/auth/login';
        }
      }
      const message = data?.message || 'Yêu cầu thất bại';
      const code = data?.code || 'UNKNOWN_ERROR';
      return Promise.reject({ message, code, status, details: data?.details });
    }
    if (error.request) {
      return Promise.reject({
        message: 'Không thể kết nối đến máy chủ',
        code: 'NETWORK_ERROR',
        status: 0,
      });
    }
    return Promise.reject({
      message: 'Đã xảy ra lỗi không xác định',
      code: 'UNKNOWN_ERROR',
      status: 0,
    });
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

export default api;
