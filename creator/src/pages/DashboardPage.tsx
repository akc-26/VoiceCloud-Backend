import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Calendar,
  ChevronRight,
  Crown,
  DollarSign,
  Gift,
  Inbox,
  Radio,
  RotateCcw,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { BRAND_CONFIG } from '@shared/branding';
import {
  useCreatorDashboard,
  useCreatorNotifications,
  useCreatorProfile,
  useCreatorRecentActivity,
  useCreatorWallet,
} from '../hooks/useCreatorDashboard';
import { useCreatorProfileStore } from '../store/creator-profile.store';
import { WidgetErrorBoundary } from '../components/common/WidgetErrorBoundary';
import { ConnectionStatusBadge } from '../components/common/ConnectionStatusBadge';

const PAYOUT_USD_PER_DIAMOND = 0.005;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const dashboardQuery = useCreatorDashboard();
  const profileQuery = useCreatorProfile();
  const walletQuery = useCreatorWallet();
  const notificationsQuery = useCreatorNotifications();
  const activityQuery = useCreatorRecentActivity();
  const storeProfile = useCreatorProfileStore((state) => state.profile);

  if (profileQuery.isError || dashboardQuery.isError) {
    return (
      <Box sx={{ maxWidth: 820, mx: 'auto', mt: 4 }}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              startIcon={<RotateCcw size={16} />}
              onClick={() => {
                void profileQuery.refetch();
                void dashboardQuery.refetch();
              }}
            >
              Retry
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 700 }}>
            {BRAND_CONFIG.products.creator.shortName} service unavailable
          </AlertTitle>
          Unable to load the Creator profile or dashboard summary. Check the
          connection and retry.
        </Alert>
      </Box>
    );
  }

  const profile = profileQuery.data || storeProfile;
  const dashboardData = dashboardQuery.data;
  const walletData = walletQuery.data;
  const profileVerified =
    'verified' in profile ? profile.verified : profile.isVerified;
  const profileTier = 'tier' in profile ? profile.tier : profile.creatorTier;
  const profileLevel =
    'level' in profile ? profile.level : dashboardData?.creatorProfile?.level;
  const profileCategory = 'category' in profile ? profile.category : undefined;
  const profileHandle =
    'handle' in profile ? profile.handle : `@${profile.username}`;
  const followerCount = Number(profile.followersCount ?? 0);
  const subscriberCount = Number(
    dashboardData?.subscriberCount ?? profile.subscribersCount ?? 0,
  );
  const diamondBalance = Number(
    walletData?.wallet?.diamondBalance ?? profile.walletDiamonds ?? 0,
  );
  const recurringRevenue = Number(
    dashboardData?.earningsSummary?.estimatedRecurringRevenue ?? 0,
  );

  const statsCards = [
    {
      title: 'Followers',
      value: followerCount.toLocaleString(),
      helper: 'Current creator community',
      icon: Users,
      tone: 'primary.main',
      link: '/followers',
    },
    {
      title: 'Subscribers',
      value: subscriberCount.toLocaleString(),
      helper: 'Current subscriber count',
      icon: Crown,
      tone: 'secondary.main',
      link: '/subscribers',
    },
    {
      title: 'Wallet Balance',
      value: `💎 ${diamondBalance.toLocaleString()}`,
      helper: 'Available diamond balance',
      icon: Wallet,
      tone: 'success.main',
      link: '/wallet',
    },
    {
      title: 'Recurring Revenue',
      value: `$${recurringRevenue.toFixed(2)}`,
      helper: 'Current backend estimate',
      icon: DollarSign,
      tone: 'success.main',
      link: '/earnings',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {profileQuery.isLoading ? (
        <Skeleton variant="rounded" height={170} sx={{ borderRadius: 4 }} />
      ) : (
        <Card
          sx={{
            overflow: 'hidden',
            position: 'relative',
            color: '#f3faf6',
            borderColor: 'rgba(94,234,212,0.18)',
            background:
              'radial-gradient(circle at 82% 22%, rgba(94,234,212,0.26), transparent 26%), radial-gradient(circle at 60% 120%, rgba(34,197,94,0.20), transparent 34%), linear-gradient(135deg, #123a32 0%, #0f766e 58%, #123a32 100%)',
            boxShadow: '0 20px 52px rgba(8,45,35,0.20)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.28,
              backgroundImage:
                'linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.08) 42%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              p: { xs: 3, sm: 4 },
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              alignItems: { xs: 'flex-start', lg: 'center' },
              justifyContent: 'space-between',
              gap: 3,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                minWidth: 0,
              }}
            >
              <Avatar
                src={profile.avatarUrl || undefined}
                alt={profile.displayName}
                sx={{
                  width: { xs: 62, sm: 72 },
                  height: { xs: 62, sm: 72 },
                  border: '3px solid rgba(255,255,255,0.84)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(243,250,246,0.70)', fontWeight: 600 }}
                >
                  Creator workspace
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    color: '#ffffff',
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    mt: 0.25,
                    mb: 0.75,
                  }}
                >
                  Welcome back, {profile.displayName}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: 'rgba(243,250,246,0.72)' }}
                  >
                    {profileHandle}
                  </Typography>
                  {profileVerified && (
                    <Chip
                      icon={<BadgeCheck size={13} />}
                      label="Verified"
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.10)',
                        color: '#ffffff',
                      }}
                    />
                  )}
                  {profileTier && (
                    <Chip
                      label={`${profileTier}${profileLevel ? ` · Level ${profileLevel}` : ''}`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(34,197,94,0.18)',
                        color: BRAND_CONFIG.colors.creator.primaryLight,
                      }}
                    />
                  )}
                  {profileCategory && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(243,250,246,0.62)' }}
                    >
                      {profileCategory}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.25}
              sx={{ width: { xs: '100%', lg: 'auto' } }}
            >
              <Button
                variant="contained"
                startIcon={<Radio size={17} />}
                onClick={() => {
                  void navigate('/rooms');
                }}
                sx={{
                  bgcolor: BRAND_CONFIG.colors.creator.primary,
                  color: '#07130d',
                }}
              >
                Go Live
              </Button>
              <Button
                variant="outlined"
                startIcon={<Calendar size={17} />}
                onClick={() => {
                  void navigate('/schedule');
                }}
                sx={{
                  borderColor: 'rgba(255,255,255,0.30)',
                  color: '#ffffff',
                  '&:hover': {
                    borderColor: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.07)',
                  },
                }}
              >
                Schedule
              </Button>
              <Button
                variant="outlined"
                startIcon={<BadgeCheck size={17} />}
                onClick={() => {
                  void navigate('/verification');
                }}
                sx={{
                  borderColor: 'rgba(255,255,255,0.30)',
                  color: '#ffffff',
                  '&:hover': {
                    borderColor: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.07)',
                  },
                }}
              >
                Verification
              </Button>
            </Stack>
          </Box>
        </Card>
      )}

      {dashboardQuery.isLoading ? (
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4].map((item) => (
            <Grid key={item} size={{ xs: 12, sm: 6, xl: 3 }}>
              <Skeleton variant="rounded" height={118} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2.5}>
          {statsCards.map((card) => (
            <Grid key={card.title} size={{ xs: 12, sm: 6, xl: 3 }}>
              <Card
                onClick={() => {
                  void navigate(card.link);
                }}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition:
                    'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: 'primary.main',
                    boxShadow: '0 12px 30px rgba(16,35,31,0.10)',
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 700 }}
                    >
                      {card.title}
                    </Typography>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2.5,
                        bgcolor: 'action.selected',
                        color: card.tone,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <card.icon size={18} />
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {card.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.helper}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ height: '100%', overflow: 'hidden' }}>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.35 }}>
                    Live Studio
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open the existing Live Rooms workspace for room lifecycle,
                    audience and Host controls.
                  </Typography>
                </Box>
                <ConnectionStatusBadge />
              </Box>
              <Divider sx={{ mb: 2.5 }} />

              <Box
                sx={{
                  minHeight: 205,
                  borderRadius: 3.5,
                  p: { xs: 2.5, sm: 3 },
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  background:
                    'radial-gradient(circle at 50% 48%, rgba(34,197,94,0.14), transparent 30%), linear-gradient(135deg, rgba(18,58,50,0.05), rgba(94,234,212,0.04))',
                }}
              >
                <Box>
                  <Box
                    sx={{
                      width: 82,
                      height: 82,
                      borderRadius: '50%',
                      mx: 'auto',
                      mb: 2,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'primary.main',
                      bgcolor: 'action.selected',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Radio size={34} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>
                    Ready for your next live session
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ maxWidth: 520, mx: 'auto', mb: 2.5 }}
                  >
                    No sample room state is shown here. Live status and controls
                    remain authoritative in the existing Live Rooms page.
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.25}
                    sx={{ justifyContent: 'center' }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<Radio size={16} />}
                      onClick={() => {
                        void navigate('/rooms');
                      }}
                    >
                      Manage Live Rooms
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        void navigate('/settings');
                      }}
                    >
                      Studio Settings
                    </Button>
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <WidgetErrorBoundary
            title="Wallet"
            onRetry={() => {
              void walletQuery.refetch();
            }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.35 }}>
                      Wallet & Earnings
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current authoritative balances
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={() => {
                      void navigate('/wallet');
                    }}
                    aria-label="Open wallet"
                  >
                    <ChevronRight size={18} />
                  </IconButton>
                </Box>
                <Divider sx={{ mb: 2.5 }} />

                {walletQuery.isLoading ? (
                  <Stack spacing={2}>
                    <Skeleton height={58} />
                    <Skeleton height={96} />
                  </Stack>
                ) : walletQuery.isError ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Box sx={{ color: 'warning.main', mb: 1 }}>
                      <AlertCircle size={30} />
                    </Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 0.5 }}
                    >
                      Wallet unavailable
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 2 }}
                    >
                      Unable to retrieve current balances.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<RotateCcw size={14} />}
                      onClick={() => {
                        void walletQuery.refetch();
                      }}
                    >
                      Retry
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Grid container spacing={2} sx={{ mb: 2.5 }}>
                      <Grid size={{ xs: 6 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            bgcolor: 'action.hover',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Wallet balance
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, mt: 0.5 }}
                          >
                            💎{' '}
                            {Number(
                              walletData?.wallet?.diamondBalance ?? 0,
                            ).toLocaleString()}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            bgcolor: 'action.hover',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Available for payout
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: 700,
                              mt: 0.5,
                              color: 'success.main',
                            }}
                          >
                            $
                            {(
                              Number(
                                walletData?.wallet?.withdrawableBalance ?? 0,
                              ) * PAYOUT_USD_PER_DIAMOND
                            ).toFixed(2)}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Stack spacing={1.25} sx={{ mb: 2.5 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Pending payouts
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          $
                          {Number(
                            dashboardData?.earningsSummary?.pendingPayouts ?? 0,
                          ).toFixed(2)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Lifetime earnings
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: 'success.main' }}
                        >
                          $
                          {Number(
                            dashboardData?.earningsSummary?.lifetimeEarnings ??
                              0,
                          ).toFixed(2)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Active plans
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {Number(
                            dashboardData?.plansSummary?.activePlans ?? 0,
                          ).toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>

                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<DollarSign size={17} />}
                      onClick={() => {
                        void navigate('/payout-requests');
                      }}
                    >
                      Request Payout
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </WidgetErrorBoundary>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <WidgetErrorBoundary
            title="Recent Activity"
            onRetry={() => {
              void activityQuery.refetch();
            }}
          >
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}
                  >
                    <Box sx={{ color: 'primary.main', display: 'flex' }}>
                      <Activity size={19} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Recent Activity
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ChevronRight size={15} />}
                    onClick={() => {
                      void navigate('/analytics');
                    }}
                  >
                    Analytics
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {activityQuery.isLoading ? (
                  <Stack spacing={1.5}>
                    {[1, 2, 3].map((item) => (
                      <Skeleton key={item} variant="rounded" height={64} />
                    ))}
                  </Stack>
                ) : !activityQuery.data || activityQuery.data.length === 0 ? (
                  <Box
                    sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}
                  >
                    <Inbox size={34} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      No recent activity
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.25}>
                    {activityQuery.data.slice(0, 5).map((activity) => (
                      <Box
                        key={activity.id}
                        sx={{
                          p: 1.75,
                          borderRadius: 3,
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            minWidth: 0,
                          }}
                        >
                          <Box
                            sx={{
                              width: 38,
                              height: 38,
                              borderRadius: 2.5,
                              bgcolor: 'action.selected',
                              color: 'primary.main',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {activity.type === 'gift' ? (
                              <Gift size={18} />
                            ) : activity.type === 'subscription' ? (
                              <Crown size={18} />
                            ) : activity.type === 'payout' ? (
                              <Wallet size={18} />
                            ) : (
                              <Zap size={18} />
                            )}
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700 }}
                              noWrap
                            >
                              {activity.title}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                            >
                              {activity.subtitle}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: 'success.main' }}
                          >
                            {activity.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.time}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </WidgetErrorBoundary>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                >
                  <Box sx={{ color: 'primary.main', display: 'flex' }}>
                    <Sparkles size={19} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Studio Actions
                  </Typography>
                </Box>
                <Grid container spacing={1.25}>
                  {[
                    ['Live Rooms', Radio, '/rooms'],
                    ['Schedule', Calendar, '/schedule'],
                    ['Gift Log', Gift, '/gifts'],
                    ['Analytics', ArrowUpRight, '/analytics'],
                  ].map(([label, Icon, path]) => {
                    const IconComponent = Icon as React.ComponentType<{
                      size?: number;
                    }>;
                    return (
                      <Grid key={label as string} size={{ xs: 6 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<IconComponent size={15} />}
                          onClick={() => {
                            void navigate(path as string);
                          }}
                          sx={{ py: 1.25 }}
                        >
                          {label as string}
                        </Button>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>

            <WidgetErrorBoundary
              title="Notifications"
              onRetry={() => {
                void notificationsQuery.refetch();
              }}
            >
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: 'info.main', display: 'flex' }}>
                        <Bell size={19} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Notifications
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => {
                        void navigate('/notifications');
                      }}
                    >
                      View all
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {notificationsQuery.isLoading ? (
                    <Stack spacing={1.25}>
                      <Skeleton height={46} />
                      <Skeleton height={46} />
                    </Stack>
                  ) : !notificationsQuery.data?.data?.length ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ py: 2, textAlign: 'center' }}
                    >
                      No notifications available
                    </Typography>
                  ) : (
                    <Stack spacing={1.25}>
                      {notificationsQuery.data.data
                        .slice(0, 3)
                        .map((notification) => (
                          <Box
                            key={notification.id}
                            sx={{
                              p: 1.5,
                              borderRadius: 2.5,
                              bgcolor: 'action.hover',
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700 }}
                            >
                              {notification.title}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 0.35 }}
                            >
                              {notification.message}
                            </Typography>
                          </Box>
                        ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </WidgetErrorBoundary>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};
