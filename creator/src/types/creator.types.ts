/**
 * Creator Studio type definitions
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

export type HostVerificationStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type HostVerificationDocumentCategory =
  'GOVERNMENT_ID' | 'SELFIE' | 'SUPPORTING_DOCUMENT';

export interface HostVerificationAsset {
  assetId: string;
  category: HostVerificationDocumentCategory;
  originalFilename: string;
  verifiedMimeType: string;
  verifiedFormat: string;
  fileSize: number;
  validationStatus: 'PENDING' | 'VALIDATED' | 'REJECTED';
  isActive: boolean;
  linkedToApplication: boolean;
  createdAt: string;
}

export interface OwnerHostProfile {
  id: string;
  userId: string;
  status: HostVerificationStatus;
  hostLevel: number;
  realName: string;
  bio?: string;
  country?: string;
  languages?: string[];
  categories?: string[];
  experience?: string;
  idNumber?: string;
  rejectionReason?: string;
  hasGovernmentIdUploaded: boolean;
  hasProfilePhotoUploaded: boolean;
  hasSupportingDocumentsUploaded: boolean;
  hostRating: number;
  totalRoomsHosted: number;
  peakListeners: number;
  xp: number;
  performanceScore: number;
  followersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HostVerificationApplicationPayload {
  realName: string;
  idNumber?: string;
  governmentIdAssetId: string;
  selfieAssetId: string;
  supportingDocumentAssetIds?: string[];
  country?: string;
  bio?: string;
  languages?: string[];
  categories?: string[];
  experience?: string;
}

export interface HostEligibilityResponse {
  eligible: boolean;
  applicationsEnabled: boolean;
  requirements: {
    followers: {
      current: number;
      minimum: number;
      met: boolean;
    };
    completedRooms: {
      current: number;
      minimum: number;
      met: boolean;
    };
    communityStanding: {
      required: boolean;
      met: boolean;
    };
  };
  reasons: string[];
  evaluatedAt: string;
}

export interface LiveRoomSummary {
  id: string;
  title: string;
  category: string;
  status: 'offline' | 'scheduled' | 'live' | 'paused' | 'ended';
  currentListeners: number;
  peakListeners: number;
  audioQuality: string;
  startedAt?: string;
  scheduledFor?: string;
  isPrivate?: boolean;
  isInviteOnly?: boolean;
}

export interface CreatorPlan {
  id: string;
  creatorId: string;
  name: string;
  /** Canonical backend plan title; retained alongside legacy display name. */
  title?: string;
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
  creatorId: string;
  diamondAmount: number;
  payoutAmount: number;
  payoutMethod: 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE' | 'CRYPTO' | string;
  accountDetails?: Record<string, unknown> | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reservedAt?: string | null;
  settledAt?: string | null;
  releasedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatorNotification {
  id: string;
  title: string;
  message: string;
  type:
    | 'IN_APP'
    | 'SYSTEM'
    | 'ROOM_INVITATION'
    | 'GIFT'
    | 'VIP'
    | 'AGENCY'
    | 'HOST_APPROVAL'
    | 'ANNOUNCEMENT';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface CreatorAnalytics {
  period: '24h' | '7d' | '30d' | '1y';
  totalListenHours: number;
  /** Optional comparative presentation values when supplied by analytics providers. */
  listenHoursGrowth?: number;
  avgSessionMinutes?: number;
  revenueGrowth?: number;
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

// Backend API Endpoint DTOs
export interface BackendCreatorDashboardResponse {
  creatorProfile: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified: boolean;
    tier?: string;
    level?: number;
  };
  plansSummary: {
    totalPlans: number;
    activePlans: number;
  };
  subscriberCount: number;
  earningsSummary: {
    estimatedRecurringRevenue: number;
    totalLifetimePayouts: number;
    pendingPayouts: number;
    lifetimeEarnings: number;
  };
  payoutSummary: {
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
  };
  latestSubscriptions: Array<{
    id: string;
    subscriberId: string;
    creatorId: string;
    planId: string;
    status: string;
    startedAt: string;
    subscriber?: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
    };
    plan?: {
      title: string;
      monthlyPrice: number;
    };
  }>;
  latestPayoutRequests: Array<{
    id: string;
    diamondAmount: number;
    payoutAmount: number;
    payoutMethod: string;
    status: string;
    createdAt: string;
  }>;
}

export interface UserProfileResponse {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  isVerified: boolean;
  level: number;
  creatorTier?: 'Standard' | 'Pro' | 'Elite' | 'VIP Master' | string;
  followersCount?: number;
  followingCount?: number;
  subscribersCount?: number;
  walletCoins?: number;
  walletDiamonds?: number;
  joinedAt?: string;
  badges?: Array<{ id: string; name: string; icon?: string }>;
}

export interface WalletBalanceResponse {
  coinBalance: number;
  diamondBalance: number;
  bonusBalance: number;
  promotionalBalance: number;
  frozenBalance: number;
  withdrawableBalance: number;
  totalCoinsPurchased: number;
  totalCoinsSpent: number;
  totalDiamondsEarned: number;
  totalDiamondsWithdrawn: number;
  updatedAt?: string;
}

export interface WalletTransactionResponse {
  id: string;
  transactionType: string;
  amount: number;
  currency: string;
  status: string;
  description?: string | null;
  remarks?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

export interface WalletSummaryResponse {
  wallet: WalletBalanceResponse;
  latestTransaction: WalletTransactionResponse | null;
  activePackageCount: number;
  statistics: {
    totalTransactionsCount: number;
    netCoinBalance: number;
    netDiamondBalance: number;
  };
}

export interface WalletTransactionsResponse {
  data: WalletTransactionResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatorEarningsResponse {
  totalSubscribers: number;
  estimatedRecurringRevenue: number;
  activePlansCount: number;
  pendingPayoutsAmount: number;
  completedPayoutsAmount: number;
  lifetimeEarnings: number;
  recentSubscriptions: Array<Record<string, unknown>>;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'subscription' | 'gift' | 'system' | 'payout' | 'moderation' | string;
  isRead?: boolean;
  read?: boolean;
  createdAt: string;
  link?: string;
}

export interface NotificationsListResponse {
  data: NotificationItem[];
  total: number;
  unreadCount: number;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  time: string;
  type: 'gift' | 'subscription' | 'payout' | 'broadcast' | 'verification';
  color?: string;
  timestamp?: string;
}
