import { api } from './api';

export interface AdminGift {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  rarity: string;
  category: string;
  coinPrice: number;
  creatorEarningsPercentage: number;
  iconUrl?: string | null;
  isActive: boolean;
  isArchived: boolean;
  isHidden: boolean;
  isLimitedEdition: boolean;
  totalStock?: number | null;
  remainingStock?: number | null;
  isSeasonal: boolean;
  seasonTag?: string | null;
  sortOrder: number;
}

export interface AdminGiftCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface GiftRevenueSummary {
  timeframe: string;
  totalTransactions: number;
  totalCoinsVolume: number;
  totalCreatorPayouts: number;
  platformNetRevenue: number;
  timestamp: string;
}

export const giftsAdminService = {
  async getCatalog() {
    const res = await api.get<AdminGift[]>('/gifts/admin/catalog');
    return res.data;
  },
  async getCategories() {
    const res = await api.get<AdminGiftCategory[]>('/gifts/admin/categories');
    return res.data;
  },
  async getRevenue(timeframe: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const res = await api.get<GiftRevenueSummary>('/gifts/analytics/revenue', {
      params: { timeframe },
    });
    return res.data;
  },
  async createGift(dto: Record<string, unknown>) {
    const res = await api.post<AdminGift>('/gifts/admin', dto);
    return res.data;
  },
  async updateGift(id: string, dto: Record<string, unknown>) {
    const res = await api.patch<AdminGift>(`/gifts/admin/${id}`, dto);
    return res.data;
  },
  async enableGift(id: string) {
    const res = await api.patch<AdminGift>(`/gifts/admin/${id}/enable`);
    return res.data;
  },
  async disableGift(id: string) {
    const res = await api.patch<AdminGift>(`/gifts/admin/${id}/disable`);
    return res.data;
  },
  async archiveGift(id: string) {
    const res = await api.post<AdminGift>(`/gifts/admin/${id}/archive`);
    return res.data;
  },
  async restoreGift(id: string) {
    const res = await api.post<AdminGift>(`/gifts/admin/${id}/restore`);
    return res.data;
  },
  async createCategory(dto: Record<string, unknown>) {
    const res = await api.post<AdminGiftCategory>(
      '/gifts/admin/categories',
      dto,
    );
    return res.data;
  },
};
