import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
} from '@mui/material';
import { Users, UserCheck, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';

export const AudiencePage: React.FC = () => {
  const statsQuery = useQuery({
    queryKey: ['creator', 'audience', 'follow-stats'],
    queryFn: ({ signal }) => creatorApi.getFollowStats(signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const dashboardQuery = useQuery({
    queryKey: ['creator', 'dashboard'],
    queryFn: ({ signal }) => creatorApi.getDashboardSummary(signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const followersQuery = useQuery({
    queryKey: ['creator', 'audience', 'followers-preview'],
    queryFn: ({ signal }) =>
      creatorApi.getFollowersPage({ page: 1, limit: 10 }, signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const isLoading =
    statsQuery.isLoading || dashboardQuery.isLoading || followersQuery.isLoading;
  const firstError = statsQuery.error || dashboardQuery.error || followersQuery.error;

  if (isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="card" count={3} />
      </Box>
    );
  }

  if (firstError) {
    return (
      <PageErrorState
        title="Unable to Load Audience Data"
        message={
          firstError.message ||
          'Audience metrics could not be retrieved from the backend.'
        }
        onRetry={() => {
          void statsQuery.refetch();
          void dashboardQuery.refetch();
          void followersQuery.refetch();
        }}
      />
    );
  }

  const followersCount = Number(statsQuery.data?.followersCount || 0);
  const followingCount = Number(statsQuery.data?.followingCount || 0);
  const mutualCount = Number(statsQuery.data?.mutualCount || 0);
  const subscribersCount = Number(dashboardQuery.data?.subscriberCount || 0);
  const subscriberRatio =
    followersCount > 0 ? (subscribersCount / followersCount) * 100 : 0;
  const followers = followersQuery.data?.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Audience & Fan Overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real follower, subscriber and relationship metrics from your account.
          Unsupported demographic or listening metrics are not fabricated.
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Followers
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5 }}>
                {followersCount.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Registered users following you
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Active Subscribers
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5 }}>
                {subscribersCount.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="primary.main">
                {subscriberRatio.toFixed(1)}% of follower count
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Following
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5 }}>
                {followingCount.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Accounts you follow
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Mutual Follows
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5 }}>
                {mutualCount.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Followers you also follow
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <Users size={20} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Recent Follower Directory
            </Typography>
          </Stack>

          {followers.length === 0 ? (
            <EmptyState
              icon={<Users size={42} />}
              title="No Followers Yet"
              description="Registered followers will appear here when users follow your creator account."
            />
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Follower</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Relationship</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {followers.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Avatar src={row.avatarUrl} sx={{ width: 36, height: 36 }}>
                            {row.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {row.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.handle || 'No public username'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={row.verified ? <Crown size={14} /> : undefined}
                          label={row.badge || (row.verified ? 'Verified' : 'Listener')}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={row.isFollowingBack ? 'success' : 'default'}
                          icon={row.isFollowingBack ? <UserCheck size={14} /> : undefined}
                          label={row.isFollowingBack ? 'Mutual Follow' : 'Follower'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
