import { apiClient } from '@/api/client';
import type { ChatMessage, Conversation, MessagePage } from '@/features/messaging/types';
import type { RtcJoinResult, RtcParticipantsResult, VoiceCloudRoomDetail } from './types';

export const roomApi = {
  async detail(roomId: string): Promise<VoiceCloudRoomDetail> {
    const { data } = await apiClient.get(`/rooms/${roomId}`);
    return data;
  },
  async join(roomId: string): Promise<RtcJoinResult> {
    const { data } = await apiClient.post('/rtc/rooms/join', {
      roomId,
      role: 'listener',
      deviceInfo: 'voicecloud-web',
    });
    return data;
  },
  async rejoin(roomId: string, previousToken?: string): Promise<RtcJoinResult> {
    const { data } = await apiClient.post('/rtc/rooms/rejoin', {
      roomId,
      previousToken: previousToken || undefined,
    });
    return data;
  },
  async leave(roomId: string): Promise<{ message: string; roomId: string; userId: string }> {
    const { data } = await apiClient.post('/rtc/rooms/leave', { roomId });
    return data;
  },
  async participants(roomId: string): Promise<RtcParticipantsResult> {
    const { data } = await apiClient.get(`/rtc/rooms/${roomId}/participants`);
    return data;
  },
  async roomConversation(roomId: string, name?: string): Promise<Conversation> {
    const { data } = await apiClient.post('/chat/conversations', {
      type: 'room',
      roomId,
      name: name || undefined,
    });
    return data;
  },
  async roomMessages(conversationId: string, page = 1, limit = 100): Promise<MessagePage> {
    const { data } = await apiClient.get(`/chat/conversations/${conversationId}/messages`, {
      params: { page, limit },
    });
    return data;
  },
  async sendRoomMessage(conversationId: string, content: string): Promise<ChatMessage> {
    const { data } = await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
      type: 'text',
      content,
    });
    return data;
  },
  async addMessageReaction(messageId: string, emoji: string) {
    const { data } = await apiClient.post(`/chat/messages/${messageId}/reactions`, { emoji });
    return data;
  },
  async raiseHand(roomId: string, seatIndex = 1) {
    const { data } = await apiClient.post(`/rtc/rooms/${roomId}/raise-hand`, { seatIndex });
    return data;
  },
  async cancelRaiseHand(roomId: string) {
    const { data } = await apiClient.post(`/rtc/rooms/${roomId}/cancel-raise-hand`);
    return data;
  },
  async reportSpeakingState(roomId: string, isSpeaking: boolean, audioLevel = 0) {
    const { data } = await apiClient.post('/rtc/speaking-state', { roomId, isSpeaking, audioLevel });
    return data;
  },
};
