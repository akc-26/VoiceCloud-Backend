import { api } from './api';

export interface TaskDefinition {
  id: string;
  title: string;
  description?: string;
  icon: string;
  resetPeriod: 'daily' | 'weekly' | 'monthly';
  eventKey: string;
  targetCount: number;
  rewardCoins: number;
  rewardDiamonds: number;
  rewardXp: number;
  rewardVipDays: number;
  rewardProfileFrame?: string;
  rewardChatBubble?: string;
  rewardEntranceEffect?: string;
  rewardSticker?: string;
  rewardBadge?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  badge: string;
  icon: string;
  frame: string;
  eventKey: string;
  targetCount: number;
  xpBonus: number;
  coinReward: number;
  diamondReward: number;
  rewardProfileFrame?: string;
  rewardChatBubble?: string;
  rewardEntranceEffect?: string;
  rewardSticker?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SeasonalEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  xpMultiplier: number;
  coinMultiplier: number;
  limitedAchievements?: string;
  rewards?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const tasksAchievementsAdminService = {
  getTasks: async (period?: string) => {
    const res = await api.get('/admin/tasks-achievements/tasks', {
      params: { period },
    });
    return res.data;
  },

  createTask: async (data: Partial<TaskDefinition>) => {
    const res = await api.post('/admin/tasks-achievements/tasks', data);
    return res.data;
  },

  updateTask: async (id: string, data: Partial<TaskDefinition>) => {
    const res = await api.patch(`/admin/tasks-achievements/tasks/${id}`, data);
    return res.data;
  },

  deleteTask: async (id: string) => {
    const res = await api.delete(`/admin/tasks-achievements/tasks/${id}`);
    return res.data;
  },

  getAchievements: async () => {
    const res = await api.get('/admin/tasks-achievements/achievements');
    return res.data;
  },

  createAchievement: async (data: Partial<AchievementDefinition>) => {
    const res = await api.post('/admin/tasks-achievements/achievements', data);
    return res.data;
  },

  updateAchievement: async (id: string, data: Partial<AchievementDefinition>) => {
    const res = await api.patch(
      `/admin/tasks-achievements/achievements/${id}`,
      data,
    );
    return res.data;
  },

  deleteAchievement: async (id: string) => {
    const res = await api.delete(
      `/admin/tasks-achievements/achievements/${id}`,
    );
    return res.data;
  },

  getSeasons: async () => {
    const res = await api.get('/admin/tasks-achievements/seasons');
    return res.data;
  },

  createSeason: async (data: Partial<SeasonalEvent>) => {
    const res = await api.post('/admin/tasks-achievements/seasons', data);
    return res.data;
  },

  updateSeason: async (id: string, data: Partial<SeasonalEvent>) => {
    const res = await api.patch(
      `/admin/tasks-achievements/seasons/${id}`,
      data,
    );
    return res.data;
  },

  triggerRollover: async (id: string) => {
    const res = await api.post(
      `/admin/tasks-achievements/seasons/${id}/rollover`,
    );
    return res.data;
  },

  manualGrantReward: async (data: {
    userId: string;
    rewardType: string;
    amount: number;
    reason?: string;
    metadata?: string;
  }) => {
    const res = await api.post(
      '/admin/tasks-achievements/manual-grant-reward',
      data,
    );
    return res.data;
  },

  manualReset: async (period: 'daily' | 'weekly' | 'monthly') => {
    const res = await api.post('/admin/tasks-achievements/manual-reset', {
      period,
    });
    return res.data;
  },

  getUserProgress: async (userId: string) => {
    const res = await api.get(
      `/admin/tasks-achievements/user-progress/${userId}`,
    );
    return res.data;
  },

  getAuditLogs: async (params?: any) => {
    const res = await api.get('/admin/tasks-achievements/rewards/audit-logs', {
      params,
    });
    return res.data;
  },

  getAnalytics: async () => {
    const res = await api.get('/admin/tasks-achievements/analytics');
    return res.data;
  },
};
