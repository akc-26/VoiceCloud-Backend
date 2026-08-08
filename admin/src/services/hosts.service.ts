import { api } from './api';

export interface HostProfileData {
  id: string;
  userId: string;
  realName: string;
  idNumber: string;
  bio?: string;
  languages?: string[];
  categories?: string[];
  country?: string;
  experience?: string;
  isFeatured?: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  hostLevel: number;
  xp: number;
  performanceScore: number;
  hostRating?: number;
  followersCount: number;
  totalRoomsHosted: number;
  totalSpeakingTimeMinutes: number;
  rejectionReason?: string;
  createdAt: string;
}

export type HostVerificationDocumentCategory =
  | 'GOVERNMENT_ID'
  | 'SELFIE'
  | 'SUPPORTING_DOCUMENT';

export interface HostVerificationAssetData {
  assetId: string;
  category: HostVerificationDocumentCategory;
  originalFilename: string;
  verifiedMimeType: string;
  verifiedFormat: string;
  fileSize: number;
  validationStatus: 'PENDING' | 'VALIDATED' | 'REJECTED';
  isActive: boolean;
  linkedToApplication: boolean;
  createdAt: string;
}

export interface HostEarningsData {
  totalHostsWithEarnings: number;
  totalLifetimeEarnings: number;
  totalPendingSettlements: number;
  totalCompletedSettlements: number;
  earningsList: Array<{
    id: string;
    hostProfileId: string;
    userId: string;
    dailyEarnings: number;
    weeklyEarnings: number;
    monthlyEarnings: number;
    lifetimeEarnings: number;
    pendingSettlements: number;
    completedSettlements: number;
    giftIncome: number;
    vipBonusIncome: number;
  }>;
}

export interface HostAuditNoteData {
  id: string;
  hostProfileId: string;
  adminId: string;
  note: string;
  action: string;
  createdAt: string;
}

export const hostsAdminService = {
  async getApplications(status?: string) {
    const res = await api.get('/hosts/admin/applications', {
      params: status ? { status } : {},
    });
    return res.data as HostProfileData[];
  },

  async getVerificationAssets(hostId: string, signal?: AbortSignal) {
    const res = await api.get(
      `/hosts/admin/applications/${encodeURIComponent(hostId)}/verification-assets`,
      { signal },
    );
    return res.data as HostVerificationAssetData[];
  },

  async getVerificationAssetContent(assetId: string, signal?: AbortSignal) {
    const res = await api.get(
      `/hosts/verification/assets/${encodeURIComponent(assetId)}/content`,
      {
        responseType: 'blob',
        signal,
        headers: { 'X-Silent-Error': 'true' },
      },
    );
    return res.data as Blob;
  },

  async approveHost(id: string) {
    const res = await api.post(`/hosts/admin/approve/${id}`);
    return res.data;
  },

  async rejectHost(id: string, reason: string) {
    const res = await api.post(`/hosts/admin/reject/${id}`, { reason });
    return res.data;
  },

  async suspendHost(id: string) {
    const res = await api.post(`/hosts/admin/suspend/${id}`);
    return res.data;
  },

  async reactivateHost(id: string) {
    const res = await api.post(`/hosts/admin/reactivate/${id}`);
    return res.data;
  },

  async getAuditHistory(hostId: string) {
    const res = await api.get(`/hosts/admin/audit-history/${hostId}`);
    return res.data as HostAuditNoteData[];
  },

  async addAuditNote(hostId: string, note: string) {
    const res = await api.post(`/hosts/admin/audit-note/${hostId}`, { note });
    return res.data;
  },

  async getEarningsOverview() {
    const res = await api.get('/hosts/admin/earnings');
    return res.data as HostEarningsData;
  },

  async completeSettlement(hostId: string, amount: number) {
    const res = await api.post(`/hosts/admin/settlement/complete/${hostId}`, { amount });
    return res.data;
  },

  async grantReward(hostId: string, rewardName: string, amount: number) {
    const res = await api.post(`/hosts/admin/grant-reward/${hostId}`, { rewardName, amount });
    return res.data;
  },

  async getTopHosts(limit = 10) {
    const res = await api.get('/hosts/top-hosts', { params: { limit } });
    return res.data as HostProfileData[];
  },
};
