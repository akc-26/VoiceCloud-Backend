import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import PollOutlinedIcon from '@mui/icons-material/PollOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';

import { StatisticsCards, StatItem } from '../components/common/StatisticsCards';
import { ErrorState } from '../components/common/ErrorState';
import { StatusBadge } from '../components/common/StatusBadge';
import { adminService } from '../services/admin.service';

interface DashboardStats {
  overview: {
    users: { total: number; activeToday: number };
    rooms: { total: number; liveNow: number };
    wallet: { totalTransactions: number };
    gifts: { catalogSize: number };
    vip: { totalSubscribers: number };
    hosts: { totalVerified: number };
    notifications: { totalSent: number };
    polls: { activeNow: number; totalVotesCast: number };
    quizzes: { activeNow: number; totalParticipants: number };
    pricing: { activeCountries: number };
  };
  infrastructure: {
    database: { status: string; driver: string };
    redis: { status: string };
    rtcSessions: { active: number; capacityLimit: number; averageQualityScore: number };
    storage: { provider: string; usageMb: number };
  };
  timestamp: string;
}

const formatNumber = (value: unknown) => Number(value || 0).toLocaleString();

export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getDashboardStats();
      setStatsData(data as DashboardStats);
    } catch (requestError: any) {
      setError(requestError?.message || 'The dashboard metrics could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const statsItems = useMemo<StatItem[]>(() => {
    if (!statsData) return [];
    const overview = statsData.overview;

    return [
      {
        title: 'Total Users',
        value: formatNumber(overview.users.total),
        description: `${formatNumber(overview.users.activeToday)} active today`,
        icon: <PeopleOutlinedIcon />,
        accentColor: theme.palette.primary.main,
      },
      {
        title: 'Live Rooms',
        value: formatNumber(overview.rooms.liveNow),
        description: `${formatNumber(overview.rooms.total)} total rooms`,
        icon: <MeetingRoomOutlinedIcon />,
        accentColor: theme.palette.info.main,
      },
      {
        title: 'Wallet Transactions',
        value: formatNumber(overview.wallet.totalTransactions),
        description: 'Recorded transactions',
        icon: <ReceiptLongOutlinedIcon />,
        accentColor: theme.palette.secondary.main,
      },
      {
        title: 'Verified Hosts',
        value: formatNumber(overview.hosts.totalVerified),
        description: 'Current Host profiles',
        icon: <RecordVoiceOverOutlinedIcon />,
        accentColor: theme.palette.success.main,
      },
      {
        title: 'Gift Catalog',
        value: formatNumber(overview.gifts.catalogSize),
        description: 'Persisted gift definitions',
        icon: <CardGiftcardOutlinedIcon />,
        accentColor: theme.palette.warning.main,
      },
      {
        title: 'VIP Memberships',
        value: formatNumber(overview.vip.totalSubscribers),
        description: 'Recorded memberships',
        icon: <WorkspacePremiumOutlinedIcon />,
        accentColor: theme.palette.primary.dark,
      },
      {
        title: 'Notifications',
        value: formatNumber(overview.notifications.totalSent),
        description: 'Persisted notification records',
        icon: <NotificationsNoneOutlinedIcon />,
        accentColor: theme.palette.info.dark,
      },
      {
        title: 'Regional Pricing',
        value: formatNumber(overview.pricing.activeCountries),
        description: 'Active country configurations',
        icon: <PublicOutlinedIcon />,
        accentColor: theme.palette.success.dark,
      },
    ];
  }, [statsData, theme]);

  const rtcCapacity = statsData?.infrastructure.rtcSessions.capacityLimit || 0;
  const rtcActive = statsData?.infrastructure.rtcSessions.active || 0;
  const rtcLoad = rtcCapacity > 0 ? Math.min(100, (rtcActive / rtcCapacity) * 100) : 0;
  const lastUpdated = statsData?.timestamp ? new Date(statsData.timestamp).toLocaleString() : null;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          mb: 2.25,
        }}
      >
        <Box>
          <Typography variant="h4">Dashboard Overview</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
            Real-time overview of the existing VoiceCloud platform and infrastructure.
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Last updated {lastUpdated}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={15} /> : <RefreshIcon />}
          onClick={fetchDashboardStats}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && !statsData ? (
        <ErrorState title="Dashboard unavailable" message={error} onRetry={fetchDashboardStats} />
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            {loading && !statsData ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                {Array.from({ length: 8 }).map((_, index) => (
                  <Card key={index} sx={{ minHeight: 126 }}><CardContent /></Card>
                ))}
              </Box>
            ) : (
              <StatisticsCards stats={statsItems} />
            )}
          </Box>

          {statsData && (
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, lg: 5 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}>
                      <Box>
                        <Typography variant="subtitle1">System Health</Typography>
                        <Typography variant="caption" color="text.secondary">Current infrastructure status reported by the platform.</Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 2.25,
                          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.07),
                          color: 'primary.main',
                        }}
                      >
                        <CloudOutlinedIcon sx={{ fontSize: 20 }} />
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 0.5 }} />
                    <Stack divider={<Divider flexItem />}>
                      <HealthRow
                        icon={<StorageOutlinedIcon />}
                        label="Database"
                        detail={statsData.infrastructure.database.driver}
                        status={statsData.infrastructure.database.status}
                      />
                      <HealthRow
                        icon={<MemoryOutlinedIcon />}
                        label="Redis"
                        detail="Realtime cache and coordination"
                        status={statsData.infrastructure.redis.status}
                      />
                      <HealthRow
                        icon={<GraphicEqOutlinedIcon />}
                        label="RTC sessions"
                        detail={`${formatNumber(rtcActive)} active`}
                        status="active"
                      />
                      <HealthRow
                        icon={<CloudOutlinedIcon />}
                        label="Storage"
                        detail={statsData.infrastructure.storage.provider}
                        status="active"
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, lg: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle1">Realtime Capacity</Typography>
                    <Typography variant="caption" color="text.secondary">Current RTC utilization from the platform response.</Typography>
                    <Box sx={{ mt: 2.4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Active sessions</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {formatNumber(rtcActive)} / {formatNumber(rtcCapacity)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={rtcLoad}
                        sx={{ height: 8, borderRadius: 999, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 999 } }}
                      />
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mt: 2.25 }}>
                        <MetricCell label="Capacity used" value={`${rtcLoad.toFixed(1)}%`} />
                        <MetricCell label="Quality score" value={`${Number(statsData.infrastructure.rtcSessions.averageQualityScore || 0).toFixed(1)}`} />
                        <MetricCell label="Storage usage" value={`${formatNumber(statsData.infrastructure.storage.usageMb)} MB`} />
                        <MetricCell label="Live rooms" value={formatNumber(statsData.overview.rooms.liveNow)} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, lg: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle1">Engagement Snapshot</Typography>
                    <Typography variant="caption" color="text.secondary">Existing aggregate participation data only.</Typography>
                    <Stack spacing={1.2} sx={{ mt: 2 }}>
                      <SnapshotRow icon={<PollOutlinedIcon />} label="Active polls" value={statsData.overview.polls.activeNow} />
                      <SnapshotRow icon={<PollOutlinedIcon />} label="Poll votes" value={statsData.overview.polls.totalVotesCast} />
                      <SnapshotRow icon={<QuizOutlinedIcon />} label="Active quizzes" value={statsData.overview.quizzes.activeNow} />
                      <SnapshotRow icon={<QuizOutlinedIcon />} label="Quiz participants" value={statsData.overview.quizzes.totalParticipants} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

const HealthRow: React.FC<{ icon: React.ReactNode; label: string; detail: string; status: string }> = ({ icon, label, detail, status }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.15, py: 1.25 }}>
    <Box sx={{ color: 'text.secondary', display: 'grid', placeItems: 'center', '& .MuiSvgIcon-root': { fontSize: 18 } }}>{icon}</Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{detail}</Typography>
    </Box>
    <StatusBadge status={status} />
  </Box>
);

const MetricCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box sx={{ p: 1.25, borderRadius: 2.25, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.45 }}>{label}</Typography>
    <Typography variant="subtitle1" sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
  </Box>
);

const SnapshotRow: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.15, borderRadius: 2.25, border: '1px solid', borderColor: 'divider' }}>
    <Box sx={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: 'action.hover', color: 'primary.main', '& .MuiSvgIcon-root': { fontSize: 17 } }}>{icon}</Box>
    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{label}</Typography>
    <Typography variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(value)}</Typography>
  </Box>
);
