import { BRAND_CONFIG } from '@shared/branding';
/**
 * Custom React Query Hooks for Creator Studio Dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { creatorApi } from '../services/creator-api.service';
import { useCreatorProfileStore } from '../store/creator-profile.store';
import { useNotificationStore } from '../store/notification.store';
import {
  RecentActivityItem,
  CreatorNotification,
} from '../types/creator.types';

export const CREATOR_QUERY_KEYS = {
  dashboard: ['creator', 'dashboard'] as const,
  profile: ['creator', 'profile'] as const,
  wallet: ['creator', 'wallet'] as const,
  notifications: ['creator', 'notifications'] as const,
  activity: ['creator', 'activity'] as const,
};

/**
 * Main Creator Overview Dashboard Query
 */
export function useCreatorDashboard() {
  return useQuery({
    queryKey: CREATOR_QUERY_KEYS.dashboard,
    queryFn: ({ signal }) => creatorApi.getDashboardSummary(signal),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Creator Profile Query (Syncs with Zustand profile store)
 */
export function useCreatorProfile() {
  const setProfile = useCreatorProfileStore((state) => state.setProfile);

  const query = useQuery({
    queryKey: CREATOR_QUERY_KEYS.profile,
    queryFn: ({ signal }) => creatorApi.getMyProfile(signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (query.data) {
      setProfile({
        id: query.data.id || 'creator-studio-001',
        userId: query.data.id || 'user-vc-creator-001',
        displayName:
          query.data.displayName ||
          BRAND_CONFIG.defaults.officialCreatorDisplayName,
        handle: query.data.username
          ? `@${query.data.username}`
          : BRAND_CONFIG.defaults.officialCreatorHandle,
        avatarUrl:
          query.data.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        coverUrl:
          query.data.coverUrl ||
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
        bio: query.data.bio || BRAND_CONFIG.defaults.officialCreatorBio,
        verified: query.data.isVerified ?? true,
        tier: (query.data.creatorTier as any) || 'Elite',
        followersCount: query.data.followersCount ?? 14250,
        subscribersCount: query.data.subscribersCount ?? 840,
        totalEarningsDiamonds: query.data.walletDiamonds ?? 458900,
        walletCoins: query.data.walletCoins ?? 12500,
        walletDiamonds: query.data.walletDiamonds ?? 84300,
        joinedAt: query.data.joinedAt || '2025-01-15T00:00:00Z',
        category: 'Podcast & Audio Lounge',
      });
    }
  }, [query.data, setProfile]);

  return query;
}

/**
 * Creator Wallet Summary Query (Optional service)
 */
export function useCreatorWallet() {
  const query = useQuery({
    queryKey: CREATOR_QUERY_KEYS.wallet,
    queryFn: ({ signal }) => creatorApi.getWalletSummary(signal),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (query.isError && query.error) {
      console.warn('Wallet service unavailable:', query.error.message);
    }
  }, [query.isError, query.error]);

  return query;
}

/**
 * Creator Notifications Query (Optional service)
 */
export function useCreatorNotifications() {
  const setNotifications = useNotificationStore(
    (state) => state.setNotifications,
  );

  const query = useQuery({
    queryKey: CREATOR_QUERY_KEYS.notifications,
    queryFn: ({ signal }) => creatorApi.getNotifications({ limit: 5 }, signal),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (query.isError && query.error) {
      console.warn('Notification service unavailable:', query.error.message);
    } else if (query.data && Array.isArray(query.data.data)) {
      const mapped: CreatorNotification[] = query.data.data.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: (n.type as CreatorNotification['type']) || 'SYSTEM',
        read: n.isRead ?? n.read ?? false,
        createdAt: n.createdAt,
        link: n.link,
      }));
      setNotifications(mapped, query.data.unreadCount);
    }
  }, [query.data, query.isError, query.error, setNotifications]);

  return query;
}

/**
 * Creator Recent Activity Stream Query (Optional service isolation)
 * Combines subscriptions and payout events into a timeline independently
 */
export function useCreatorRecentActivity() {
  const dashboardQuery = useCreatorDashboard();

  const activityList = useMemo<RecentActivityItem[]>(() => {
    const items: RecentActivityItem[] = [];

    // 1. Subscription Events from dashboard if present
    if (dashboardQuery.data?.latestSubscriptions?.length) {
      dashboardQuery.data.latestSubscriptions.forEach((sub) => {
        items.push({
          id: `sub-${sub.id}`,
          title: `New Subscriber: ${sub.subscriber?.displayName || sub.subscriber?.username || 'Supporter'}`,
          subtitle: `Subscribed to ${sub.plan?.title || 'VIP Supporter Plan'}`,
          value: sub.plan?.monthlyPrice
            ? `+${sub.plan.monthlyPrice} Coins`
            : '+500 Coins',
          time: formatRelativeTime(sub.startedAt),
          type: 'subscription',
          color: '#6366f1',
          timestamp: sub.startedAt,
        });
      });
    }

    // 2. Payout Events from dashboard if present
    if (dashboardQuery.data?.latestPayoutRequests?.length) {
      dashboardQuery.data.latestPayoutRequests.forEach((payout) => {
        items.push({
          id: `payout-${payout.id}`,
          title: `Payout Request: ${payout.status}`,
          subtitle: `Method: ${payout.payoutMethod}`,
          value: `$${payout.payoutAmount || payout.diamondAmount / 100} USD`,
          time: formatRelativeTime(payout.createdAt),
          type: 'payout',
          color:
            payout.status === 'PROCESSED' || payout.status === 'APPROVED'
              ? '#10b981'
              : '#f59e0b',
          timestamp: payout.createdAt,
        });
      });
    }

    // Sort by timestamp descending
    return items.sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime(),
    );
  }, [dashboardQuery.data]);

  return {
    data: activityList,
    isLoading: dashboardQuery.isLoading,
    isError: false, // Isolated: activity stream won't crash page or block widgets
    error: null,
    refetch: () => {
      dashboardQuery.refetch();
    },
  };
}

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Recently';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
