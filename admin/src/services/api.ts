import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';
import { useNotificationsStore } from '../store/notifications.store';

export const API_BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to attach Bearer token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor for handling 401s and standard error formatting
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[]; statusCode?: number }>) => {
    const { response, config } = error;
    const addToast = useNotificationsStore.getState().addToast;

    if (response?.status === 401) {
      // Avoid infinite loop if login request fails
      if (config?.url?.includes('/auth/login')) {
        addToast('error', 'Invalid login credentials');
        return Promise.reject(error);
      }

      // Clear session on 401
      useAuthStore.getState().logout();
      addToast('warning', 'Session expired. Please log in again.');
      window.location.href = '/admin/login';
      return Promise.reject(error);
    }

    // Extract error message
    let errorMessage = 'An unexpected error occurred';
    if (response?.data?.message) {
      if (Array.isArray(response.data.message)) {
        errorMessage = response.data.message.join(', ');
      } else {
        errorMessage = response.data.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Toast error unless it's a silent background request
    if (!config?.headers?.['X-Silent-Error']) {
      addToast('error', errorMessage);
    }

    return Promise.reject(new Error(errorMessage));
  },
);
