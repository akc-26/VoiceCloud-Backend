import { api } from './api';

export interface RoomItem {
  id: string;
  title: string;
  hostId: string;
  category: string;
  isPrivate: boolean;
  participantCount: number;
  status: string;
  createdAt: string;
}

export const roomsService = {
  async getRooms(params?: { page?: number; limit?: number; status?: string }) {
    const res = await api.get('/rooms', { params });
    return res.data;
  },

  async getRoomById(id: string) {
    const res = await api.get(`/rooms/${id}`);
    return res.data;
  },

  async closeRoom(id: string) {
    const res = await api.delete(`/rooms/${id}`);
    return res.data;
  },
};
