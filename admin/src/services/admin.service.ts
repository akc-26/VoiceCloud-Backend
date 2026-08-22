import { api } from './api';

export interface HostLevelBenefitSettings {
  key: string;
  label: string;
}

export interface HostLevelSettings {
  level: number;
  name: string;
  minimumXp: number;
  benefits: HostLevelBenefitSettings[];
}

export interface HostBusinessSettings {
  applicationsEnabled: boolean;
  minFollowers: number;
  minCompletedRooms: number;
  requireGoodStanding: boolean;
  levels: HostLevelSettings[];
  updatedAt: string;
}

export type UpdateHostBusinessSettings = Omit<HostBusinessSettings, 'updatedAt'>;

export interface OperationalSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maxRoomCapacity: number;
  maxSpeakerSeats: number;
  updatedAt: string;
}

export type UpdateOperationalSettings = Omit<OperationalSettings, 'updatedAt'>;

export interface StreamingInfrastructureSettings {
  provider: string;
  rtmpUrl: string;
  webrtcUrl: string;
  turnStunServers: string[];
  recordingEnabled: boolean;
  lowLatencyMode: boolean;
  defaultBitrate: number;
  codec: string;
  region: string;
  streamKeyPolicy: string;
  updatedAt: string;
}

export type UpdateStreamingInfrastructureSettings = Omit<
  StreamingInfrastructureSettings,
  'updatedAt'
>;


export interface RtcMonitoringActiveSession {
  id: string;
  roomId: string;
  hostId: string;
  provider: string;
  status: string;
  qualityProfile: string;
  concurrentUsers: number;
  activeSpeakersCount: number;
  startTime: string;
  recordingStatus: 'recording' | 'idle';
}

export interface RtcMonitoringStats {
  activeRoomsCount: number;
  connectedParticipantsCount: number;
  activeProvider: string;
  providerStatus: string;
  averageRtt: number | null;
  averagePacketLoss: number | null;
  recordingStatus: string;
  activeRecordingsCount: number;
  recordingCapability: 'egress_adapter_required' | 'unavailable';
  connectionFailures: number | null;
  reconnectionCount: number | null;
  activeSpeakersCount: number;
  telemetryCompleteness: 'measured' | 'no-data';
  activeSessions: RtcMonitoringActiveSession[];
}

export interface ProviderConfigData {
  id: string;
  category: string;
  providerType: string;
  name: string;
  config: Record<string, any>;
  isEnabled: boolean;
  isActive: boolean;
  isSandbox: boolean;
  priority: number;
  notes?: string;
  tags?: string[];
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'not_tested';
  lastTestedAt?: string;
  lastLatencyMs?: number;
  lastErrorMessage?: string;
  successCount?: number;
  failureCount?: number;
  lastSuccessAt?: string;
  statusDetails?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}


export interface CreateProviderConfigRequest {
  category: string;
  providerType: string;
  name: string;
  config: Record<string, any>;
  isEnabled?: boolean;
  isActive?: boolean;
  isSandbox?: boolean;
  priority?: number;
  notes?: string;
  tags?: string[];
}

export interface UpdateProviderConfigRequest {
  name?: string;
  config?: Record<string, any>;
  isEnabled?: boolean;
  isActive?: boolean;
  isSandbox?: boolean;
  priority?: number;
  notes?: string;
  tags?: string[];
}

