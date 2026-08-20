import { apiClient } from '@/api/client';
import type { Community, CommunityMember, CommunityPage, CommunityScheduledRoom, ReminderResult } from './types';

export const communityApi = {
  async list(search = '', category = '', page = 1, limit = 18): Promise<CommunityPage<Community>> {
    const { data } = await apiClient.get('/clubs', { params: { search: search || undefined, category: category || undefined, page, limit } });
    return data;
  },
  async detail(idOrHandle: string): Promise<Community> {
    const { data } = await apiClient.get(`/clubs/${encodeURIComponent(idOrHandle)}`);
    return data;
  },
  async members(clubId: string, search = '', page = 1, limit = 50): Promise<CommunityPage<CommunityMember>> {
    const { data } = await apiClient.get(`/clubs/${clubId}/members`, { params: { search: search || undefined, page, limit } });
    return data;
  },
  async join(clubId: string, inviteCode?: string): Promise<CommunityMember> {
    const { data } = await apiClient.post(`/clubs/${clubId}/join`, inviteCode ? { inviteCode } : {});
    return data;
  },
  async leave(clubId: string): Promise<{ message: string }> {
    const { data } = await apiClient.post(`/clubs/${clubId}/leave`);
    return data;
  },
  async scheduledRooms(clubId: string, page = 1, limit = 30): Promise<CommunityPage<CommunityScheduledRoom>> {
    const { data } = await apiClient.get('/scheduled-rooms', { params: { clubId, page, limit, status: 'SCHEDULED' } });
    return data;
  },
};

export const eventsApi = {
  async list(search = '', page = 1, limit = 30): Promise<CommunityPage<CommunityScheduledRoom>> {
    const { data } = await apiClient.get('/scheduled-rooms', { params: { search: search || undefined, page, limit, status: 'SCHEDULED' } });
    return data;
  },
  async detail(id: string): Promise<CommunityScheduledRoom> {
    const { data } = await apiClient.get(`/scheduled-rooms/${id}`);
    return data;
  },
  async reminder(id: string, settings: { enablePush?: boolean; enableEmail?: boolean } = { enablePush: true, enableEmail: false }): Promise<ReminderResult> {
    const { data } = await apiClient.post(`/scheduled-rooms/${id}/reminder`, settings);
    return data;
  },
};
