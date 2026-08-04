import { api } from './api';
import { AdminUser } from '../store/auth.store';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  async getProfile(): Promise<AdminUser> {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const res = await api.post('/auth/refresh', { refreshToken });
    return res.data;
  },
};
