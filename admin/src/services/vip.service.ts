import { api } from './api';

export interface VipTierData {
  id: string;
  name: string;
  level: number;
  badge?: string;
  badgeUrl?: string;
  icon?: string;
  colorTheme?: string;
  monthlyPrice: number;
  quarterlyPrice?: number;
  yearlyPrice?: number;
  benefits?: string[];
  activationStatus: boolean;
  isActive?: boolean;
  description?: string;
  sortOrder?: number;
}

export interface VipBenefitData {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  iconUrl?: string;
  minVipLevel: number;
  metadata?: Record<string, any>;
  isActive: boolean;
}

export interface VipRewardData {
  id: string;
  title: string;
  description?: string;
  rewardType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  minVipLevel: number;
  coins: number;
  exp: number;
  itemType?: string;
  itemId?: string;
  itemDurationDays?: number;
  iconUrl?: string;
  isActive: boolean;
}

export const vipAdminService = {
  async getVipDashboardStats() {
    const res = await api.get('/vip/admin/dashboard');
    return res.data;
  },

  async getTiers() {
    const res = await api.get('/vip/admin/tiers');
    return res.data as VipTierData[];
  },

  async createTier(dto: Partial<VipTierData>) {
    const res = await api.post('/vip/admin/tiers', dto);
    return res.data;
  },

  async updateTier(id: string, dto: Partial<VipTierData>) {
    const res = await api.put(`/vip/admin/tiers/${id}`, dto);
    return res.data;
  },

  async deleteTier(id: string) {
    const res = await api.delete(`/vip/admin/tiers/${id}`);
    return res.data;
  },

  async getMemberships() {
    const res = await api.get('/vip/admin/memberships');
    return res.data;
  },

  async getBenefits() {
    const res = await api.get('/vip/admin/benefits');
    return res.data as VipBenefitData[];
  },

  async createBenefit(dto: Partial<VipBenefitData>) {
    const res = await api.post('/vip/admin/benefits', dto);
    return res.data;
  },

  async updateBenefit(id: string, dto: Partial<VipBenefitData>) {
    const res = await api.put(`/vip/admin/benefits/${id}`, dto);
    return res.data;
  },

  async getRewards() {
    const res = await api.get('/vip/admin/rewards');
    return res.data as VipRewardData[];
  },

  async createReward(dto: Partial<VipRewardData>) {
    const res = await api.post('/vip/admin/rewards', dto);
    return res.data;
  },

  async updateReward(id: string, dto: Partial<VipRewardData>) {
    const res = await api.put(`/vip/admin/rewards/${id}`, dto);
    return res.data;
  },

  async getRevenueReports() {
    const res = await api.get('/vip/admin/revenue');
    return res.data;
  },

  async getUpcomingRenewals() {
    const res = await api.get('/vip/admin/renewals');
    return res.data;
  },
};
