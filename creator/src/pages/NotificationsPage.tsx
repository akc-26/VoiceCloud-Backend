import React, { useState, useMemo } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

type FilterType =
  | 'all'
  | 'unread'
  | 'system'
  | 'gift'
  | 'vip'
  | 'announcement'
  | 'room_invitation'
  | 'host_approval'
  | 'agency'
  | 'in_app';

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  const notificationsQuery = useQuery({
    queryKey: ['creator', 'notifications'],
    queryFn: ({ signal }) => creatorApi.getNotifications({ limit: 50 }, signal),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => creatorApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => creatorApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => creatorApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'notifications'] });
    },
  });

  const notifications = useMemo(() => {
    const raw = notificationsQuery.data?.data || [];
    return raw.filter((n: any) => {
      if (filter === 'unread') return !n.isRead && !n.read;
      if (filter !== 'all') return (n.type as string)?.toLowerCase() === filter;
      return true;
    });
  }, [notificationsQuery.data, filter]);

  if (notificationsQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="list" count={4} />
      </Box>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <PageErrorState
        title="Failed to Load Notifications"
        message={notificationsQuery.error?.message || 'Unable to retrieve notification alerts.'}
        onRetry={() => notificationsQuery.refetch()}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Creator Notifications Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Persisted in-app alerts, including lifecycle updates, gifts, VIP, room, agency, and platform announcements.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<CheckCheck size={18} />}
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending}
          sx={{ fontWeight: 700 }}
        >
          Mark All Read
        </Button>
      </Box>

      {(markReadMutation.isError || markAllMutation.isError || deleteMutation.isError) && (
        <Alert severity="error">
          {(markReadMutation.error || markAllMutation.error || deleteMutation.error)?.message ||
            'The notification action could not be persisted.'}
        </Alert>
      )}

      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All" value="all" />
          <Tab label="Unread" value="unread" />
          <Tab label="System / Lifecycle" value="system" />
          <Tab label="Gifts" value="gift" />
          <Tab label="VIP" value="vip" />
          <Tab label="Announcements" value="announcement" />
          <Tab label="Room Invites" value="room_invitation" />
          <Tab label="Host Approval" value="host_approval" />
          <Tab label="Agency" value="agency" />
          <Tab label="In-App" value="in_app" />
        </Tabs>
      </Box>

      {/* Notifications Stack */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          {notifications.length === 0 ? (
            <EmptyState
              icon={<Bell size={48} />}
              title="No Notifications Found"
              description={filter !== 'all' ? `No ${filter} notifications present.` : 'You are all caught up!'}
            />
          ) : (
            <Stack spacing={2}>
              {notifications.map((item: any) => {
                const isRead = item.isRead ?? item.read ?? false;
                return (
                  <Box
                    key={item.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isRead ? 'transparent' : 'action.hover',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {item.title}
                        </Typography>
                        <Chip
                          label={(item.type || 'system').toUpperCase()}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {item.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                        {new Date(item.createdAt || Date.now()).toLocaleString()}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1}>
                      {!isRead && (
                        <Button
                          size="small"
                          onClick={() => markReadMutation.mutate(item.id)}
                          disabled={markReadMutation.isPending}
                        >
                          Mark Read
                        </Button>
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
