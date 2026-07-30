import { api } from './api';

export interface StoreItem {
  id: string;
  name: string;
  description?: string;
  category: 'AVATAR_FRAME' | 'CHAT_BUBBLE' | 'ENTRANCE_EFFECT' | 'ROOM_THEME' | 'VEHICLE_MOUNT' | 'NOBILITY_BADGE' | 'PROFILE_CARD_BG';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  iconUrl: string;
  previewUrl?: string;
  assetUrl: string;
  priceCoins: number;
  priceDiamonds: number;
  isVipExclusive: boolean;
  minVipLevel: number;
  isLimitedEdition: boolean;
  stockQuantity: number;
  durations?: Array<{ days: number; coinPrice: number; diamondPrice?: number }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserInventory {
  id: string;
  userId: string;
  itemId: string;
  item: StoreItem;
  obtainedVia: 'PURCHASE' | 'GIFT' | 'TASK_REWARD' | 'ACHIEVEMENT' | 'VIP_BENEFIT' | 'ADMIN_GRANT';
  isEquipped: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

export interface StoreAnalytics {
  totalItems: number;
  totalTransactions: number;
  totalCoinsSpent: number;
  totalDiamondsSpent: number;
  recentTransactions: any[];
}

export const adminStoreService = {
  async getItems(params?: { category?: string; rarity?: string; search?: string; page?: number; limit?: number }) {
    const res = await api.get('/admin/store/items', { params });
    return res.data;
  },

  async createItem(data: Partial<StoreItem>) {
    const res = await api.post('/admin/store/items', data);
    return res.data;
  },

  async updateItem(id: string, data: Partial<StoreItem>) {
    const res = await api.put(`/admin/store/items/${id}`, data);
    return res.data;
  },

  async deleteItem(id: string) {
    const res = await api.delete(`/admin/store/items/${id}`);
    return res.data;
  },

  async grantItem(data: { userId: string; itemId: string; durationDays?: number; reason?: string }) {
    const res = await api.post('/admin/store/grant', data);
    return res.data;
  },

  async getUserInventory(userId: string, params?: { category?: string; equippedOnly?: boolean }) {
    const res = await api.get(`/admin/store/inventory/${userId}`, { params });
    return res.data;
  },

  async getAnalytics(): Promise<StoreAnalytics> {
    const res = await api.get('/admin/store/analytics');
    return res.data;
  },
};
