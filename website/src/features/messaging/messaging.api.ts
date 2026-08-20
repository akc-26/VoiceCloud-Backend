import { apiClient } from '@/api/client';
import type { Conversation, ConversationList, MessagePage, MessageType } from './types';

export const messagingApi = {
  async conversations(search = '', page = 1, limit = 50): Promise<ConversationList> {
    const { data } = await apiClient.get('/chat/conversations', { params: { search: search || undefined, page, limit } });
    return data;
  },
  async conversation(id: string): Promise<Conversation> {
    const { data } = await apiClient.get(`/chat/conversations/${id}`);
    return data;
  },
  async messages(id: string, page = 1, limit = 100): Promise<MessagePage> {
    const { data } = await apiClient.get(`/chat/conversations/${id}/messages`, { params: { page, limit } });
    return data;
  },
  async sendMessage(id: string, content: string, type: MessageType = 'text') {
    const { data } = await apiClient.post(`/chat/conversations/${id}/messages`, { type, content });
    return data;
  },
  async markRead(id: string, lastReadMessageId?: string) {
    const { data } = await apiClient.post(`/chat/conversations/${id}/read`, { lastReadMessageId });
    return data;
  },
  async direct(recipientId: string): Promise<Conversation> {
    const { data } = await apiClient.post('/chat/conversations', { type: 'direct', recipientId });
    return data;
  },
  async deleteConversation(id: string) {
    const { data } = await apiClient.delete(`/chat/conversations/${id}`);
    return data;
  },
};
