import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  UserCheck,
  Search,
  MessageSquare,
  UserPlus,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { useCreatorProfileStore } from '../store/creator-profile.store';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const FollowersPage: React.FC = () => {
  const profile = useCreatorProfileStore((state) => state.profile);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const followersQuery = useQuery({
    queryKey: ['creator', 'followers'],
    queryFn: ({ signal }) => creatorApi.getFollowers(signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const followersList = followersQuery.data || [];

  const filteredFollowers = useMemo(() => {
    let result = [...followersList];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.name?.toLowerCase().includes(q) ||
          f.handle?.toLowerCase().includes(q),
      );
    }
    if (sort === 'oldest') {
      result.reverse();
    }
    return result;
  }, [followersList, search, sort]);

  const totalPages = Math.ceil(filteredFollowers.length / itemsPerPage) || 1;
  const paginatedFollowers = filteredFollowers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

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
        onRetry={() => followersQuery.refetch()}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header & Controls */}
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
            Total Followers:{' '}
            <strong>
              {(profile.followersCount ?? 14250).toLocaleString()}
            </strong>{' '}
            | Engage with listeners and supporters.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
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
            onChange={(e) => setSort(e.target.value as any)}
            sx={{ width: 140 }}
          >
            <MenuItem value="newest">Newest First</MenuItem>
            <MenuItem value="oldest">Oldest First</MenuItem>
          </TextField>
        </Box>
      </Box>

      {/* Followers Grid */}
      {filteredFollowers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No Followers Found"
          description={
            search
              ? `No followers matching "${search}".`
              : 'You do not have any followers yet.'
          }
          actionLabel={search ? 'Clear Search' : undefined}
          onAction={() => setSearch('')}
        />
      ) : (
        <>
          <Grid container spacing={2.5}>
            {paginatedFollowers.map((item, idx) => (
              <Grid key={item.id || idx} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
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
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 1 }}
                    >
                      {item.handle}
                    </Typography>

                    <Chip
                      label={item.badge || 'Listener'}
                      color={
                        item.badge?.includes('VIP') ? 'secondary' : 'primary'
                      }
                      size="small"
                      variant="outlined"
                      sx={{ mb: 1.5 }}
                    />

                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ display: 'block', mb: 2 }}
                    >
                      Followed{' '}
                      {new Date(
                        item.followedAt || Date.now(),
                      ).toLocaleDateString()}
                    </Typography>

                    <Button
                      variant={item.isFollowingBack ? 'outlined' : 'contained'}
                      color={item.isFollowingBack ? 'inherit' : 'primary'}
                      size="small"
                      fullWidth
                      startIcon={
                        item.isFollowingBack ? (
                          <UserCheck size={16} />
                        ) : (
                          <UserPlus size={16} />
                        )
                      }
                      sx={{ fontWeight: 700 }}
                    >
                      {item.isFollowingBack ? 'Following' : 'Follow Back'}
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
                page={page}
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
