import { api } from './api';

export interface RoomItem {
  id: string;
  title: string;
  description?: string | null;
  hostId: string;
  hostName?: string;
  hostUsername?: string | null;
  category: string;
  language?: string;
  audioQuality?: string;
  isPrivate: boolean;
  isInviteOnly?: boolean;
  isLocked?: boolean;
  isPremium?: boolean;
  isTicketRequired?: boolean;
  isSubscriberOnly?: boolean;
  isVerifiedOnly?: boolean;
  clubId?: string | null;
  participantCount: number;
  listenerCount?: number;
  speakerCount?: number;
  giftActivity?: number;
  popularityScore?: number;
  status: string;
  isLive?: boolean;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface RoomListResponse {
  data: RoomItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const roomsService = {
  async getRooms(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const res = await api.get('/admin/rooms', { params });
    return res.data as RoomListResponse;
  },

  async getRoomById(id: string) {
    const res = await api.get(`/admin/rooms/${id}`);
    return res.data as RoomItem;
  },

  async closeRoom(id: string) {
    const res = await api.post(`/admin/rooms/${id}/terminate`);
    return res.data;
  },
};
