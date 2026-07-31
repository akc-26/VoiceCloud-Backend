/**
 * VoiceCloud Creator Studio Type Definitions
 * Phase: VC-PH04A
 */

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string;
  coverUrl?: string;
  bio: string;
  verified: boolean;
  tier: 'Standard' | 'Pro' | 'Elite' | 'VIP Master';
  followersCount: number;
  subscribersCount: number;
  totalEarningsDiamonds: number;
  walletCoins: number;
  walletDiamonds: number;
  joinedAt: string;
  category: string;
}

export interface LiveRoomSummary {
  id: string;
  title: string;
  category: string;
  status: 'offline' | 'scheduled' | 'live';
  currentListeners: number;
  peakListeners: number;
  audioQuality: string;
  startedAt?: string;
  scheduledFor?: string;
}

export interface CreatorPlan {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  priceCoins: number;
  perks: string[];
  activeSubscribersCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreatorSubscriber {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  planName: string;
  subscribedAt: string;
  renewsAt: string;
  status: 'active' | 'cancelled' | 'expired';
}

export interface GiftReceived {
  id: string;
  giftId: string;
  giftName: string;
  giftIcon: string;
  coinValue: number;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receivedAt: string;
  roomId?: string;
}

export interface PayoutRequest {
  id: string;
  amountDiamonds: number;
  estimatedUsd: number;
  payoutMethod: 'Bank Transfer' | 'PayPal' | 'Crypto (USDT)';
  accountDetails: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  requestedAt: string;
  processedAt?: string;
  adminNote?: string;
}

export interface CreatorNotification {
  id: string;
  title: string;
  message: string;
  type: 'subscription' | 'gift' | 'system' | 'payout' | 'moderation';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface CreatorAnalytics {
  period: '24h' | '7d' | '30d' | '1y';
  totalListenHours: number;
  peakConcurrentListeners: number;
  totalGiftsReceived: number;
  netRevenueUsd: number;
  listenerRetentionRate: number;
  dailyMetrics: Array<{
    date: string;
    listeners: number;
    earnings: number;
    newFollowers: number;
  }>;
}
