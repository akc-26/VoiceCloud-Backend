import { api } from './api';

export interface UserItem {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  isBanned: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export const usersService = {
  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },

  async getUserById(id: string) {
    const res = await api.get(`/admin/users/${id}`);
    return res.data;
  },

  async banUser(id: string, reason: string) {
    const res = await api.post(`/admin/users/${id}/ban`, { reason });
    return res.data;
  },

  async unbanUser(id: string) {
    const res = await api.post(`/admin/users/${id}/unban`);
    return res.data;
  },
};
