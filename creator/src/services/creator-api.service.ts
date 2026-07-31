/**
 * Frontend Service Abstraction for Creator Studio API Integration
 * Target Backend Base Endpoint: /api/v1/creator
 */

import {
  CreatorProfile,
  LiveRoomSummary,
  CreatorPlan,
  CreatorSubscriber,
  GiftReceived,
  PayoutRequest,
  CreatorNotification,
  CreatorAnalytics,
} from '../types/creator.types';

export class CreatorApiService {
  private static instance: CreatorApiService;

  public static getInstance(): CreatorApiService {
    if (!CreatorApiService.instance) {
      CreatorApiService.instance = new CreatorApiService();
    }
    return CreatorApiService.instance;
  }

  // Creator Dashboard Stats
  async getDashboardSummary(): Promise<{
    profile: Partial<CreatorProfile>;
    liveRoom: LiveRoomSummary;
    todayEarningsUsd: number;
    activeListeners: number;
  }> {
    // API Abstraction: GET /api/v1/creator/dashboard
    return {
      profile: {
        displayName: 'VoiceCloud Official Host',
        followersCount: 14250,
        subscribersCount: 840,
        totalEarningsDiamonds: 458900,
      },
      liveRoom: {
        id: 'room-101',
        title: 'Late Night Audio Lounge & Chill Beats',
        category: 'Audio Lounge',
        status: 'offline',
        currentListeners: 0,
        peakListeners: 1420,
        audioQuality: '324kbps Ultra HD Voice',
      },
      todayEarningsUsd: 142.50,
      activeListeners: 0,
    };
  }

  // Subscription Plans
  async getCreatorPlans(): Promise<CreatorPlan[]> {
    // API Abstraction: GET /api/v1/creator/plans
    return [
      {
        id: 'plan-01',
        creatorId: 'creator-studio-001',
        name: 'Silver Supporter',
        description: 'Exclusive supporter badge, priority chat seat, custom chat bubble.',
        priceCoins: 500,
        perks: ['Exclusive Supporter Badge', 'Priority Room Entry', 'Custom Chat Bubble'],
        activeSubscribersCount: 520,
        isActive: true,
        createdAt: '2025-02-01T00:00:00Z',
      },
      {
        id: 'plan-02',
        creatorId: 'creator-studio-001',
        name: 'Gold VIP Lounge',
        description: 'Co-host microphone access, HD audio recordings, exclusive soundboard access.',
        priceCoins: 1500,
        perks: ['All Silver Perks', 'Mic Co-Host Privileges', 'Soundboard Effects', 'Monthly Supporter Bonus'],
        activeSubscribersCount: 320,
        isActive: true,
        createdAt: '2025-02-01T00:00:00Z',
      },
    ];
  }

  // Active Subscribers
  async getSubscribers(): Promise<CreatorSubscriber[]> {
    // API Abstraction: GET /api/v1/creator/subscribers
    return [
      {
        id: 'sub-1',
        userId: 'u-101',
        userName: 'Alex AudioNut',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
        planName: 'Gold VIP Lounge',
        subscribedAt: '2025-06-10T14:20:00Z',
        renewsAt: '2025-08-10T14:20:00Z',
        status: 'active',
      },
      {
        id: 'sub-2',
        userId: 'u-102',
        userName: 'Sarah Waves',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
        planName: 'Silver Supporter',
        subscribedAt: '2025-05-01T10:00:00Z',
        renewsAt: '2025-08-01T10:00:00Z',
        status: 'active',
      },
    ];
  }

  // Earnings
  async getEarningsOverview(): Promise<{
    diamondsBalance: number;
    estimatedUsd: number;
    monthlyEarnings: Array<{ month: string; amountUsd: number }>;
  }> {
    // API Abstraction: GET /api/v1/creator/earnings
    return {
      diamondsBalance: 84300,
      estimatedUsd: 843.00,
      monthlyEarnings: [
        { month: 'Feb', amountUsd: 320 },
        { month: 'Mar', amountUsd: 450 },
        { month: 'Apr', amountUsd: 610 },
        { month: 'May', amountUsd: 780 },
        { month: 'Jun', amountUsd: 920 },
        { month: 'Jul', amountUsd: 1140 },
      ],
    };
  }

  // Payout Requests
  async getPayoutRequests(): Promise<PayoutRequest[]> {
    // API Abstraction: GET /api/v1/creator/payout-requests
    return [
      {
        id: 'PR-8821',
        amountDiamonds: 125000,
        estimatedUsd: 1250.00,
        payoutMethod: 'Bank Transfer',
        accountDetails: '**** **** **** 4219 (JP Morgan Chase)',
        status: 'PROCESSED',
        requestedAt: '2025-07-01T09:30:00Z',
        processedAt: '2025-07-02T15:45:00Z',
        adminNote: 'Processed via ACH direct wire.',
      },
      {
        id: 'PR-8899',
        amountDiamonds: 50000,
        estimatedUsd: 500.00,
        payoutMethod: 'PayPal',
        accountDetails: 'creator@voicecloud.app',
        status: 'PENDING',
        requestedAt: '2025-07-28T18:10:00Z',
      },
    ];
  }

  async submitPayoutRequest(amountDiamonds: number, method: string, details: string): Promise<PayoutRequest> {
    // API Abstraction: POST /api/v1/creator/payout-request
    return {
      id: `PR-${Math.floor(1000 + Math.random() * 9000)}`,
      amountDiamonds,
      estimatedUsd: amountDiamonds / 100,
      payoutMethod: method as any,
      accountDetails: details,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };
  }

  // Analytics
  async getAnalytics(period: '24h' | '7d' | '30d' | '1y' = '30d'): Promise<CreatorAnalytics> {
    // API Abstraction: GET /api/v1/analytics
    return {
      period,
      totalListenHours: 1240,
      peakConcurrentListeners: 1850,
      totalGiftsReceived: 3420,
      netRevenueUsd: 2840.50,
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
