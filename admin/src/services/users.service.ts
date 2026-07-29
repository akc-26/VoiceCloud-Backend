import { api } from './api';

export interface UserItem {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  isBanned: boolean;
  avatarUrl?: string;
  wealthLevel?: number;
  wealthExp?: number;
  charmLevel?: number;
  charmExp?: number;
  badges?: string[];
  createdAt: string;
}

export interface BadgeItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  iconUrl?: string;
  category: string;
  isActive: boolean;
}

export interface VisitorLogItem {
  id: string;
  targetUserId: string;
  visitorUserId: string;
  isAnonymous: boolean;
  visitCount: number;
  visitedAt: string;
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
    const res = await api.patch(`/admin/users/${id}`, { isBanned: true, banReason: reason });
    return res.data;
  },

  async unbanUser(id: string) {
    const res = await api.patch(`/admin/users/${id}`, { isBanned: false });
    return res.data;
  },

  async adjustLevel(id: string, data: { type: 'wealth' | 'charm'; level: number; exp?: number }) {
    const res = await api.post(`/admin/users/${id}/level`, data);
    return res.data;
  },

  async createBadge(data: { code: string; name: string; description?: string; iconUrl?: string; category: string }) {
    const res = await api.post('/admin/badges', data);
    return res.data;
  },

  async getBadges() {
    const res = await api.get('/admin/badges');
    return res.data;
  },

  async assignBadge(userId: string, badge: string) {
    const res = await api.post(`/admin/users/${userId}/badges`, { badge });
    return res.data;
  },

  async revokeBadge(userId: string, code: string) {
    const res = await api.delete(`/admin/users/${userId}/badges/${code}`);
    return res.data;
  },

  async getVisitorLogs(params?: { page?: number; limit?: number; targetUserId?: string }) {
    const res = await api.get('/admin/users/visitors/logs', { params });
    return res.data;
  },

  async getVisitorStats() {
    const res = await api.get('/admin/users/visitors/stats');
    return res.data;
  },

  async getUserSettings(userId: string) {
    const res = await api.get(`/admin/users/${userId}/settings`);
    return res.data;
  },

  async updateUserSettings(userId: string, settings: any) {
    const res = await api.patch(`/admin/users/${userId}/settings`, settings);
    return res.data;
  },
};
