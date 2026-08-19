import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';
import CachedIcon from '@mui/icons-material/Cached';
import PeopleIcon from '@mui/icons-material/People';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MemoryIcon from '@mui/icons-material/Memory';

import { DataTable, Column } from '../components/common/DataTable';
import { useNotificationsStore } from '../store/notifications.store';
import {
  rankingsAdminService,
  LeaderboardItem,
  CacheStatusResponse,
} from '../services/rankings.service';

export const RankingsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Tab Data
  const [userRankings, setUserRankings] = useState<LeaderboardItem[]>([]);
  const [hostRankings, setHostRankings] = useState<LeaderboardItem[]>([]);
  const [agencyRankings, setAgencyRankings] = useState<LeaderboardItem[]>([]);
  const [clubRankings, setClubRankings] = useState<LeaderboardItem[]>([]);
  const [roomRankings, setRoomRankings] = useState<LeaderboardItem[]>([]);
  const [vipRankings, setVipRankings] = useState<LeaderboardItem[]>([]);
  const [creatorRankings, setCreatorRankings] = useState<LeaderboardItem[]>([]);
  const [trendingData, setTrendingData] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [cacheStatus, setCacheStatus] = useState<CacheStatusResponse | null>(
    null,
  );

  // Dialog for Creating Snapshot
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotCategory, setSnapshotCategory] = useState('users');
  const [snapshotTimeframe, setSnapshotTimeframe] = useState('daily');
  const [snapshotPeriod, setSnapshotPeriod] = useState(
    new Date().toISOString().split('T')[0],
  );

  const fetchRankings = async () => {
    setLoading(true);
    try {
      if (activeTab === 0) {
        const res = await rankingsAdminService.getLeaderboard('users');
        setUserRankings(res.items || []);
      } else if (activeTab === 1) {
        const res = await rankingsAdminService.getLeaderboard('hosts');
        setHostRankings(res.items || []);
      } else if (activeTab === 2) {
        const res = await rankingsAdminService.getLeaderboard('agencies');
        setAgencyRankings(res.items || []);
      } else if (activeTab === 3) {
        const res = await rankingsAdminService.getLeaderboard('clubs');
        setClubRankings(res.items || []);
      } else if (activeTab === 4) {
        const res = await rankingsAdminService.getLeaderboard('rooms');
        setRoomRankings(res.items || []);
      } else if (activeTab === 5) {
        const res = await rankingsAdminService.getLeaderboard('vip');
        setVipRankings(res.items || []);
      } else if (activeTab === 6) {
        const res = await rankingsAdminService.getLeaderboard('creators');
        setCreatorRankings(res.items || []);
      } else if (activeTab === 7) {
        const res = await rankingsAdminService.getTrendingSummary();
        setTrendingData(res);
      } else if (activeTab === 8) {
        const res = await rankingsAdminService.getSnapshots();
        setSnapshots(res.items || []);
      } else if (activeTab === 9) {
        const res = await rankingsAdminService.getCacheStatus();
        setCacheStatus(res);
      }
    } catch (error: any) {
      addToast('error', error?.message || 'Failed to load ranking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [activeTab]);

  const handleRefreshCache = async () => {
    try {
      setLoading(true);
      await rankingsAdminService.refreshCache();
      addToast('success', 'Refreshed all rankings Redis cache keys');
      const cs = await rankingsAdminService.getCacheStatus();
      setCacheStatus(cs);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Cache refresh failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      await rankingsAdminService.createSnapshot({
        category: snapshotCategory,
        timeframe: snapshotTimeframe,
        periodIdentifier: snapshotPeriod,
      });
      addToast(
        'success',
        `Created historical snapshot for ${snapshotCategory}`,
      );
      setSnapshotDialogOpen(false);
      fetchRankings();
    } catch (err: any) {
      addToast(
        'error',
        err?.response?.data?.message || 'Failed to create snapshot',
      );
    }
  };

  // User Columns
  const userColumns: Column<LeaderboardItem>[] = [
    {
      id: 'rank',
      label: 'Rank',
      render: (row) => (
        <Chip
          label={`#${row.rank}`}
          color={row.rank <= 3 ? 'primary' : 'default'}
          size="small"
          sx={{ fontWeight: 800 }}
        />
      ),
    },
    {
      id: 'username',
      label: 'User',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {row.displayName || row.username || row.id}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'country',
      label: 'Country',
      render: (row) => row.country || 'GLOBAL',
    },
    {
      id: 'coins',
      label: 'Coins',
      render: (row) => (row.coins || 0).toLocaleString(),
    },
    {
      id: 'diamonds',
      label: 'Diamonds',
      render: (row) => (row.diamonds || 0).toLocaleString(),
    },
    {
      id: 'followersCount',
      label: 'Followers',
      render: (row) => (row.followersCount || 0).toLocaleString(),
    },
    {
      id: 'popularityScore',
      label: 'Popularity Score',
      render: (row) => (row.popularityScore || 0).toLocaleString(),
    },
  ];

  // Host Columns
  const hostColumns: Column<LeaderboardItem>[] = [
    {
      id: 'rank',
      label: 'Rank',
      render: (row) => (
        <Chip
          label={`#${row.rank}`}
          color={row.rank <= 3 ? 'warning' : 'default'}
          size="small"
        />
      ),
    },
    { id: 'hostName', label: 'Host', render: (row) => row.hostName || row.id },
    { id: 'level', label: 'Level', render: (row) => `Lvl ${row.level || 1}` },
    {
      id: 'totalAudience',
      label: 'Total Audience',
      render: (row) => (row.totalAudience || 0).toLocaleString(),
    },
    {
      id: 'giftsEarned',
      label: 'Gifts Earned',
      render: (row) => (row.giftsEarned || 0).toLocaleString(),
    },
    {
      id: 'engagementScore',
      label: 'Engagement Score',
      render: (row) => `${row.engagementScore || 85}%`,
    },
    {
      id: 'country',
      label: 'Country',
      render: (row) => row.country || 'GLOBAL',
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Global Rankings, Leaderboards & Trending Platform
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-category leaderboards, rolling trending windows, Redis
            caching, background jobs, and historical snapshots
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<CachedIcon />}
            onClick={handleRefreshCache}
          >
            Refresh Cache
          </Button>
          <Button
            variant="contained"
            startIcon={<HistoryIcon />}
            onClick={() => setSnapshotDialogOpen(true)}
          >
            Take Snapshot
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Active Categories
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}
              >
                9 Core Ranks
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Redis Cache TTL
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, color: 'success.main', mt: 0.5 }}
              >
                300s Auto-Refresh
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Background Engine
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, color: 'warning.main', mt: 0.5 }}
              >
                BullMQ Processing
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Live Broadcast
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, color: 'info.main', mt: 0.5 }}
              >
                WebSocket Gateway
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label="User Rankings"
            icon={<PeopleIcon />}
            iconPosition="start"
          />
          <Tab
            label="Host Rankings"
            icon={<RecordVoiceOverIcon />}
            iconPosition="start"
          />
          <Tab
            label="Agency Rankings"
            icon={<BusinessIcon />}
            iconPosition="start"
          />
          <Tab
            label="Club Rankings"
            icon={<GroupsIcon />}
            iconPosition="start"
          />
          <Tab
            label="Room Rankings"
            icon={<MeetingRoomIcon />}
            iconPosition="start"
          />
          <Tab
            label="VIP Rankings"
            icon={<WorkspacePremiumIcon />}
            iconPosition="start"
          />
          <Tab
            label="Creator Rankings"
            icon={<AutoAwesomeIcon />}
            iconPosition="start"
          />
          <Tab
            label="Trending"
            icon={<TrendingUpIcon />}
            iconPosition="start"
          />
          <Tab
            label="Historical Snapshots"
            icon={<HistoryIcon />}
            iconPosition="start"
          />
          <Tab
            label="Cache & Engine Status"
            icon={<MemoryIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab 0: User Rankings */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Global User Rankings (Coins, Diamonds, Followers & Popularity)
          </Typography>
          <DataTable
            columns={userColumns}
            rows={userRankings}
            loading={loading}
          />
        </Box>
      )}

      {/* Tab 1: Host Rankings */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Host Rankings (Audience, Gifts Earned & Engagement)
          </Typography>
          <DataTable
            columns={hostColumns}
            rows={hostRankings}
            loading={loading}
          />
        </Box>
      )}

      {/* Tab 2: Agency Rankings */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Agency Rankings (Revenue & Active Hosts)
          </Typography>
          <DataTable
            columns={[
              { id: 'rank', label: 'Rank', render: (r) => `#${r.rank}` },
              {
                id: 'name',
                label: 'Agency Name',
                render: (r) => r.name || r.id,
              },
              {
                id: 'totalRevenue',
                label: 'Revenue ($)',
                render: (r) => `$${(r.totalRevenue || 0).toLocaleString()}`,
              },
              {
                id: 'memberCount',
                label: 'Members',
                render: (r) => r.memberCount || 0,
              },
              {
                id: 'activeHostCount',
                label: 'Active Hosts',
                render: (r) => r.activeHostCount || 0,
              },
              {
                id: 'country',
                label: 'Country',
                render: (r) => r.country || 'GLOBAL',
              },
            ]}
            rows={agencyRankings}
            loading={loading}
          />
        </Box>
      )}

      {/* Tab 3: Club Rankings */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Club Rankings (Active Members & Weekly Activity)
          </Typography>
          <DataTable
            columns={[
              { id: 'rank', label: 'Rank', render: (r) => `#${r.rank}` },
              { id: 'name', label: 'Club Name', render: (r) => r.name || r.id },
              {
                id: 'category',
                label: 'Category',
                render: (r) => r.category || 'General',
              },
              {
                id: 'memberCount',
                label: 'Members',
                render: (r) => r.memberCount || 0,
              },
              {
                id: 'weeklyActivityScore',
                label: 'Activity Score',
                render: (r) => r.weeklyActivityScore || 0,
              },
            ]}
            rows={clubRankings}
            loading={loading}
          />
        </Box>
      )}

      {/* Tab 4: Room Rankings */}
      {activeTab === 4 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Voice Room Rankings (Listeners & Popularity)
          </Typography>
          <DataTable
            columns={[
              { id: 'rank', label: 'Rank', render: (r) => `#${r.rank}` },
              {
                id: 'title',
                label: 'Room Title',
                render: (r) => r.title || r.id,
              },
              {
                id: 'listenerCount',
                label: 'Active Listeners',
                render: (r) => r.listenerCount || 0,
              },
              {
                id: 'popularityScore',
                label: 'Popularity Score',
                render: (r) => r.popularityScore || 0,
              },
              {
                id: 'giftActivity',
                label: 'Gifts Activity',
                render: (r) => r.giftActivity || 0,
              },
            ]}
            rows={roomRankings}
            loading={loading}
          />
        </Box>
      )}

      {/* Tab 5: VIP Rankings */}
      {activeTab === 5 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            VIP Member Rankings (Tier Level, XP & Lifetime Spending)
          </Typography>
          <DataTable
            columns={[
              { id: 'rank', label: 'Rank', render: (r) => `#${r.rank}` },
              { id: 'userId', label: 'User ID', render: (r) => r.userId },
              {
                id: 'tierName',
                label: 'Tier',
                render: (r) => r.tierName || 'VIP',
              },
              {
                id: 'level',
                label: 'VIP Level',
                render: (r) => `Lvl ${r.level || 1}`,
              },
              {
                id: 'experience',
                label: 'XP Points',
                render: (r) => (r.experience || 0).toLocaleString(),
              },
              {
                id: 'lifetimeSpending',
                label: 'Spending ($)',
                render: (r) => `$${(r.lifetimeSpending || 0).toFixed(2)}`,
              },
            ]}
            rows={vipRankings}
            loading={loading}
          />
        </Box>
      )}

      {/* Tab 6: Creator Rankings */}
      {activeTab === 6 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Creator Rankings (Revenue & Followers)
          </Typography>
          <DataTable
            columns={[
              { id: 'rank', label: 'Rank', render: (r) => `#${r.rank}` },
              {
                id: 'username',
                label: 'Creator',
                render: (r) => r.displayName || r.username || r.id,
              },
              {
                id: 'creatorRevenue',
                label: 'Revenue ($)',
                render: (r) => `$${(r.creatorRevenue || 0).toFixed(2)}`,
              },
              {
                id: 'followersCount',
                label: 'Followers',
                render: (r) => (r.followersCount || 0).toLocaleString(),
              },
            ]}
            rows={creatorRankings}
            loading={loading}
          />
        </Box>
      )}

      {/* Tab 7: Trending Summary */}
      {activeTab === 7 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Rolling Window Trending Rankings
          </Typography>
          {trendingData ? (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      🔥 Fastest Rising Users
                    </Typography>
                    {trendingData.fastestRisingUsers
                      ?.slice(0, 5)
                      .map((u: any, i: number) => (
                        <Box
                          key={i}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            my: 1,
                          }}
                        >
                          <Typography variant="body2">
                            #{i + 1} {u.displayName || u.username}
                          </Typography>
                          <Chip
                            label={u.growthRate || '+120%'}
                            color="error"
                            size="small"
                          />
                        </Box>
                      ))}
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      🎙️ Trending Hosts
                    </Typography>
                    {trendingData.trendingHosts
                      ?.slice(0, 5)
                      .map((h: any, i: number) => (
                        <Box
                          key={i}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            my: 1,
                          }}
                        >
                          <Typography variant="body2">
                            #{i + 1} {h.stageName || h.id}
                          </Typography>
                          <Chip
                            label={h.audienceVelocity || '+400/hr'}
                            color="primary"
                            size="small"
                          />
                        </Box>
                      ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <CircularProgress />
          )}
        </Box>
      )}

      {/* Tab 8: Historical Snapshots */}
      {activeTab === 8 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Historical Ranking Snapshots
          </Typography>
          <DataTable
            columns={[
              { id: 'id', label: 'Snapshot ID', render: (s) => s.id },
              { id: 'category', label: 'Category', render: (s) => s.category },
              {
                id: 'timeframe',
                label: 'Timeframe',
                render: (s) => s.timeframe,
              },
              {
                id: 'periodIdentifier',
                label: 'Period',
                render: (s) => s.periodIdentifier,
              },
              {
                id: 'totalCount',
                label: 'Entities Ranked',
                render: (s) => s.totalCount,
              },
              {
                id: 'createdAt',
                label: 'Created At',
                render: (s) => new Date(s.createdAt).toLocaleString(),
              },
            ]}
            rows={snapshots}
            loading={loading}
          />
        </Box>
      )}

      {/* Tab 9: Cache Status */}
      {activeTab === 9 && cacheStatus && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Redis Rankings Cache Engine Status
          </Typography>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Last Refreshed At:{' '}
              <strong>
                {new Date(cacheStatus.lastRefreshedAt).toLocaleString()}
              </strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Total Active Cached Keys:{' '}
              <strong>{cacheStatus.totalCached}</strong>
            </Typography>
            <Grid container spacing={1}>
              {Object.entries(cacheStatus.cachedKeys).map(([k, v]) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={k}>
                  <Chip
                    label={`${k}: ${v ? 'ACTIVE' : 'EXPIRED'}`}
                    color={v ? 'success' : 'default'}
                    sx={{ width: '100%' }}
                  />
                </Grid>
              ))}
            </Grid>
          </Card>
        </Box>
      )}

      {/* Snapshot Dialog */}
      <Dialog
        open={snapshotDialogOpen}
        onClose={() => setSnapshotDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create Historical Ranking Snapshot</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            margin="dense"
            label="Category"
            value={snapshotCategory}
            onChange={(e) => setSnapshotCategory(e.target.value)}
          >
            <MenuItem value="users">Users</MenuItem>
            <MenuItem value="hosts">Hosts</MenuItem>
            <MenuItem value="agencies">Agencies</MenuItem>
            <MenuItem value="clubs">Clubs</MenuItem>
            <MenuItem value="rooms">Rooms</MenuItem>
            <MenuItem value="vip">VIP</MenuItem>
            <MenuItem value="creators">Creators</MenuItem>
          </TextField>
          <TextField
            select
            fullWidth
            margin="dense"
            label="Timeframe"
            value={snapshotTimeframe}
            onChange={(e) => setSnapshotTimeframe(e.target.value)}
          >
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
          </TextField>
          <TextField
            fullWidth
            margin="dense"
            label="Period Identifier"
            value={snapshotPeriod}
            onChange={(e) => setSnapshotPeriod(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnapshotDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateSnapshot}>
            Create Snapshot
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
