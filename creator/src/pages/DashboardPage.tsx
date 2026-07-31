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
  Tooltip,
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
} from 'lucide-react';
import { useCreatorProfileStore } from '../store/creator-profile.store';
import { useNotificationStore } from '../store/notification.store';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const profile = useCreatorProfileStore((state) => state.profile);
  const notifications = useNotificationStore((state) => state.notifications);

  const statsCards = [
    {
      title: 'Live Listeners Peak',
      value: '1,850',
      change: '+14.2% vs last week',
      icon: Radio,
      color: '#7c3aed',
      link: '/creator/analytics',
    },
    {
      title: 'Active Followers',
      value: profile.followersCount.toLocaleString(),
      change: '+240 new this week',
      icon: Users,
      color: '#2563eb',
      link: '/creator/followers',
    },
    {
      title: 'Active Subscribers',
      value: profile.subscribersCount.toLocaleString(),
      change: '84% VIP Retention Rate',
      icon: Crown,
      color: '#d97706',
      link: '/creator/subscribers',
    },
    {
      title: 'Monthly Revenue (Est.)',
      value: '$1,140.00',
      change: '+18.5% growth',
      icon: DollarSign,
      color: '#059669',
      link: '/creator/earnings',
    },
  ];

  const recentActivities = [
    {
      id: 'act-1',
      title: 'Gift Received: Dragon Castle',
      subtitle: 'From @alex_audionut in Audio Lounge #102',
      value: '+5,000 Coins ($50.00)',
      time: '12 mins ago',
      icon: Gift,
      color: '#7c3aed',
    },
    {
      id: 'act-2',
      title: 'New VIP Gold Subscriber',
      subtitle: '@sarah_waves subscribed to Gold Plan',
      value: '+1,500 Coins/mo',
      time: '45 mins ago',
      icon: Crown,
      color: '#d97706',
    },
    {
      id: 'act-3',
      title: 'Payout Request Processed',
      subtitle: 'Bank Transfer #PR-8821 completed',
      value: '$1,250.00 USD',
      time: '5 hours ago',
      icon: Wallet,
      color: '#059669',
    },
    {
      id: 'act-4',
      title: 'Broadcast Milestone Reached',
      subtitle: 'Exceeded 1,000 concurrent listeners for 2 hours',
      value: 'Badge Unlocked',
      time: '1 day ago',
      icon: Zap,
      color: '#2563eb',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* 1. Welcome Back Banner Header */}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Welcome back, {profile.displayName}!
                </Typography>
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
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9, color: 'rgba(255,255,255,0.85)' }}>
                {profile.category} • {profile.tier} Creator Tier • Studio Gateway Ready
              </Typography>
            </Box>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Radio size={18} />}
              onClick={() => navigate('/creator/rooms')}
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
              onClick={() => navigate('/creator/schedule')}
              sx={{
                borderColor: 'rgba(255,255,255,0.5)',
                color: '#ffffff',
                fontWeight: 700,
                '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Schedule Session
            </Button>
          </Stack>
        </Box>
      </Card>

      {/* 2. Top Stats Ticker Grid */}
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TrendingUp size={13} /> {card.change}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 3. Middle Section: Live Room Status & Wallet Summary */}
      <Grid container spacing={3}>
        {/* Live Room Status Widget */}
        <Grid xs={12} md={7} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Radio size={20} color="#7c3aed" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Live Room Status
                  </Typography>
                </Box>
                <Chip label="Offline / Ready" color="default" size="small" sx={{ fontWeight: 700 }} />
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
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Primary Audio Room: Late Night Audio Lounge & Chill Beats
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Audio Preset: 324kbps Ultra HD Voice | Soundboard Active | Co-Host Mic Seats: 8 Seats Available
                </Typography>

                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Radio size={16} />}
                    onClick={() => navigate('/creator/rooms')}
                  >
                    Manage Room
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate('/creator/settings')}
                  >
                    Audio Settings
                  </Button>
                </Stack>
              </Box>

              {/* Channel Performance Gauge */}
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                Stream Quality Health Score: 98/100 (Optimal Bitrate)
              </Typography>
              <LinearProgress variant="determinate" value={98} color="success" sx={{ height: 8, borderRadius: 4 }} />
            </CardContent>
          </Card>
        </Grid>

        {/* Wallet Balance & Earnings Summary Widget */}
        <Grid xs={12} md={5} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Wallet size={20} color="#059669" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Creator Wallet
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => navigate('/creator/wallet')}>
                  <ChevronRight size={18} />
                </IconButton>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Available Diamonds Balance
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', my: 0.5 }}>
                  💎 {profile.walletDiamonds.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Estimated Value: <strong>${(profile.walletDiamonds / 100).toFixed(2)} USD</strong>
                </Typography>
              </Box>

              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Coins Balance:
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    🪙 {profile.walletCoins.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Pending Payouts:
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    $500.00 USD
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                color="success"
                fullWidth
                startIcon={<DollarSign size={18} />}
                onClick={() => navigate('/creator/payout-requests')}
                sx={{ fontWeight: 700 }}
              >
                Request Payout
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 4. Bottom Section: Recent Activity & Studio Notifications & Quick Actions */}
      <Grid container spacing={3}>
        {/* Recent Activity Stream */}
        <Grid xs={12} md={7} lg={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Activity size={20} color="#2563eb" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Recent Activity
                  </Typography>
                </Box>
                <Button size="small" endIcon={<ChevronRight size={16} />} onClick={() => navigate('/creator/gifts')}>
                  View All
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                {recentActivities.map((act) => (
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 2,
                          bgcolor: `${act.color}15`,
                          color: act.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <act.icon size={20} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {act.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {act.subtitle}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {act.value}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {act.time}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions Panel & Notifications Widget */}
        <Grid xs={12} md={5} lg={4}>
          <Stack spacing={3}>
            {/* Quick Actions Panel */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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
                      onClick={() => navigate('/creator/subscribers')}
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
                      onClick={() => navigate('/creator/schedule')}
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
                      onClick={() => navigate('/creator/gifts')}
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
                      onClick={() => navigate('/creator/analytics')}
                      sx={{ py: 1.5, fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                      Analytics
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Notifications Widget */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Bell size={20} color="#d97706" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Notifications
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => navigate('/creator/notifications')}>
                    View
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.5}>
                  {notifications.slice(0, 3).map((notif) => (
                    <Box key={notif.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                        {notif.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', my: 0.5 }}>
                        {notif.message}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};
