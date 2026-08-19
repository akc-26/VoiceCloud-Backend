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
  phoneNumber?: string;
  country?: string;
  preferredLanguage?: string;
  isCreatorEnabled?: boolean;
  verificationStatus?: string;
  followersCount?: number;
  followingCount?: number;
  popularityScore?: number;
  bio?: string;
  gender?: string;
  isVerified?: boolean;
  isVip?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  targetUserName?: string;
  targetUsername?: string | null;
  visitorUserName?: string;
  visitorUsername?: string | null;
  isAnonymous: boolean;
  visitCount: number;
  visitedAt: string;
}

export const usersService = {
  async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string }) {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },


  async createUser(data: { username: string; displayName: string; email: string; password: string; role: 'USER' | 'CREATOR'; phoneNumber?: string; country?: string; preferredLanguage?: string }) {
    const res = await api.post('/admin/users', data);
    return res.data as UserItem;
  },

  async resetPassword(id: string, password: string) {
    const res = await api.post(`/admin/users/${id}/reset-password`, { password });
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


  async updateBadge(id: string, data: Partial<Pick<BadgeItem, 'name' | 'description' | 'iconUrl' | 'category' | 'isActive'>>) {
    const res = await api.patch(`/admin/badges/${id}`, data);
    return res.data as BadgeItem;
  },

  async deleteBadge(id: string) {
    const res = await api.delete(`/admin/badges/${id}`);
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
