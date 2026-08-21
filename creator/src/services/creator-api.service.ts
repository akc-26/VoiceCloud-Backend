/**
 * Production-Ready API Abstraction Layer for Creator Studio
 * Endpoint Base: /api/v1
 */

import { useAuthStore, AuthResponseDto } from '../store/auth.store';
import { creatorSocketService } from './socket.service';
import {
  CreatorProfile,
  LiveRoomSummary,
  CreatorPlan,
  CreatorPlanInput,
  CreatorFollower,
  CreatorFollowersPage,
  CreatorSubscriber,
  PayoutRequest,
  CreatorAnalytics,
  BackendCreatorDashboardResponse,
  UserProfileResponse,
  WalletBalanceResponse,
  WalletSummaryResponse,
  WalletTransactionsResponse,
  CreatorEarningsResponse,
  NotificationsListResponse,
  RecentActivityItem,
  HostVerificationAsset,
  HostVerificationApplicationPayload,
  HostEligibilityResponse,
  OwnerHostProfile,
  CreatorRtcJoinResult,
  CreatorRoomStageState,
} from '../types/creator.types';

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface CreateLiveRoomInput {
  title: string;
  category?: string;
  audioQuality?: string;
  description?: string;
  language?: string;
  coverUrl?: string;
  clubId?: string;
  scheduledRoomId?: string;
  isLocked?: boolean;
  isPremium?: boolean;
  isTicketRequired?: boolean;
  ticketPriceAmount?: number;
  isSubscriberOnly?: boolean;
  isVerifiedOnly?: boolean;
  isInviteOnly?: boolean;
  isPrivate?: boolean;
}

