import { apiClient } from '@/api/client';
import type {
  FollowMutationResult,
  FriendListItem,
  GlobalSearchResponse,
  PaginatedData,
  PaginatedItems,
  PendingFriendRequests,
  VoiceCloudClub,
  VoiceCloudProfile,
  VoiceCloudRoom,
  VoiceCloudScheduledRoom,
  VoiceCloudUser,
} from './types';

const pageParams = (page = 1, limit = 20) => ({ page, limit });

export const discoveryApi = {
  async liveRooms(category?: string): Promise<PaginatedItems<VoiceCloudRoom>> {
    const { data } = await apiClient.get('/discovery/rooms/live', { params: { ...pageParams(1, 40), category: category || undefined } });
    return data;
  },
  async trendingRooms(limit = 8): Promise<PaginatedItems<VoiceCloudRoom>> {
    const { data } = await apiClient.get('/discovery/rooms/trending', { params: pageParams(1, limit) });
    return data;
  },
  async popularRooms(limit = 8): Promise<PaginatedItems<VoiceCloudRoom>> {
    const { data } = await apiClient.get('/discovery/rooms/popular', { params: pageParams(1, limit) });
    return data;
  },
  async trendingUsers(limit = 8): Promise<PaginatedItems<VoiceCloudUser>> {
    const { data } = await apiClient.get('/discovery/users/trending', { params: pageParams(1, limit) });
    return data;
  },
  async suggestedUsers(limit = 8): Promise<PaginatedItems<VoiceCloudUser>> {
    const { data } = await apiClient.get('/discovery/users/suggested', { params: pageParams(1, limit) });
    return data;
  },
  async clubs(search?: string, limit = 6): Promise<PaginatedData<VoiceCloudClub>> {
    const { data } = await apiClient.get('/clubs', { params: { page: 1, limit, search: search || undefined } });
    return data;
  },
  async scheduled(search?: string, limit = 6): Promise<PaginatedData<VoiceCloudScheduledRoom>> {
    const { data } = await apiClient.get('/scheduled-rooms', { params: { page: 1, limit, search: search || undefined, status: 'SCHEDULED' } });
    return data;
  },
  async globalSearch(query: string): Promise<GlobalSearchResponse> {
    const { data } = await apiClient.get('/search', { params: { q: query, type: 'all', page: 1, limit: 12 } });
    return data;
  },
};

export const profileApi = {
  async publicByUsername(username: string): Promise<VoiceCloudProfile> {
    const { data } = await apiClient.get(`/users/public/${encodeURIComponent(username)}`);
    return data;
  },
  async byId(userId: string): Promise<VoiceCloudProfile> {
    const { data } = await apiClient.get(`/users/${userId}/profile`);
    return data;
  },
  async me(): Promise<VoiceCloudProfile> {
    const { data } = await apiClient.get('/users/profile/me');
    return data;
  },
  async follow(userId: string): Promise<FollowMutationResult> {
    const { data } = await apiClient.post<FollowMutationResult>(`/users/${userId}/follow`);
    return data;
  },
  async unfollow(userId: string): Promise<FollowMutationResult> {
    const { data } = await apiClient.delete<FollowMutationResult>(`/users/${userId}/follow`);
    return data;
  },
  async followers(search = ''): Promise<PaginatedData<VoiceCloudUser>> {
    const { data } = await apiClient.get('/users/followers', { params: { page: 1, limit: 50, search: search || undefined } });
    return data;
  },
  async following(search = ''): Promise<PaginatedData<VoiceCloudUser>> {
    const { data } = await apiClient.get('/users/following', { params: { page: 1, limit: 50, search: search || undefined } });
    return data;
  },
};

export const friendsApi = {
  async list(category?: string): Promise<PaginatedData<FriendListItem>> {
    const { data } = await apiClient.get('/users/friends', { params: { page: 1, limit: 50, category: category || undefined } });
    return data;
  },
  async pending(): Promise<PendingFriendRequests> {
    const { data } = await apiClient.get('/users/friends/requests/pending');
    return data;
  },
  async suggested(): Promise<{ data: VoiceCloudUser[]; total: number }> {
    const { data } = await apiClient.get('/users/friends/suggested', { params: { page: 1, limit: 12 } });
    return data;
  },
  async send(receiverId: string) {
    const { data } = await apiClient.post('/users/friends/request', { receiverId });
    return data;
  },
  async accept(requestId: string) {
    const { data } = await apiClient.post(`/users/friends/request/${requestId}/accept`);
    return data;
  },
  async reject(requestId: string) {
    const { data } = await apiClient.post(`/users/friends/request/${requestId}/reject`);
    return data;
  },
  async remove(friendId: string) {
    const { data } = await apiClient.delete(`/users/friends/${friendId}`);
    return data;
  },
};
