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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Response Interceptor for handling 401s and standard error formatting
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[]; statusCode?: number }>) => {
    const { response, config } = error;
    const addToast = useNotificationsStore.getState().addToast;

    if (response?.status === 401 && config) {
      // Avoid infinite loop if login or refresh request fails
      if (
        config.url?.includes('/auth/login') ||
        config.url?.includes('/auth/refresh') ||
        (config as any)._retry
      ) {
        if (config.url?.includes('/auth/login')) {
          addToast('error', 'Invalid login credentials');
        } else {
          useAuthStore.getState().logout();
          addToast('warning', 'Session expired. Please log in again.');
          if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
            window.location.href = '/admin/login';
          }
        }
        return Promise.reject(error);
      }

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
              }
              return api(config);
            })
            .catch((err) => Promise.reject(err));
        }

        (config as any)._retry = true;
        isRefreshing = true;

        try {
          const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = refreshRes.data;
          const user = useAuthStore.getState().user;
          if (accessToken && user) {
            useAuthStore
              .getState()
              .setAuth(accessToken, newRefreshToken || refreshToken, user);
            if (config.headers) {
              config.headers.Authorization = `Bearer ${accessToken}`;
            }
            processQueue(null, accessToken);
            isRefreshing = false;
            return api(config);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          isRefreshing = false;
          useAuthStore.getState().logout();
          addToast('warning', 'Session expired. Please log in again.');
          if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
            window.location.href = '/admin/login';
          }
          return Promise.reject(refreshErr);
        }
      }

      // Clear session on 401 if no refresh token
      useAuthStore.getState().logout();
      addToast('warning', 'Session expired. Please log in again.');
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
        window.location.href = '/admin/login';
      }
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
