import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import type { WebsiteRefreshResponse } from '@/auth/auth.types';

const API_BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

interface RetryConfig extends AxiosRequestConfig {
  _voiceCloudRetried?: boolean;
}

let refreshPromise: Promise<WebsiteRefreshResponse> | null = null;

async function refreshTokens(): Promise<WebsiteRefreshResponse> {
  const refreshToken = useWebsiteAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error('No refresh token is available');

  if (!refreshPromise) {
    const pending = refreshClient
      .post<WebsiteRefreshResponse>('/auth/refresh', { refreshToken })
      .then((response) => response.data)
      .finally(() => {
        refreshPromise = null;
      });
    refreshPromise = pending;
    return pending;
  }

  return refreshPromise;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useWebsiteAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetryConfig | undefined;

    if (!original || status !== 401 || original._voiceCloudRetried) {
      return Promise.reject(error);
    }

    const path = String(original.url ?? '');
    if (path.includes('/auth/login') || path.includes('/auth/refresh')) {
      useWebsiteAuthStore.getState().clearAuth();
      return Promise.reject(error);
    }

    original._voiceCloudRetried = true;

    try {
      const refreshed = await refreshTokens();
      useWebsiteAuthStore.getState().setRefreshResponse(refreshed);
      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${refreshed.accessToken}`,
      };
      return apiClient.request(original);
    } catch (refreshError) {
      useWebsiteAuthStore.getState().markSessionExpired();
      return Promise.reject(refreshError);
    }
  },
);

export function apiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Something went wrong. Please try again.';

  const data = error.response?.data as { message?: string | string[] } | undefined;
  if (Array.isArray(data?.message)) return data.message.join(' ');
  if (data?.message) return data.message;

  // A Vite proxy ECONNREFUSED is surfaced to Axios as a 5xx response without
  // the normal backend JSON error payload. Do not expose the raw Axios
  // "Request failed with status code 500" message to users.
  if (!error.response || (error.response.status >= 500 && !data?.message)) {
    return import.meta.env.DEV
      ? 'The local VoiceCloud backend is unavailable. Start the backend on port 3000 and try again.'
      : 'VoiceCloud is temporarily unavailable. Please try again shortly.';
  }

  return error.message ?? 'Unable to complete the request.';
}
