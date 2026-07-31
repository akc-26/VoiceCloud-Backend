/**
 * Shared API Contracts & Interfaces
 * Module: @shared/api
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  path?: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export const API_ROUTES = {
  HEALTH: '/health',
  HEALTH_METRICS: '/health/metrics',
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
  },
  USERS: {
    ME: '/api/v1/users/me',
    PROFILE: (id: string) => `/api/v1/users/${id}`,
  },
  ROOMS: {
    LIST: '/api/v1/rooms',
    DETAIL: (id: string) => `/api/v1/rooms/${id}`,
  },
} as const;
