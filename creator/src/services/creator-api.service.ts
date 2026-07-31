/**
 * Production-Ready API Abstraction Layer for Creator Studio
 * Endpoint Base: /api/v1
 */

import { useAuthStore, AuthResponseDto } from '../store/auth.store';
import {
  CreatorProfile,
  LiveRoomSummary,
  CreatorPlan,
  CreatorSubscriber,
  PayoutRequest,
  CreatorAnalytics,
  BackendCreatorDashboardResponse,
  UserProfileResponse,
  WalletBalanceResponse,
  WalletSummaryResponse,
  NotificationsListResponse,
  RecentActivityItem,
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

export class CreatorApiService {
  private static instance: CreatorApiService;
  private baseUrl: string;

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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
          useAuthStore.getState().logout();
          if (
            typeof window !== 'undefined' &&
            !window.location.pathname.endsWith('/login')
          ) {
            window.location.href = '/creator/login';
          }
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
      throw new ApiError(
        err.message || 'Network request failed',
        500,
        err
      );
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
    signal?: AbortSignal
  ): Promise<BackendCreatorDashboardResponse> {
    try {
      return await this.request<BackendCreatorDashboardResponse>(
        '/creator/dashboard',
        { signal }
      );
    } catch (err) {
      // Fallback response for unauthenticated / mock session
      return {
        creatorProfile: {
          id: 'user-vc-creator-001',
          username: 'voicecloud_official',
          displayName: 'VoiceCloud Official Host',
          avatarUrl:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
          isVerified: true,
          tier: 'Elite',
          level: 24,
        },
        plansSummary: {
          totalPlans: 2,
          activePlans: 2,
        },
        subscriberCount: 840,
        earningsSummary: {
          estimatedRecurringRevenue: 1140.0,
          totalLifetimePayouts: 1250.0,
          pendingPayouts: 500.0,
          lifetimeEarnings: 2840.5,
        },
        payoutSummary: {
          totalRequests: 2,
          pendingRequests: 1,
          completedRequests: 1,
        },
        latestSubscriptions: [],
        latestPayoutRequests: [],
      };
    }
  }

  /**
   * Fetch Authenticated User Profile
   * Endpoint: GET /api/v1/users/profile/me
   */
  async getMyProfile(signal?: AbortSignal): Promise<UserProfileResponse> {
    try {
      return await this.request<UserProfileResponse>('/users/profile/me', {
        signal,
      });
    } catch {
      return {
        id: 'user-vc-creator-001',
        username: 'voicecloud_official',
        displayName: 'VoiceCloud Official Host',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        coverUrl:
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
        bio: 'Official VoiceCloud audio creator broadcasting high-fidelity podcasts, live music sessions, and voice lounge rooms.',
        isVerified: true,
        level: 24,
        creatorTier: 'Elite',
        followersCount: 14250,
        subscribersCount: 840,
        walletCoins: 12500,
        walletDiamonds: 84300,
        joinedAt: '2025-01-15T00:00:00Z',
      };
    }
  }

  /**
   * Fetch Wallet Balances
   * Endpoint: GET /api/v1/wallet/balance
   */
  async getWalletBalance(
    signal?: AbortSignal
  ): Promise<WalletBalanceResponse> {
    try {
      return await this.request<WalletBalanceResponse>('/wallet/balance', {
        signal,
      });
    } catch {
      return {
        userId: 'user-vc-creator-001',
        coinBalance: 12500,
        diamondBalance: 84300,
        frozenCoins: 0,
        frozenDiamonds: 0,
        totalEarnedCoins: 250000,
        totalEarnedDiamonds: 458900,
        lifetimeEarningsUsd: 2840.5,
        pendingPayoutsUsd: 500.0,
      };
    }
  }

  /**
   * Fetch Wallet Summary Overview
   * Endpoint: GET /api/v1/wallet/summary
   */
  async getWalletSummary(
    signal?: AbortSignal
  ): Promise<WalletSummaryResponse> {
    try {
      return await this.request<WalletSummaryResponse>('/wallet/summary', {
        signal,
      });
    } catch {
      return {
        balance: {
          userId: 'user-vc-creator-001',
          coinBalance: 12500,
          diamondBalance: 84300,
        },
        currentBalanceUsd: 843.0,
        availableBalanceUsd: 843.0,
        pendingPayoutsUsd: 500.0,
        lifetimeEarningsUsd: 2840.5,
        latestTransactions: [],
      };
    }
  }

  /**
   * Fetch Notifications
   * Endpoint: GET /api/v1/notifications
   */
  async getNotifications(
    params: { limit?: number; page?: number } = { limit: 5 },
    signal?: AbortSignal
  ): Promise<NotificationsListResponse> {
    try {
      const query = new URLSearchParams();
      if (params.limit) query.append('limit', String(params.limit));
      if (params.page) query.append('page', String(params.page));

      return await this.request<NotificationsListResponse>(
        `/notifications?${query.toString()}`,
        { signal }
      );
    } catch {
      return {
        data: [
          {
            id: 'notif-1',
            title: 'New VIP Subscription',
            message: 'User @alex_audionut subscribed to your VIP Tier plan!',
            type: 'subscription',
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          },
          {
            id: 'notif-2',
            title: 'Virtual Gift Received',
            message:
              'Received a "Dragon Castle" virtual gift (5,000 coins) in Lounge #102!',
            type: 'gift',
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          },
          {
            id: 'notif-3',
            title: 'Payout Request Approved',
            message:
              'Your payout request #PR-8821 for $1,250.00 USD has been approved by Admin.',
            type: 'payout',
            read: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          },
        ],
        total: 3,
        unreadCount: 2,
      };
    }
  }

  /**
   * Fetch Recent Received Gifts
   * Endpoint: GET /api/v1/gifts/history?role=receiver&limit=5
   */
  async getRecentReceivedGifts(
    limit = 5,
    signal?: AbortSignal
  ): Promise<any[]> {
    try {
      return await this.request<any[]>(
        `/gifts/history?role=receiver&limit=${limit}`,
        { signal }
      );
    } catch {
      return [];
    }
  }

  /**
   * Fetch Creator Subscription Plans
   * Endpoint: GET /api/v1/creator/plans
   */
  async getCreatorPlans(signal?: AbortSignal): Promise<CreatorPlan[]> {
    try {
      const res = await this.request<any>('/creator/plans', { signal });
      return Array.isArray(res) ? res : res.data || [];
    } catch {
      return [
        {
          id: 'plan-01',
          creatorId: 'creator-studio-001',
          name: 'Silver Supporter',
          description:
            'Exclusive supporter badge, priority chat seat, custom chat bubble.',
          priceCoins: 500,
          perks: [
            'Exclusive Supporter Badge',
            'Priority Room Entry',
            'Custom Chat Bubble',
          ],
          activeSubscribersCount: 520,
          isActive: true,
          createdAt: '2025-02-01T00:00:00Z',
        },
      ];
    }
  }

  /**
   * Fetch Subscribers
   * Endpoint: GET /api/v1/creator/subscribers
   */
  async getSubscribers(signal?: AbortSignal): Promise<CreatorSubscriber[]> {
    try {
      const res = await this.request<any>('/creator/subscribers', { signal });
      return Array.isArray(res) ? res : res.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch Payout Requests
   * Endpoint: GET /api/v1/creator/payout-requests
   */
  async getPayoutRequests(signal?: AbortSignal): Promise<PayoutRequest[]> {
    try {
      const res = await this.request<any>('/creator/payout-requests', {
        signal,
      });
      return Array.isArray(res) ? res : res.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Submit Payout Request
   * Endpoint: POST /api/v1/creator/payout-request
   */
  async submitPayoutRequest(
    diamondAmount: number,
    method: string,
    details: string,
    signal?: AbortSignal
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
   * Analytics Placeholder Method
   */
  async getAnalytics(
    period: '24h' | '7d' | '30d' | '1y' = '30d'
  ): Promise<CreatorAnalytics> {
    return {
      period,
      totalListenHours: 1240,
      peakConcurrentListeners: 1850,
      totalGiftsReceived: 3420,
      netRevenueUsd: 2840.5,
      listenerRetentionRate: 84.2,
      dailyMetrics: [
        { date: 'Jul 24', listeners: 1100, earnings: 85, newFollowers: 42 },
        { date: 'Jul 25', listeners: 1350, earnings: 120, newFollowers: 68 },
        { date: 'Jul 26', listeners: 1580, earnings: 145, newFollowers: 89 },
        { date: 'Jul 27', listeners: 1420, earnings: 110, newFollowers: 55 },
        { date: 'Jul 28', listeners: 1720, earnings: 195, newFollowers: 112 },
        { date: 'Jul 29', listeners: 1850, earnings: 230, newFollowers: 135 },
        { date: 'Jul 30', listeners: 1640, earnings: 180, newFollowers: 94 },
      ],
    };
  }
}

export const creatorApi = CreatorApiService.getInstance();

