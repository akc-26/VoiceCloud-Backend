import { api } from './api';

export interface LeaderboardItem {
  rank: number;
  id: string;
  userId?: string;
  username?: string;
  displayName?: string;
  hostName?: string;
  name?: string;
  title?: string;
  country?: string;
  coins?: number;
  diamonds?: number;
  followersCount?: number;
  popularityScore?: number;
  totalAudience?: number;
  giftsEarned?: number;
  engagementScore?: number;
  totalRevenue?: number;
  memberCount?: number;
  activeHostCount?: number;
  category?: string;
  weeklyActivityScore?: number;
  listenerCount?: number;
  giftActivity?: number;
  tierName?: string;
  level?: number;
  experience?: number;
  lifetimeSpending?: number;
  creatorRevenue?: number;
}

export interface LeaderboardResponse {
  category: string;
  timeframe: string;
  metric?: string;
  country?: string;
  items: LeaderboardItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CacheStatusResponse {
  cachedKeys: Record<string, boolean>;
  totalCached: number;
  lastRefreshedAt: string;
}

export const rankingsAdminService = {
  async getLeaderboard(
    category: string,
    params?: {
      timeframe?: string;
      metric?: string;
      country?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const res = await api.get(`/rankings/leaderboard/${category}`, { params });
    return res.data as LeaderboardResponse;
  },

  async getTrendingSummary(params?: { category?: string; country?: string; limit?: number }) {
    const res = await api.get('/rankings/trending', { params });
    return res.data;
  },

  async refreshCache() {
    const res = await api.post('/rankings/admin/cache/refresh');
    return res.data as { refreshedKeys: string[] };
  },

  async getCacheStatus() {
    const res = await api.get('/rankings/admin/cache/status');
    return res.data as CacheStatusResponse;
  },

  async createSnapshot(data: { category: string; timeframe: string; periodIdentifier: string }) {
    const res = await api.post('/rankings/admin/snapshot', data);
    return res.data;
  },

  async getSnapshots(params?: { category?: string; timeframe?: string; page?: number; limit?: number }) {
    const res = await api.get('/rankings/admin/snapshots', { params });
    return res.data as { items: any[]; total: number; page: number; limit: number; totalPages: number };
  },

  async getHistoricalComparison(category: string, entityId: string, timeframe = 'daily') {
    const res = await api.get(`/rankings/history/comparison/${category}/${entityId}`, {
      params: { timeframe },
    });
    return res.data;
  },
};