export const adminService = {
  async getDashboardStats() {
    const res = await api.get('/admin/dashboard/stats');
    return res.data;
  },

  async getAuditLogs(params?: { page?: number; limit?: number }) {
    const res = await api.get('/admin/audit-logs', { params });
    return res.data;
  },

  async getFeatureFlags() {
    const res = await api.get('/admin/feature-flags');
    return res.data;
  },

  async updateFeatureFlag(id: string, isEnabled: boolean) {
    const res = await api.patch(`/admin/feature-flags/${id}`, { isEnabled });
    return res.data;
  },

  async getSystemSettings() {
    const res = await api.get('/admin/settings');
    return res.data;
  },

  async updateSystemSetting(key: string, value: any) {
    const res = await api.patch(`/admin/settings/${key}`, { value });
    return res.data;
  },

  async getOperationalSettings() {
    const res = await api.get<OperationalSettings>(
      '/admin/settings/operational',
    );
    return res.data;
  },

  async updateOperationalSettings(settings: UpdateOperationalSettings) {
    const res = await api.put<OperationalSettings>(
      '/admin/settings/operational',
      settings,
    );
    return res.data;
  },

  async getStreamingInfrastructureSettings() {
    const res = await api.get<StreamingInfrastructureSettings>(
      '/admin/settings/streaming-infrastructure',
    );
    return res.data;
  },

  async updateStreamingInfrastructureSettings(
    settings: UpdateStreamingInfrastructureSettings,
  ) {
    const res = await api.put<StreamingInfrastructureSettings>(
      '/admin/settings/streaming-infrastructure',
      settings,
    );
    return res.data;
  },

  async getHostBusinessSettings() {
    const res = await api.get<HostBusinessSettings>(
      '/admin/settings/host-business',
    );
    return res.data;
  },

  async updateHostBusinessSettings(settings: UpdateHostBusinessSettings) {
    const res = await api.put<HostBusinessSettings>(
      '/admin/settings/host-business',
      settings,
    );
    return res.data;
  },


  async getRtcMonitoringStats() {
    const res = await api.get<RtcMonitoringStats>('/rtc/admin/monitoring');
    return res.data;
  },

  // Infrastructure Provider Management
  async getProviderConfigs() {
    const res = await api.get('/admin/providers');
    return res.data as ProviderConfigData[];
  },

  async getProviderHealthSummary() {
    const res = await api.get('/admin/providers/health-summary');
    return res.data;
  },

  async createProviderConfig(dto: CreateProviderConfigRequest) {
    const res = await api.post('/admin/providers', dto);
    return res.data;
  },

  async updateProviderConfig(id: string, dto: UpdateProviderConfigRequest) {
    const res = await api.patch(`/admin/providers/${id}`, dto);
    return res.data;
  },

  async setActiveProviderConfig(id: string) {
    const res = await api.patch(`/admin/providers/${id}/activate`);
    return res.data;
  },

  async testProviderConnection(id: string) {
    const res = await api.post(`/admin/providers/${id}/test`);
    return res.data;
  },

  async revealProviderSecret(id: string) {
    const res = await api.post(`/admin/providers/${id}/reveal`);
    return res.data;
  },

  async rotateProviderSecret(id: string, secretConfig: Record<string, any>, reason?: string) {
    const res = await api.post(`/admin/providers/${id}/rotate`, { secretConfig, reason });
    return res.data;
  },

  async getProviderHistory(id: string) {
    const res = await api.get(`/admin/providers/${id}/history`);
    return res.data;
  },

  async rollbackProviderConfig(id: string, historyId: string) {
    const res = await api.post(`/admin/providers/${id}/rollback/${historyId}`);
    return res.data;
  },

  async deleteProviderConfig(id: string) {
    const res = await api.delete(`/admin/providers/${id}`);
    return res.data;
  },

  async getAppVersions() {
    const res = await api.get('/admin/versions');
    return res.data;
  },

  async getCmsPages() {
    const res = await api.get('/admin/cms');
    return res.data;
  },

  async updateCmsPage(id: string, data: Record<string, any>) {
    const res = await api.patch(`/admin/cms/${id}`, data);
    return res.data;
  },


  // Referral & Invite administration
  async getReferralCampaigns(params?: Record<string, any>) { const res = await api.get('/admin/referrals/campaigns', { params }); return res.data; },
  async createReferralCampaign(data: Record<string, any>) { const res = await api.post('/admin/referrals/campaigns', data); return res.data; },
  async updateReferralCampaign(id: string, data: Record<string, any>) { const res = await api.patch(`/admin/referrals/campaigns/${id}`, data); return res.data; },
  async deleteReferralCampaign(id: string) { const res = await api.delete(`/admin/referrals/campaigns/${id}`); return res.data; },
  async getReferralFraudLogs(params?: Record<string, any>) { const res = await api.get('/admin/referrals/fraud-logs', { params }); return res.data; },
  async executeReferralFraudAction(data: Record<string, any>) { const res = await api.post('/admin/referrals/fraud/action', data); return res.data; },
  async getReferralBlacklist(params?: Record<string, any>) { const res = await api.get('/admin/referrals/blacklist', { params }); return res.data; },
  async addReferralBlacklist(data: Record<string, any>) { const res = await api.post('/admin/referrals/blacklist', data); return res.data; },
  async removeReferralBlacklist(id: string) { const res = await api.delete(`/admin/referrals/blacklist/${id}`); return res.data; },
  async grantReferralReward(data: Record<string, any>) { const res = await api.post('/admin/referrals/grant-reward', data); return res.data; },
  async getReferralAnalytics() { const res = await api.get('/admin/referrals/analytics'); return res.data; },

  // Persisted announcements
  async getAnnouncements(params?: Record<string, any>) { const res = await api.get('/announcements/admin', { params }); return res.data; },
  async createAnnouncement(data: Record<string, any>) { const res = await api.post('/announcements', data); return res.data; },
  async updateAnnouncement(id: string, data: Record<string, any>) { const res = await api.put(`/announcements/${id}`, data); return res.data; },
  async deleteAnnouncement(id: string) { const res = await api.delete(`/announcements/${id}`); return res.data; },

  // Persisted moderation/reporting
  async getModerationReports(params?: Record<string, any>) { const res = await api.get('/moderation/reports', { params }); return res.data; },
  async approveModerationReport(id: string, resolutionNotes?: string) { const res = await api.patch(`/moderation/reports/${id}/approve`, { resolutionNotes }); return res.data; },
  async dismissModerationReport(id: string, resolutionNotes?: string) { const res = await api.patch(`/moderation/reports/${id}/dismiss`, { resolutionNotes }); return res.data; },
  async getModerationAuditLogs(params?: Record<string, any>) { const res = await api.get('/moderation/audit-logs', { params }); return res.data; },

  // Infrastructure Backup & Disaster Recovery API
  async getBackups() {
    const res = await api.get('/admin/backups');
    return res.data;
  },

  async createBackup(dto?: any) {
    const res = await api.post('/admin/backups', dto || {});
    return res.data;
  },

  async verifyBackup(id: string) {
    const res = await api.post(`/admin/backups/${id}/verify`);
    return res.data;
  },

  async deleteBackup(id: string) {
    const res = await api.delete(`/admin/backups/${id}`);
    return res.data;
  },

  async downloadBackup(id: string) {
    const response = await api.get(`/admin/backups/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getRestorePreview(id: string) {
    const res = await api.get(`/admin/backups/restore/preview/${id}`);
    return res.data;
  },

  async restoreBackup(dto: { backupId: string; targetComponents?: string[]; autoRollback?: boolean }) {
    const res = await api.post('/admin/backups/restore', dto);
    return res.data;
  },

  async getRestoreHistory() {
    const res = await api.get('/admin/backups/restore/history');
    return res.data;
  },

  async getBackupSchedules() {
    const res = await api.get('/admin/backups/schedules/list');
    return res.data;
  },

  async createBackupSchedule(dto: any) {
    const res = await api.post('/admin/backups/schedules', dto);
    return res.data;
  },

  async updateBackupSchedule(id: string, dto: any) {
    const res = await api.patch(`/admin/backups/schedules/${id}`, dto);
    return res.data;
  },

  async deleteBackupSchedule(id: string) {
    const res = await api.delete(`/admin/backups/schedules/${id}`);
    return res.data;
  },

  async purgeRetention() {
    const res = await api.post('/admin/backups/retention/purge');
    return res.data;
  },

  async getDisasterRecoveryStatus() {
    const res = await api.get('/admin/backups/disaster-recovery/status');
    return res.data;
  },
};
