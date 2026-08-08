import { api } from './api';

export interface AdminWalletOverview {
  totalRevenueUsd: number;
  totalCoinsInCirculation: number;
  totalDiamondsIssued: number;
  successfulPayments: number;
  failedPayments: number;
  totalRefundsCount: number;
  activePackagesCount: number;
  dailyPurchasesCount: number;
}

export interface AdminWalletTransaction {
  id: string;
  userId: string;
  transactionType: string;
  amount: number;
  currency: string;
  status: string;
  source?: string | null;
  destination?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  remarks?: string | null;
  createdAt: string;
}

export interface AdminCreatorPayout {
  id: string;
  creatorId: string;
  diamondAmount: number;
  payoutAmount: number;
  payoutMethod: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  settledAt?: string | null;
}

export const economyAdminService = {
  async getOverview() {
    const res = await api.get<AdminWalletOverview>('/admin/wallet/overview');
    return res.data;
  },

  async getTransactions(params: { page?: number; limit?: number } = {}) {
    const res = await api.get('/admin/wallet/transactions', { params });
    return res.data as {
      data: AdminWalletTransaction[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  },

  async getCreatorPayouts(status?: AdminCreatorPayout['status']) {
    const res = await api.get('/admin/wallet/creator/payouts', {
      params: status ? { status } : undefined,
    });
    return res.data as AdminCreatorPayout[];
  },

  async approveCreatorPayout(id: string) {
    const res = await api.post(`/admin/wallet/creator/payouts/${id}/approve`);
    return res.data as AdminCreatorPayout;
  },

  async rejectCreatorPayout(id: string, reason?: string) {
    const res = await api.post(`/admin/wallet/creator/payouts/${id}/reject`, {
      reason,
    });
    return res.data as AdminCreatorPayout;
  },

  async processCreatorPayout(id: string) {
    const res = await api.post(`/admin/wallet/creator/payouts/${id}/process`);
    return res.data;
  },
};
