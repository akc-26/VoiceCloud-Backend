import { apiClient } from '@/api/client';
import type {
  CreateRoomInput,
  HostProfileSummary,
  HostSearchPage,
  OwnedRoom,
  OwnedRoomPage,
  RoomPoll,
  RoomQuiz,
  ScheduledRoom,
  ScheduledRoomInput,
  ScheduledRoomPage,
  StageState,
} from './types';

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export const hostingApi = {
  async hostProfile(): Promise<HostProfileSummary> {
    const { data } = await apiClient.get('/hosts/profile');
    return data;
  },
  async ownedRooms(search = ''): Promise<OwnedRoomPage> {
    const { data } = await apiClient.get('/rooms/mine', { params: { page: 1, limit: 100, search: search || undefined } });
    return data;
  },
  async createRoom(input: CreateRoomInput): Promise<OwnedRoom> {
    const { data } = await apiClient.post('/rooms', input);
    return data;
  },
  async updateRoom(roomId: string, input: Partial<CreateRoomInput>): Promise<OwnedRoom> {
    const { data } = await apiClient.patch(`/rooms/${roomId}`, input);
    return data;
  },
  async deleteRoom(roomId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.delete(`/rooms/${roomId}`);
    return data;
  },
  async preflightBroadcast(roomId: string) {
    const { data } = await apiClient.post('/rtc/token', { roomId, role: 'host' });
    if (data?.provider !== 'livekit' || !data?.serverUrl) {
      throw new Error(`Real browser broadcasting requires an active LiveKit provider. Current provider: ${data?.provider || 'unknown'}.`);
    }
    return data;
  },
  async activeSessions(roomId: string): Promise<any[]> {
    const { data } = await apiClient.get('/rtc/sessions/active', { params: { roomId, limit: 20 } });
    return Array.isArray(data) ? data : data?.data || [];
  },
  async ensureVoiceSession(roomId: string) {
    const sessions = await hostingApi.activeSessions(roomId);
    const existing = sessions.find((session) => session?.roomId === roomId && String(session?.status || '').toLowerCase() === 'active');
    if (existing) return existing;
    const { data } = await apiClient.post('/rtc/sessions/start', { roomId, qualityProfile: 'speech' });
    return data;
  },
  async startBroadcast(roomId: string): Promise<OwnedRoom> {
    await hostingApi.preflightBroadcast(roomId);
    const { data: room } = await apiClient.post(`/rooms/${roomId}/start`);
    try {
      await hostingApi.ensureVoiceSession(roomId);
      return room;
    } catch (error) {
      await apiClient.post(`/rooms/${roomId}/end`).catch(() => undefined);
      throw error;
    }
  },
  async pause(roomId: string): Promise<OwnedRoom> {
    const { data } = await apiClient.post(`/rooms/${roomId}/pause`);
    return data;
  },
  async resume(roomId: string): Promise<OwnedRoom> {
    const { data } = await apiClient.post(`/rooms/${roomId}/resume`);
    return data;
  },
  async endBroadcast(roomId: string): Promise<OwnedRoom> {
    const sessions = await hostingApi.activeSessions(roomId);
    for (const session of sessions) {
      if (session?.id) await apiClient.post('/rtc/sessions/stop', { sessionId: session.id }).catch(() => undefined);
    }
    const { data } = await apiClient.post(`/rooms/${roomId}/end`);
    return data;
  },
  async stage(roomId: string): Promise<StageState> {
    const { data } = await apiClient.get(`/rtc/rooms/${roomId}/stage`);
    return data;
  },
  async inviteSpeaker(roomId: string, targetUserId: string) {
    const { data } = await apiClient.post(`/rtc/rooms/${roomId}/invite-speaker`, { targetUserId });
    return data;
  },
  async approveSpeaker(roomId: string, targetUserId: string, seatIndex = 1) {
    const { data } = await apiClient.post(`/rtc/rooms/${roomId}/approve-speaker`, { targetUserId, seatIndex });
    return data;
  },
  async rejectSpeaker(roomId: string, targetUserId: string) {
    const { data } = await apiClient.post(`/rtc/rooms/${roomId}/reject-speaker`, { targetUserId });
    return data;
  },
  async removeSpeaker(roomId: string, targetUserId: string) {
    const { data } = await apiClient.post(`/rtc/rooms/${roomId}/remove-speaker`, { targetUserId });
    return data;
  },
  async muteSpeaker(roomId: string, targetUserId: string, mute: boolean) {
    const { data } = await apiClient.post(`/rtc/rooms/${roomId}/mute-user`, { targetUserId, mute });
    return data;
  },
  async searchPeople(query: string): Promise<HostSearchPage> {
    const { data } = await apiClient.get('/users/search', { params: { query: query || undefined, page: 1, limit: 30 } });
    const page = data as HostSearchPage;
    const visible = (page?.data || []).filter((user) => !user.role || ['USER', 'CREATOR'].includes(String(user.role).toUpperCase()));
    return { ...page, data: visible };
  },
  async scheduled(hostId: string): Promise<ScheduledRoomPage> {
    const { data } = await apiClient.get('/scheduled-rooms', { params: { hostId, page: 1, limit: 100 } });
    return data;
  },
  async createScheduled(input: ScheduledRoomInput): Promise<ScheduledRoom> {
    const { data } = await apiClient.post('/scheduled-rooms', { ...input, timeZone: input.timeZone || browserTimeZone() });
    return data;
  },
  async updateScheduled(id: string, input: Partial<ScheduledRoomInput>): Promise<ScheduledRoom> {
    const { data } = await apiClient.patch(`/scheduled-rooms/${id}`, input);
    return data;
  },
  async deleteScheduled(id: string) {
    const { data } = await apiClient.delete(`/scheduled-rooms/${id}`);
    return data;
  },
  async roomPolls(roomId: string): Promise<RoomPoll[]> {
    const { data } = await apiClient.get(`/polls/rooms/${roomId}`);
    return Array.isArray(data) ? data : data?.data || [];
  },
  async createPoll(roomId: string, title: string, options: string[], durationSeconds?: number): Promise<RoomPoll> {
    const { data } = await apiClient.post('/polls', { roomId, title, pollType: 'single', options, durationSeconds });
    return data;
  },
  async startPoll(pollId: string): Promise<RoomPoll> {
    const { data } = await apiClient.post(`/polls/${pollId}/start`);
    return data;
  },
  async stopPoll(pollId: string): Promise<RoomPoll> {
    const { data } = await apiClient.post(`/polls/${pollId}/stop`);
    return data;
  },
  async votePoll(pollId: string, optionIds: string[]) {
    const { data } = await apiClient.post(`/polls/${pollId}/vote`, { optionIds });
    return data;
  },
  async activeQuiz(roomId: string): Promise<RoomQuiz | null> {
    const { data } = await apiClient.get(`/quizzes/rooms/${roomId}/active`);
    return data || null;
  },
  async createQuiz(roomId: string, title: string, question: string, options: string[], correctOptionIndex: number): Promise<RoomQuiz> {
    const { data } = await apiClient.post('/quizzes', {
      roomId,
      title,
      totalRounds: 1,
      questions: [{ roundNumber: 1, questionText: question, options, correctOptionIndex, durationSeconds: 30, points: 100 }],
    });
    return data;
  },
  async startQuiz(quizId: string): Promise<RoomQuiz> {
    const { data } = await apiClient.post(`/quizzes/${quizId}/start`);
    return data;
  },
  async nextQuizRound(quizId: string): Promise<RoomQuiz> {
    const { data } = await apiClient.post(`/quizzes/${quizId}/next-round`);
    return data;
  },
  async stopQuiz(quizId: string): Promise<RoomQuiz> {
    const { data } = await apiClient.post(`/quizzes/${quizId}/stop`);
    return data;
  },
  async submitQuizAnswer(quizId: string, questionId: string, selectedOptionIndex: number) {
    const { data } = await apiClient.post(`/quizzes/${quizId}/submit`, { questionId, selectedOptionIndex, timeTakenSeconds: 0 });
    return data;
  },
};
