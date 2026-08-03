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

  // Infrastructure Provider Management
  async getProviderConfigs() {
    const res = await api.get('/admin/providers');
    return res.data as ProviderConfigData[];
  },

  async getProviderHealthSummary() {
    const res = await api.get('/admin/providers/health-summary');
    return res.data;
  },

  async createProviderConfig(dto: Partial<ProviderConfigData>) {
    const res = await api.post('/admin/providers', dto);
    return res.data;
  },

  async updateProviderConfig(id: string, dto: Partial<ProviderConfigData>) {
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
