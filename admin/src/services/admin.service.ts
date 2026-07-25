import { api } from './api';

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

  async getProviderConfigs() {
    const res = await api.get('/admin/providers');
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
};
