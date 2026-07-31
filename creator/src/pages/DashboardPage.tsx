import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  IconButton,
  Divider,
  Stack,
  LinearProgress,
  Skeleton,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Radio,
  Users,
  Crown,
  Wallet,
  DollarSign,
  TrendingUp,
  Gift,
  Bell,
  ArrowUpRight,
  Plus,
  Sparkles,
  ChevronRight,
  Zap,
  Activity,
  CheckCircle2,
  Calendar,
  BadgeCheck,
  RotateCcw,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import {
  useCreatorDashboard,
  useCreatorProfile,
  useCreatorWallet,
  useCreatorNotifications,
  useCreatorRecentActivity,
} from '../hooks/useCreatorDashboard';
import { useCreatorProfileStore } from '../store/creator-profile.store';
import { WidgetErrorBoundary } from '../components/common/WidgetErrorBoundary';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // React Query Hooks (Critical & Optional Isolation)
  const dashboardQuery = useCreatorDashboard();
  const profileQuery = useCreatorProfile();
  const walletQuery = useCreatorWallet();
  const notificationsQuery = useCreatorNotifications();
  const activityQuery = useCreatorRecentActivity();

  // Zustand Store Sync
  const storeProfile = useCreatorProfileStore((state) => state.profile);

  // Critical Error State Check (If either profile or dashboard endpoint fails, show full page error state)
  const isCriticalError = profileQuery.isError || dashboardQuery.isError;

  // Derived Dashboard Data
  const profile = profileQuery.data || storeProfile;
  const dashboardData = dashboardQuery.data;
  const walletData = walletQuery.data;

  // Stats Card Config
  const statsCards = [
    {
      title: 'Active Followers',
      value: (profile.followersCount ?? 14250).toLocaleString(),
      change: '+240 new this week',
      icon: Users,
      color: '#2563eb',
      link: '/followers',
    },
    {
      title: 'Active Subscribers',
      value: (
        dashboardData?.subscriberCount ??
        profile.subscribersCount ??
        840
      ).toLocaleString(),
      change: '84% VIP Retention Rate',
      icon: Crown,
      color: '#d97706',
      link: '/subscribers',
    },
    {
      title: 'Diamonds Earned',
      value: `💎 ${(
        walletData?.balance?.diamondBalance ??
        profile.walletDiamonds ??
        84300
      ).toLocaleString()}`,
      change: '+14.2% vs last month',
      icon: Radio,
      color: '#7c3aed',
      link: '/analytics',
    },
    {
      title: 'Monthly Earnings (Est.)',
      value: `$${(
        dashboardData?.earningsSummary?.estimatedRecurringRevenue ??
        walletData?.currentBalanceUsd ??
        1140.0
      ).toFixed(2)}`,
      change: '+18.5% growth',
      icon: DollarSign,
      color: '#059669',
      link: '/earnings',
    },
  ];

  if (isCriticalError) {
    return (
      <Box sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
        <Alert
          severity="error"
          sx={{ borderRadius: 3, p: 3 }}
          action={
            <Button
              color="inherit"
              size="medium"
              startIcon={<RotateCcw size={16} />}
              onClick={() => {
                profileQuery.refetch();
                dashboardQuery.refetch();
              }}
              sx={{ fontWeight: 700 }}
            >
              Retry
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
            Creator Studio Critical Service Error
          </AlertTitle>
          Unable to load critical creator profile or studio dashboard data. Please verify your connection and click Retry to reload.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ================= 1. Creator Overview Header ================= */}
      {profileQuery.isLoading ? (
        <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
      ) : (
        <Card
          sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
            color: '#ffffff',
            boxShadow: '0 8px 32px rgba(124, 58, 237, 0.25)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              p: { xs: 3, sm: 4 },
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Avatar
                src={profile.avatarUrl}
                alt={profile.displayName}
                sx={{
                  width: 72,
                  height: 72,
                  border: '3px solid #ffffff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              />
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                    mb: 0.5,
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      color: '#ffffff',
                    }}
                  >
                    Welcome back, {profile.displayName}!
                  </Typography>
                  {profile.verified && (
                    <Chip
                      icon={<CheckCircle2 size={13} color="#ffffff" />}
                      label="Verified Host"
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: '#ffffff',
                        fontWeight: 700,
                        backdropFilter: 'blur(4px)',
                      }}
                    />
                  )}
                  {profile.tier && (
                    <Chip
                      label={`Level ${profile.level ?? 24} • ${profile.tier} Tier`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.9, color: 'rgba(255,255,255,0.85)' }}
                >
                  {profile.category || 'Podcast & Audio Lounge'} • Username:{' '}
                  <strong>{profile.handle}</strong>
                </Typography>
              </Box>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ width: { xs: '100%', md: 'auto' } }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<Radio size={18} />}
                onClick={() => navigate('/rooms')}
                sx={{
                  bgcolor: '#ffffff',
                  color: '#7c3aed',
                  fontWeight: 800,
                  px: 3,
                  '&:hover': { bgcolor: '#f8fafc' },
                }}
              >
                Go Live Now
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<Calendar size={18} />}
                onClick={() => navigate('/schedule')}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: '#ffffff',
                  fontWeight: 700,
                  '&:hover': {
                    borderColor: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                Schedule Session
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<BadgeCheck size={18} />}
                onClick={() => navigate('/verification')}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: '#ffffff',
                  fontWeight: 700,
                  '&:hover': {
                    borderColor: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                Host Verification
              </Button>
            </Stack>
          </Box>
        </Card>
      )}

      {/* ================= 2. Top Statistics Cards ================= */}
      {dashboardQuery.isLoading ? (
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} xs={12} sm={6} lg={3}>
              <Skeleton
                variant="rounded"
                height={120}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2.5}>
          {statsCards.map((card, idx) => (
            <Grid key={idx} xs={12} sm={6} lg={3}>
              <Card
                onClick={() => navigate(card.link)}
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {card.title}
                    </Typography>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: `${card.color}15`,
                        color: card.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <card.icon size={20} />
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                    {card.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'success.main',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <TrendingUp size={13} /> {card.change}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ================= 3. Middle Section: Live Room Status & Wallet Summary ================= */}
      <Grid container spacing={3}>
        {/* Live Room Status Widget */}
        <Grid xs={12} md={7} lg={8}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Radio size={20} color="#7c3aed" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Live Room Status
                  </Typography>
                </Box>
                <Chip
                  label="Offline / Ready"
                  color="default"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 2.5,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, mb: 0.5 }}
                >
                  Primary Audio Room: Late Night Audio Lounge & Chill Beats
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Audio Preset: 324kbps Ultra HD Voice | Soundboard Active |
                  Co-Host Mic Seats: 8 Seats Available
                </Typography>

                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: 'center' }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Radio size={16} />}
                    onClick={() => navigate('/rooms')}
                  >
                    Manage Room
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate('/settings')}
                  >
                    Audio Settings
                  </Button>
                </Stack>
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}
              >
                Stream Quality Health Score: 98/100 (Optimal Bitrate)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={98}
                color="success"
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Creator Wallet Summary Widget (Optional Service - Isolated Error Boundary) */}
        <Grid xs={12} md={5} lg={4}>
          <WidgetErrorBoundary title="Wallet" onRetry={() => walletQuery.refetch()}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Wallet size={20} color="#059669" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Wallet Summary
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => navigate('/wallet')}
                  >
                    <ChevronRight size={18} />
                  </IconButton>
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {walletQuery.isLoading ? (
                  <Stack spacing={2}>
                    <Skeleton variant="rectangular" height={60} />
                    <Skeleton variant="rectangular" height={80} />
                  </Stack>
                ) : walletQuery.isError ? (
                  <Box
                    sx={{
                      py: 3,
                      px: 2,
                      textAlign: 'center',
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <AlertCircle size={32} color="#f59e0b" style={{ marginBottom: 8 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Wallet unavailable
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      Unable to retrieve current balance.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<RotateCcw size={14} />}
                      onClick={() => walletQuery.refetch()}
                      sx={{ fontWeight: 600 }}
                    >
                      Retry
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ mb: 2.5 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600 }}
                      >
                        Available Diamonds Balance
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 800,
                          color: 'primary.main',
                          my: 0.5,
                        }}
                      >
                        💎{' '}
                        {(
                          walletData?.balance?.diamondBalance ??
                          profile.walletDiamonds ??
                          84300
                        ).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Available USD Value:{' '}
                        <strong>
                          $
                          {(
                            walletData?.availableBalanceUsd ??
                            (profile.walletDiamonds ?? 84300) / 100
                          ).toFixed(2)}{' '}
                          USD
                        </strong>
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'action.hover',
                        mb: 2.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Coins Balance:
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          🪙{' '}
                          {(
                            walletData?.balance?.coinBalance ??
                            profile.walletCoins ??
                            12500
                          ).toLocaleString()}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Pending Payouts:
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, color: 'warning.main' }}
                        >
                          $
                          {(
                            walletData?.pendingPayoutsUsd ?? 500.0
                          ).toFixed(2)}{' '}
                          USD
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Lifetime Earnings:
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, color: 'success.main' }}
                        >
                          $
                          {(
                            walletData?.lifetimeEarningsUsd ?? 2840.5
                          ).toFixed(2)}{' '}
                          USD
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      startIcon={<DollarSign size={18} />}
                      onClick={() => navigate('/payout-requests')}
                      sx={{ fontWeight: 700 }}
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

      {/* ================= 4. Bottom Section: Recent Activity & Notifications ================= */}
      <Grid container spacing={3}>
        {/* Recent Activity Stream (Optional Service - Isolated Error Boundary) */}
        <Grid xs={12} md={7} lg={8}>
          <WidgetErrorBoundary title="Recent Activity" onRetry={() => activityQuery.refetch()}>
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
                    <Activity size={20} color="#2563eb" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Recent Activity Stream
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ChevronRight size={16} />}
                    onClick={() => navigate('/gifts')}
                  >
                    View All
                  </Button>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {activityQuery.isLoading ? (
                  <Stack spacing={2}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        variant="rectangular"
                        height={64}
                        sx={{ borderRadius: 2 }}
                      />
                    ))}
                  </Stack>
                ) : activityQuery.isError || !activityQuery.data || activityQuery.data.length === 0 ? (
                  <Box
                    sx={{
                      py: 6,
                      textAlign: 'center',
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                    }}
                  >
                    <Inbox size={36} color="#94a3b8" />
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      No recent activity
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {activityQuery.data.map((act) => (
                      <Box
                        key={act.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <Box
                            sx={{
                              width: 42,
                              height: 42,
                              borderRadius: 2,
                              bgcolor: `${act.color || '#6366f1'}15`,
                              color: act.color || '#6366f1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {act.type === 'gift' ? (
                              <Gift size={20} />
                            ) : act.type === 'subscription' ? (
                              <Crown size={20} />
                            ) : act.type === 'payout' ? (
                              <Wallet size={20} />
                            ) : (
                              <Zap size={20} />
                            )}
                          </Box>
                          <Box>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700 }}
                            >
                              {act.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {act.subtitle}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ textAlign: 'right' }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, color: 'primary.main' }}
                          >
                            {act.value}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {act.time}
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

        {/* Quick Actions Panel & Notifications Widget */}
        <Grid xs={12} md={5} lg={4}>
          <Stack spacing={3}>
            {/* Quick Actions Panel */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                >
                  <Sparkles size={20} color="#7c3aed" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Quick Studio Actions
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={1.5}>
                  <Grid xs={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Plus size={16} />}
                      onClick={() => navigate('/subscribers')}
                      sx={{ py: 1.5, fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                      New Plan
                    </Button>
                  </Grid>
                  <Grid xs={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Calendar size={16} />}
                      onClick={() => navigate('/schedule')}
                      sx={{ py: 1.5, fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                      Schedule
                    </Button>
                  </Grid>
                  <Grid xs={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Gift size={16} />}
                      onClick={() => navigate('/gifts')}
                      sx={{ py: 1.5, fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                      Gift Log
                    </Button>
                  </Grid>
                  <Grid xs={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ArrowUpRight size={16} />}
                      onClick={() => navigate('/analytics')}
                      sx={{ py: 1.5, fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                      Analytics
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Notifications Widget (Optional Service - Isolated Error Boundary) */}
            <WidgetErrorBoundary title="Notifications" onRetry={() => notificationsQuery.refetch()}>
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
                      <Bell size={20} color="#d97706" />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Notifications
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => navigate('/notifications')}
                    >
                      View
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  {notificationsQuery.isLoading ? (
                    <Stack spacing={1.5}>
                      <Skeleton variant="rectangular" height={48} />
                      <Skeleton variant="rectangular" height={48} />
                    </Stack>
                  ) : notificationsQuery.isError || !notificationsQuery.data?.data || notificationsQuery.data.data.length === 0 ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', textAlign: 'center', py: 2 }}
                    >
                      No notifications available
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {notificationsQuery.data.data.slice(0, 3).map((notif) => (
                        <Box
                          key={notif.id}
                          sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, fontSize: '0.8125rem' }}
                          >
                            {notif.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', my: 0.5 }}
                          >
                            {notif.message}
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