export class CreatorApiService {
  private static instance: CreatorApiService;
  private baseUrl: string;

  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string | null) => void> = [];

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  }

  public static getInstance(): CreatorApiService {
    if (!CreatorApiService.instance) {
      CreatorApiService.instance = new CreatorApiService();
    }
    return CreatorApiService.instance;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const authState = useAuthStore.getState();
    const token = authState.accessToken || authState.token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private onRefreshed(token: string | null) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string | null) => void) {
    this.refreshSubscribers.push(cb);
  }

  private handleUnauthorizedRedirect() {
    useAuthStore.getState().logout();
    creatorSocketService.disconnect();
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.endsWith('/login')
    ) {
      window.location.href = '/creator/login';
    }
  }

  public async triggerTokenRefresh(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise<string | null>((resolve) => {
        this.addRefreshSubscriber(resolve);
      });
    }

    const authState = useAuthStore.getState();
    const currentRefreshToken = authState.refreshToken;
    if (!currentRefreshToken) {
      return null;
    }

    this.isRefreshing = true;
    try {
      if (import.meta.env.DEV) {
        console.log('[AuthDebug] Executing automatic token refresh...');
      }

      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!res.ok) {
        if (import.meta.env.DEV) {
          console.warn(
            `[AuthDebug] Token refresh API failed with status ${res.status}`,
          );
        }
        this.isRefreshing = false;
        this.onRefreshed(null);
        return null;
      }

      const data = await res.json();
      if (data && data.accessToken) {
        useAuthStore
          .getState()
          .setTokens(
            data.accessToken,
            data.refreshToken || currentRefreshToken,
            data.expiresIn,
          );

        if (import.meta.env.DEV) {
          console.log('[AuthDebug] Automatic token refresh successful');
        }

        const newAccessToken = data.accessToken;
        this.isRefreshing = false;
        this.onRefreshed(newAccessToken);

        creatorSocketService.updateAuthToken(newAccessToken);
        return newAccessToken;
      }

      this.isRefreshing = false;
      this.onRefreshed(null);
      return null;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[AuthDebug] Token refresh network error:', err);
      }
      this.isRefreshing = false;
      this.onRefreshed(null);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (
          response.status === 401 &&
          !isRetry &&
          !endpoint.includes('/auth/login') &&
          !endpoint.includes('/auth/refresh')
        ) {
          if (import.meta.env.DEV) {
            console.warn(
              `[AuthDebug] Received 401 for ${endpoint}. Attempting automatic token refresh...`,
            );
          }

          const newAccessToken = await this.triggerTokenRefresh();
          if (newAccessToken) {
            const retryHeaders = {
              ...headers,
              Authorization: `Bearer ${newAccessToken}`,
            };
            return this.request<T>(
              endpoint,
              { ...options, headers: retryHeaders },
              true,
            );
          } else {
            this.handleUnauthorizedRedirect();
            throw new ApiError('Session expired. Please log in again.', 401);
          }
        }

        let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        let errorData: any = null;

        try {
          errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = Array.isArray(errorData.message)
              ? errorData.message.join(', ')
              : errorData.message;
          }
        } catch {
          // Response was not JSON
        }

        if (response.status === 401) {
          this.handleUnauthorizedRedirect();
        }

        throw new ApiError(errorMessage, response.status, errorData);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        throw new ApiError('Request was cancelled', 0);
      }
      throw new ApiError(err.message || 'Network request failed', 500, err);
    }
  }

  /**
   * Authenticate against backend
   * Endpoint: POST /api/v1/auth/login
   */
  async login(credentials: {
    email?: string;
    username?: string;
    password?: string;
  }): Promise<AuthResponseDto> {
    return this.request<AuthResponseDto>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // ================= TASK 1 & 2 ENDPOINTS =================

  /**
   * Fetch Creator Overview Dashboard from backend
   * Endpoint: GET /api/v1/creator/dashboard
   */
  async getDashboardSummary(
    signal?: AbortSignal,
  ): Promise<BackendCreatorDashboardResponse> {
    return this.request<BackendCreatorDashboardResponse>('/creator/dashboard', {
      signal,
    });
  }

  /**
   * Fetch Authenticated User Profile
   * Endpoint: GET /api/v1/users/profile/me
   */
  async getMyProfile(signal?: AbortSignal): Promise<UserProfileResponse> {
    return this.request<UserProfileResponse>('/users/profile/me', { signal });
  }

  /**
   * Fetch Wallet Balances
   * Endpoint: GET /api/v1/wallet/balance
   */
  async getWalletBalance(signal?: AbortSignal): Promise<WalletBalanceResponse> {
    return this.request<WalletBalanceResponse>('/wallet/balance', { signal });
  }

  /**
   * Fetch Wallet Summary Overview
   * Endpoint: GET /api/v1/wallet/summary
   */
  async getWalletSummary(signal?: AbortSignal): Promise<WalletSummaryResponse> {
    return this.request<WalletSummaryResponse>('/wallet/summary', { signal });
  }

  async getWalletTransactions(
    params: { page?: number; limit?: number } = { page: 1, limit: 20 },
    signal?: AbortSignal,
  ): Promise<WalletTransactionsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return this.request<WalletTransactionsResponse>(
      `/wallet/transactions?${query.toString()}`,
      { signal },
    );
  }

  async getCreatorEarnings(
    signal?: AbortSignal,
  ): Promise<CreatorEarningsResponse> {
    return this.request<CreatorEarningsResponse>('/creator/earnings', {
      signal,
    });
  }

  /**
   * Fetch Notifications
   * Endpoint: GET /api/v1/notifications
   */
  async getNotifications(
    params: { limit?: number; page?: number } = { limit: 5 },
    signal?: AbortSignal,
  ): Promise<NotificationsListResponse> {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', String(params.limit));
    if (params.page) query.append('page', String(params.page));

    const [list, unread] = await Promise.all([
      this.request<any>(`/notifications?${query.toString()}`, { signal }),
      this.request<{ unreadCount: number }>('/notifications/unread-count', {
        signal,
      }),
    ]);

    return {
      data: Array.isArray(list?.data) ? list.data : [],
      total: Number(list?.total || 0),
      unreadCount: Number(unread?.unreadCount || 0),
    };
  }

  /**
   * Fetch Recent Received Gifts
   * Endpoint: GET /api/v1/gifts/history?role=receiver&limit=5
   */
  async getRecentReceivedGifts(
    limit = 5,
    signal?: AbortSignal,
  ): Promise<any[]> {
    const response = await this.request<any>(
      `/gifts/history?role=receiver&limit=${limit}`,
      { signal },
    );
    return Array.isArray(response) ? response : response?.data || [];
  }

  /**
   * Fetch Creator Subscription Plans
   * Endpoint: GET /api/v1/creator/plans
   */
  async getCreatorPlans(signal?: AbortSignal): Promise<CreatorPlan[]> {
    const res = await this.request<any>('/creator/plans?limit=100', { signal });
    return Array.isArray(res) ? res : res?.data || [];
  }

  async createCreatorPlan(
    data: CreatorPlanInput,
    signal?: AbortSignal,
  ): Promise<CreatorPlan> {
    return this.request<CreatorPlan>('/creator/plans', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  async updateCreatorPlan(
    id: string,
    data: Partial<CreatorPlanInput> & { status?: string },
    signal?: AbortSignal,
  ): Promise<CreatorPlan> {
    return this.request<CreatorPlan>(`/creator/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      signal,
    });
  }

  async archiveCreatorPlan(
    id: string,
    signal?: AbortSignal,
  ): Promise<CreatorPlan> {
    return this.request<CreatorPlan>(`/creator/plans/${id}`, {
      method: 'DELETE',
      signal,
    });
  }

  /**
   * Fetch Subscribers
   * Endpoint: GET /api/v1/creator/subscribers
   */
  async getSubscribers(signal?: AbortSignal): Promise<CreatorSubscriber[]> {
    const res = await this.request<any>('/creator/subscribers?limit=100', { signal });
    return Array.isArray(res) ? res : res?.data || [];
  }

  /**
   * Fetch Payout Requests
   * Endpoint: GET /api/v1/creator/payout-requests
   */
  async getPayoutRequests(signal?: AbortSignal): Promise<PayoutRequest[]> {
    const res = await this.request<any>('/creator/payout-requests', { signal });
    return Array.isArray(res) ? res : res.data || [];
  }

  /**
   * Submit Payout Request
   * Endpoint: POST /api/v1/creator/payout-request
   */
  async submitPayoutRequest(
    diamondAmount: number,
    method: string,
    details: string,
    signal?: AbortSignal,
  ): Promise<PayoutRequest> {
    return this.request<PayoutRequest>('/creator/payout-request', {
      method: 'POST',
      body: JSON.stringify({
        diamondAmount,
        payoutMethod: method,
        accountDetails: { details },
      }),
      signal,
    });
  }

  /**
   * Analytics Performance Metrics Method
   * Endpoint: GET /api/v1/analytics
   */
  async getAnalytics(
    period: '24h' | '7d' | '30d' | '1y' = '30d',
    signal?: AbortSignal,
  ): Promise<CreatorAnalytics> {
    const res = await this.request<CreatorAnalytics>(
      `/analytics?period=${period}`,
      { signal },
    );
    if (!res || !Array.isArray(res.dailyMetrics)) {
      throw new ApiError('Analytics response is incomplete', 502, res);
    }
    return res;
  }

  /**
   * Rooms API
   * Endpoint: GET /api/v1/rooms
   */
  async getRooms(signal?: AbortSignal): Promise<LiveRoomSummary[]> {
    const res = await this.request<any>('/rooms/mine?limit=100', { signal });
    const rooms = Array.isArray(res) ? res : res?.data || [];
    return rooms.map((r: any) => ({
      id: r.id,
      title: r.title || r.name || 'Untitled Audio Room',
      category: r.category || 'Audio Lounge',
      status: (r.status as any) || (r.isLive ? 'live' : 'offline'),
      currentListeners: r.currentListeners ?? r.listenerCount ?? r.listenersCount ?? 0,
      peakListeners: r.peakListeners || 0,
      audioQuality: r.audioQuality || '324kbps Ultra HD',
      startedAt: r.startedAt,
      scheduledFor: r.scheduledFor,
      isPrivate: r.isPrivate ?? !!(r.isInviteOnly || r.isLocked || r.clubId),
      isInviteOnly: r.isInviteOnly,
      scheduledRoomId: r.scheduledRoomId ?? null,
      description: r.description,
      hostId: r.hostId,
      listenerCount: r.listenerCount ?? 0,
      speakerCount: r.speakerCount ?? 0,
    }));
  }

  async getRoom(id: string, signal?: AbortSignal): Promise<LiveRoomSummary> {
    return this.request<LiveRoomSummary>(`/rooms/${id}`, { signal });
  }

  async startVoiceSession(roomId: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>('/rtc/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ roomId, qualityProfile: 'speech' }),
      signal,
    });
  }

  async getActiveVoiceSessions(roomId: string, signal?: AbortSignal): Promise<any[]> {
    const res = await this.request<any>(`/rtc/sessions/active?roomId=${encodeURIComponent(roomId)}&limit=20`, { signal });
    return Array.isArray(res) ? res : res?.data || [];
  }

  async stopVoiceSession(sessionId: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>('/rtc/sessions/stop', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
      signal,
    });
  }

  async ensureVoiceSession(roomId: string, signal?: AbortSignal): Promise<any> {
    const sessions = await this.getActiveVoiceSessions(roomId, signal);
    const existing = sessions.find((session) => session?.roomId === roomId && String(session?.status || '').toLowerCase() === 'active');
    return existing || this.startVoiceSession(roomId, signal);
  }

  async preflightBroadcastAudio(roomId: string, signal?: AbortSignal): Promise<CreatorRtcJoinResult> {
    const result = await this.request<CreatorRtcJoinResult>('/rtc/token', {
      method: 'POST',
      body: JSON.stringify({ roomId, role: 'host' }),
      signal,
    });
    if (result.provider !== 'livekit' || !result.serverUrl) {
      throw new ApiError(
        `Real browser broadcasting currently requires an active LiveKit provider. Current provider: ${result.provider || 'unknown'}.`,
        503,
        { code: 'RTC_MEDIA_UNAVAILABLE' },
      );
    }
    return result;
  }

  async startBroadcast(id: string, signal?: AbortSignal): Promise<any> {
    await this.preflightBroadcastAudio(id, signal);
    const room = await this.startRoom(id, signal);
    try {
      await this.ensureVoiceSession(id, signal);
      return room;
    } catch (error) {
      await this.endRoom(id, signal).catch(() => undefined);
      throw error;
    }
  }

  async endBroadcast(id: string, signal?: AbortSignal): Promise<any> {
    const sessions = await this.getActiveVoiceSessions(id, signal);
    for (const session of sessions) {
      if (session?.id) await this.stopVoiceSession(session.id, signal);
    }
    return this.endRoom(id, signal);
  }

  async joinRtcRoom(roomId: string, signal?: AbortSignal): Promise<CreatorRtcJoinResult> {
    return this.request<CreatorRtcJoinResult>('/rtc/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ roomId, role: 'host', deviceInfo: 'creator-studio-web' }),
      signal,
    });
  }

  async leaveRtcRoom(roomId: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>('/rtc/rooms/leave', {
      method: 'POST',
      body: JSON.stringify({ roomId }),
      signal,
    });
  }

  async getRtcParticipants(roomId: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/rtc/rooms/${roomId}/participants`, { signal });
  }

  async reportSpeakingState(roomId: string, isSpeaking: boolean, signal?: AbortSignal): Promise<any> {
    return this.request<any>('/rtc/speaking-state', {
      method: 'POST',
      body: JSON.stringify({ roomId, isSpeaking, audioLevel: isSpeaking ? 100 : 0 }),
      signal,
    });
  }

  async getRoomStage(roomId: string, signal?: AbortSignal): Promise<CreatorRoomStageState> {
    return this.request<CreatorRoomStageState>(`/rtc/rooms/${roomId}/stage`, { signal });
  }

  async getUserProfileById(userId: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/users/${userId}/profile`, { signal });
  }

  async getRoomConversation(roomId: string, name?: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ type: 'room', roomId, name }),
      signal,
    });
  }

  async getRoomMessages(conversationId: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/chat/conversations/${conversationId}/messages?page=1&limit=100`, { signal });
  }

  async sendRoomMessage(conversationId: string, content: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ type: 'text', content }),
      signal,
    });
  }

  async createRoom(
    data: CreateLiveRoomInput,
    signal?: AbortSignal,
  ): Promise<LiveRoomSummary> {
    return this.request<LiveRoomSummary>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  async updateRoom(
    id: string,
    data: Partial<LiveRoomSummary>,
    signal?: AbortSignal,
  ): Promise<LiveRoomSummary> {
    return this.request<LiveRoomSummary>(`/rooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      signal,
    });
  }

  async deleteRoom(
    id: string,
    signal?: AbortSignal,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/rooms/${id}`, {
      method: 'DELETE',
      signal,
    });
  }

  async startRoom(id: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/rooms/${id}/start`, {
      method: 'POST',
      signal,
    });
  }

  async pauseRoom(id: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/rooms/${id}/pause`, {
      method: 'POST',
      signal,
    });
  }

  async resumeRoom(id: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/rooms/${id}/resume`, {
      method: 'POST',
      signal,
    });
  }

  async endRoom(id: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/rooms/${id}/end`, {
      method: 'POST',
      signal,
    });
  }

  /**
   * Speaker Controls & RTC Actions
   */
  async inviteSpeaker(
    roomId: string,
    targetUserId: string,
    signal?: AbortSignal,
  ): Promise<any> {
    return this.request<any>(`/rtc/rooms/${roomId}/invite-speaker`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
      signal,
    });
  }

  async approveSpeaker(roomId: string, targetUserId: string, seatIndex = 1, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/rtc/rooms/${roomId}/approve-speaker`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId, seatIndex }),
      signal,
    });
  }

  async rejectSpeaker(roomId: string, targetUserId: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/rtc/rooms/${roomId}/reject-speaker`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
      signal,
    });
  }

  async removeSpeaker(
    roomId: string,
    targetUserId: string,
    signal?: AbortSignal,
  ): Promise<any> {
    return this.request<any>(`/rtc/rooms/${roomId}/remove-speaker`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
      signal,
    });
  }

  async muteSpeaker(
    roomId: string,
    targetUserId: string,
    isMuted: boolean,
    signal?: AbortSignal,
  ): Promise<any> {
    return this.request<any>(`/rtc/rooms/${roomId}/mute-user`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId, mute: isMuted }),
      signal,
    });
  }

  async lockSeat(
    roomId: string,
    seatIndex: number,
    isLocked: boolean,
    signal?: AbortSignal,
  ): Promise<any> {
    return this.request<any>(`/rtc/rooms/${roomId}/lock-seat`, {
      method: 'POST',
      body: JSON.stringify({ seatIndex, lock: isLocked }),
      signal,
    });
  }

  /**
   * Scheduled Rooms API
   * Endpoint: GET /api/v1/scheduled-rooms
   */
  async getScheduledRooms(hostId?: string, signal?: AbortSignal): Promise<any[]> {
    const query = new URLSearchParams({ limit: '100' });
    if (hostId) query.set('hostId', hostId);
    const res = await this.request<any>(`/scheduled-rooms?${query.toString()}`, { signal });
    return Array.isArray(res) ? res : res?.data || [];
  }

  async createScheduledRoom(
    data: Record<string, any>,
    signal?: AbortSignal,
  ): Promise<any> {
    return this.request<any>('/scheduled-rooms', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  async updateScheduledRoom(
    id: string,
    data: Record<string, any>,
    signal?: AbortSignal,
  ): Promise<any> {
    return this.request<any>(`/scheduled-rooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      signal,
    });
  }

  async deleteScheduledRoom(id: string, signal?: AbortSignal): Promise<any> {
    return this.request<any>(`/scheduled-rooms/${id}`, {
      method: 'DELETE',
      signal,
    });
  }

  /**
   * Followers API
   * Endpoint: GET /api/v1/users/followers
   */
  async getFollowersPage(
    params: { page?: number; limit?: number; search?: string; sortOrder?: 'ASC' | 'DESC' } = {},
    signal?: AbortSignal,
  ): Promise<CreatorFollowersPage> {
    const query = new URLSearchParams();
    query.set('page', String(params.page || 1));
    query.set('limit', String(params.limit || 20));
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const [followers, following] = await Promise.all([
      this.request<any>(`/users/followers?${query.toString()}`, { signal }),
      this.request<any>('/users/following?page=1&limit=1000', { signal }),
    ]);

    const followingUsers = Array.isArray(following)
      ? following
      : following?.data || [];
    const followingIds = new Set(
      followingUsers.map((user: any) => user?.id).filter(Boolean),
    );
    const followerUsers = Array.isArray(followers)
      ? followers
      : followers?.data || [];

    const data: CreatorFollower[] = followerUsers.map((user: any) => ({
      id: user.id,
      userId: user.id,
      name: user.displayName || user.username || 'Registered User',
      handle: user.username ? `@${user.username}` : '',
      avatarUrl: user.avatarUrl || '',
      badge:
        user.badges?.[0]?.name || (user.isVerified ? 'Verified' : 'Listener'),
      verified: Boolean(user.isVerified),
      isFollowingBack: followingIds.has(user.id),
    }));

    return {
      data,
      total: Number(followers?.total ?? data.length),
      page: Number(followers?.page ?? params.page ?? 1),
      limit: Number(followers?.limit ?? params.limit ?? 20),
      totalPages: Number(followers?.totalPages ?? (data.length ? 1 : 0)),
    };
  }

  async getFollowers(signal?: AbortSignal): Promise<CreatorFollower[]> {
    const result = await this.getFollowersPage({ page: 1, limit: 20 }, signal);
    return result.data;
  }

  async getFollowStats(
    signal?: AbortSignal,
  ): Promise<{
    userId: string;
    followersCount: number;
    followingCount: number;
    mutualCount: number;
    popularityScore: number;
  }> {
    return this.request('/users/follow/stats', { signal });
  }

  async followUser(userId: string, signal?: AbortSignal): Promise<any> {
    return this.request(`/users/${userId}/follow`, {
      method: 'POST',
      signal,
    });
  }

  async unfollowUser(userId: string, signal?: AbortSignal): Promise<any> {
    return this.request(`/users/${userId}/follow`, {
      method: 'DELETE',
      signal,
    });
  }

  /**
   * Notification Actions
   */
  async markNotificationRead(id: string, signal?: AbortSignal): Promise<void> {
    await this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
      signal,
    });
  }

  async markAllNotificationsRead(signal?: AbortSignal): Promise<void> {
    await this.request('/notifications/read-all', {
      method: 'PATCH',
      signal,
    });
  }

  async deleteNotification(id: string, signal?: AbortSignal): Promise<void> {
    await this.request(`/notifications/${id}`, {
      method: 'DELETE',
      signal,
    });
  }

  /**
   * Update Profile
   * Endpoint: PATCH /api/v1/users/profile
   */
  async updateProfile(
    data: Record<string, any>,
    signal?: AbortSignal,
  ): Promise<UserProfileResponse> {
    return this.request<UserProfileResponse>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
      signal,
    });
  }

  /**
   * Stream Credentials & Key Management
   * Endpoint: GET /api/v1/creator/stream-credentials
   */
  async getStreamCredentials(
    signal?: AbortSignal,
  ): Promise<{ rtmpUrl: string; streamKey: string; audioBitrate: string }> {
    return this.request<{
      rtmpUrl: string;
      streamKey: string;
      audioBitrate: string;
    }>('/creator/stream-credentials', { signal });
  }

  /**
   * Regenerate Stream Key
   * Endpoint: POST /api/v1/creator/stream-credentials/regenerate
   */
  async regenerateStreamKey(
    signal?: AbortSignal,
  ): Promise<{ streamKey: string }> {
    return this.request<{ streamKey: string }>(
      '/creator/stream-credentials/regenerate',
      {
        method: 'POST',
        signal,
      },
    );
  }

  /**
   * Studio Preferences & Settings
   * Endpoint: GET /api/v1/users/settings
   */
  async getStudioSettings(signal?: AbortSignal): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('/users/settings', { signal });
  }

  /**
   * Update Studio Preferences
   * Endpoint: PATCH /api/v1/users/settings
   */
  async updateStudioSettings(
    settings: Record<string, any>,
    signal?: AbortSignal,
  ): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('/users/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
      signal,
    });
  }

  /**
   * Multipart Form File Upload Helper
   */
  async uploadFile<T>(
    endpoint: string,
    file: File,
    fieldName = 'file',
    isRetry = false,
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const authState = useAuthStore.getState();
    const token = authState.accessToken || authState.token;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      if (res.status === 401 && !isRetry) {
        const refreshedToken = await this.triggerTokenRefresh();
        if (refreshedToken) {
          return this.uploadFile<T>(endpoint, file, fieldName, true);
        }
        this.handleUnauthorizedRedirect();
        throw new ApiError('Session expired. Please log in again.', 401);
      }

      let message = `Upload failed with status ${res.status}`;
      let details: unknown;
      try {
        details = await res.json();
        const responseMessage = (details as { message?: string | string[] })
          ?.message;
        if (responseMessage) {
          message = Array.isArray(responseMessage)
            ? responseMessage.join(', ')
            : responseMessage;
        }
      } catch {
        // A non-JSON error response is intentionally reduced to a safe status.
      }
      throw new ApiError(message, res.status, details);
    }
    return (await res.json()) as T;
  }

  /**
   * Host Verification & Creator Program API Endpoints
   */
  async getHostProfile(signal?: AbortSignal): Promise<OwnerHostProfile> {
    return this.request<OwnerHostProfile>('/hosts/profile', { signal });
  }

  async applyForHostVerification(
    dto: HostVerificationApplicationPayload,
    signal?: AbortSignal,
  ): Promise<OwnerHostProfile> {
    return this.request<OwnerHostProfile>('/hosts/apply', {
      method: 'POST',
      body: JSON.stringify(dto),
      signal,
    });
  }

  async getHostProgression(signal?: AbortSignal): Promise<any> {
    return this.request('/hosts/progression', { signal });
  }

  async getHostEligibility(
    signal?: AbortSignal,
  ): Promise<HostEligibilityResponse> {
    return this.request<HostEligibilityResponse>('/hosts/eligibility', {
      signal,
    });
  }

  async uploadGovernmentId(file: File): Promise<HostVerificationAsset> {
    return this.uploadFile<HostVerificationAsset>(
      '/hosts/verification/government-id',
      file,
    );
  }

  async uploadProfilePhoto(file: File): Promise<HostVerificationAsset> {
    return this.uploadFile<HostVerificationAsset>(
      '/hosts/verification/profile-photo',
      file,
    );
  }

  async uploadVerificationDocument(file: File): Promise<HostVerificationAsset> {
    return this.uploadFile<HostVerificationAsset>(
      '/hosts/verification/documents',
      file,
    );
  }

  async getHostVerificationAssets(
    signal?: AbortSignal,
  ): Promise<HostVerificationAsset[]> {
    return this.request<HostVerificationAsset[]>('/hosts/verification/assets', {
      signal,
    });
  }

  async replaceHostVerificationAsset(
    currentAssetId: string,
    replacementAssetId: string,
    signal?: AbortSignal,
  ): Promise<HostVerificationAsset> {
    return this.request<HostVerificationAsset>(
      `/hosts/verification/assets/${encodeURIComponent(currentAssetId)}/replacement`,
      {
        method: 'PUT',
        body: JSON.stringify({ replacementAssetId }),
        signal,
      },
    );
  }

  async getPublicConfig(signal?: AbortSignal): Promise<any> {
    return this.request('/config/public', { signal });
  }
}

export const creatorApi = CreatorApiService.getInstance();
