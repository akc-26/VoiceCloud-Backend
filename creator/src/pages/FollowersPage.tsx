import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Pagination,
  Alert,
} from '@mui/material';
import { UserCheck, Search, UserPlus, Users } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const FollowersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const itemsPerPage = 8;

  const followersQuery = useQuery({
    queryKey: ['creator', 'followers', page, search.trim(), sort],
    queryFn: ({ signal }) =>
      creatorApi.getFollowersPage(
        {
          page,
          limit: itemsPerPage,
          search: search.trim() || undefined,
          sortOrder: sort === 'oldest' ? 'ASC' : 'DESC',
        },
        signal,
      ),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const followMutation = useMutation({
    mutationFn: async (item: { userId: string; isFollowingBack: boolean }) => {
      if (item.isFollowingBack) {
        return creatorApi.unfollowUser(item.userId);
      }
      return creatorApi.followUser(item.userId);
    },
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['creator', 'followers'] }),
        queryClient.invalidateQueries({ queryKey: ['creator', 'audience'] }),
        queryClient.invalidateQueries({ queryKey: ['creator', 'profile'] }),
      ]);
    },
    onError: (error: Error) => {
      setActionError(error?.message || 'The follow action could not be completed.');
    },
  });

  if (followersQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="grid" count={4} />
      </Box>
    );
  }

  if (followersQuery.isError) {
    return (
      <PageErrorState
        title="Failed to Load Followers"
        message={
          followersQuery.error?.message ||
          'Unable to retrieve follower directory from backend.'
        }
        onRetry={() => {
          void followersQuery.refetch();
        }}
      />
    );
  }

  const followers = followersQuery.data?.data || [];
  const total = Number(followersQuery.data?.total || 0);
  const totalPages = Math.max(1, Number(followersQuery.data?.totalPages || 0));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Follower Insights & Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Followers: <strong>{total.toLocaleString()}</strong> | Search,
            sort and manage follow-back relationships.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search followers..."
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 220 }}
          />
          <TextField
            select
            size="small"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as 'newest' | 'oldest');
              setPage(1);
            }}
            sx={{ width: 140 }}
          >
            <MenuItem value="newest">Newest First</MenuItem>
            <MenuItem value="oldest">Oldest First</MenuItem>
          </TextField>
        </Box>
      </Box>

      {actionError && <Alert severity="error">{actionError}</Alert>}

      {followers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No Followers Found"
          description={
            search
              ? `No followers matching "${search}".`
              : 'You do not have any followers yet.'
          }
          actionLabel={search ? 'Clear Search' : undefined}
          onAction={() => {
            setSearch('');
            setPage(1);
          }}
        />
      ) : (
        <>
          <Grid container spacing={2.5}>
            {followers.map((item) => (
              <Grid key={item.userId} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                    <Avatar
                      src={item.avatarUrl}
                      sx={{
                        width: 56,
                        height: 56,
                        mx: 'auto',
                        mb: 1.5,
                        bgcolor: 'primary.main',
                        fontWeight: 700,
                      }}
                    >
                      {item.name?.charAt(0) || 'U'}
                    </Avatar>

                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {item.handle || 'No public username'}
                    </Typography>

                    <Chip
                      label={item.badge || 'Listener'}
                      color={item.verified ? 'primary' : 'default'}
                      size="small"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />

                    <Button
                      variant={item.isFollowingBack ? 'outlined' : 'contained'}
                      color={item.isFollowingBack ? 'inherit' : 'primary'}
                      size="small"
                      fullWidth
                      startIcon={
                        item.isFollowingBack ? <UserCheck size={16} /> : <UserPlus size={16} />
                      }
                      onClick={() => {
                        setActionError(null);
                        followMutation.mutate({
                          userId: item.userId,
                          isFollowingBack: item.isFollowingBack,
                        });
                      }}
                      disabled={followMutation.isPending}
                      sx={{ fontWeight: 700 }}
                    >
                      {item.isFollowingBack ? 'Unfollow' : 'Follow Back'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={Math.min(page, totalPages)}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
