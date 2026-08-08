import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Divider,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Badge,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Radio,
  Users,
  Play,
  Pause,
  Square,
  Plus,
  Mic,
  MicOff,
  Trash2,
  UserPlus,
  UserCheck,
  Shield,
  Volume2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { LiveRoomSummary } from '../types/creator.types';

export const LiveRoomsPage: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeStageRoom, setActiveStageRoom] =
    useState<LiveRoomSummary | null>(null);
  const [inviteUserId, setInviteUserId] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Audio Lounge');
  const [newQuality, setNewQuality] = useState('324kbps Ultra HD');

  const roomsQuery = useQuery({
    queryKey: ['creator', 'rooms'],
    queryFn: ({ signal }) => creatorApi.getRooms(signal),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<LiveRoomSummary>) => creatorApi.createRoom(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
      setIsCreateOpen(false);
      setNewTitle('');
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => creatorApi.startRoom(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => creatorApi.pauseRoom(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => creatorApi.resumeRoom(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => creatorApi.endRoom(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => creatorApi.deleteRoom(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      creatorApi.inviteSpeaker(roomId, userId),
    onSuccess: () => {
      setInviteUserId('');
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle,
      category: newCategory,
      audioQuality: newQuality,
      status: 'offline',
      currentListeners: 0,
      peakListeners: 0,
    });
  };

  if (roomsQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="card" count={3} />
      </Box>
    );
  }

  if (roomsQuery.isError) {
    return (
      <PageErrorState
        title="Unable to Load Live Rooms"
        message={
          roomsQuery.error?.message ||
          'Failed to fetch live audio rooms from backend.'
        }
        onRetry={() => {
          void roomsQuery.refetch();
        }}
      />
    );
  }

  const rooms = roomsQuery.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
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
            Live Audio Rooms Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage live broadcasts, speaker stage controls, listener presence,
            and RTC room configurations.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus size={18} />}
          onClick={() => setIsCreateOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          Create Audio Room
        </Button>
      </Box>

      {/* Empty State */}
      {rooms.length === 0 ? (
        <EmptyState
          icon={<Radio size={48} />}
          title="No Audio Rooms Available"
          description="Create your first audio room to start broadcasting live sessions to your followers."
          actionLabel="Create Audio Room"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <Grid container spacing={3}>
          {rooms.map((room) => {
            const isLive = room.status === 'live';
            const isPaused = room.status === 'paused';

            return (
              <Grid key={room.id} size={{ xs: 12, md: 6 }}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderColor: isLive ? 'primary.main' : 'divider',
                    boxShadow: isLive
                      ? '0 14px 34px rgba(34,197,94,0.12)'
                      : undefined,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2,
                      }}
                    >
                      <Chip
                        icon={
                          <Radio size={14} color={theme.palette.primary.main} />
                        }
                        label={room.category || 'Audio Lounge'}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={
                          isLive
                            ? '🔴 LIVE'
                            : isPaused
                              ? '⏸ PAUSED'
                              : room.status.toUpperCase()
                        }
                        color={
                          isLive ? 'error' : isPaused ? 'warning' : 'default'
                        }
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      {room.title}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2} sx={{ mb: 2.5 }}>
                      <Grid size={{ xs: 6 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          Audio Preset:
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700 }}
                        >
                          {room.audioQuality || '324kbps Ultra HD'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          Current Listeners:
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <Users size={14} />{' '}
                          {room.currentListeners?.toLocaleString() || 0}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1.5}>
                      {isLive ? (
                        <>
                          <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<Pause size={16} />}
                            onClick={() => pauseMutation.mutate(room.id)}
                            disabled={pauseMutation.isPending}
                            sx={{ fontWeight: 700, flex: 1 }}
                          >
                            Pause
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<Square size={16} />}
                            onClick={() => endMutation.mutate(room.id)}
                            disabled={endMutation.isPending}
                            sx={{ fontWeight: 700, flex: 1 }}
                          >
                            End
                          </Button>
                        </>
                      ) : isPaused ? (
                        <>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<Play size={16} />}
                            onClick={() => resumeMutation.mutate(room.id)}
                            disabled={resumeMutation.isPending}
                            sx={{ fontWeight: 700, flex: 1 }}
                          >
                            Resume
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<Square size={16} />}
                            onClick={() => endMutation.mutate(room.id)}
                            disabled={endMutation.isPending}
                            sx={{ fontWeight: 700, flex: 1 }}
                          >
                            End
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<Play size={16} />}
                          fullWidth
                          onClick={() => startMutation.mutate(room.id)}
                          disabled={startMutation.isPending}
                          sx={{ fontWeight: 700 }}
                        >
                          {startMutation.isPending
                            ? 'Starting...'
                            : 'Start Broadcast'}
                        </Button>
                      )}

                      <Tooltip title="Manage Speaker Stage">
                        <IconButton
                          color="info"
                          onClick={() => setActiveStageRoom(room)}
                          size="small"
                        >
                          <Mic size={18} />
                        </IconButton>
                      </Tooltip>

                      <IconButton
                        color="error"
                        onClick={() => deleteMutation.mutate(room.id)}
                        disabled={deleteMutation.isPending}
                        size="small"
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Speaker Stage Control Dialog */}
      <Dialog
        open={Boolean(activeStageRoom)}
        onClose={() => setActiveStageRoom(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Shield size={20} color={theme.palette.primary.main} />
          Speaker Stage & Host Controls - {activeStageRoom?.title}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Invite User to Speaker Seat
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  placeholder="Enter User UUID to promote as speaker"
                  fullWidth
                  size="small"
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                />
                <Button
                  variant="contained"
                  startIcon={<UserPlus size={16} />}
                  onClick={() =>
                    activeStageRoom &&
                    inviteMutation.mutate({
                      roomId: activeStageRoom.id,
                      userId: inviteUserId,
                    })
                  }
                  disabled={!inviteUserId.trim() || inviteMutation.isPending}
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  Invite
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Speaker Seats Overview
              </Typography>
              <Stack spacing={1}>
                <Box
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <UserCheck size={16} color={theme.palette.success.main} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Host (You)
                    </Typography>
                    <Chip label="HOST" size="small" color="primary" />
                  </Stack>
                  <Chip
                    label="Mic Active"
                    size="small"
                    color="success"
                    icon={<Volume2 size={12} />}
                  />
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setActiveStageRoom(null)}>
            Close Controls
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Room Modal */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Create New Live Audio Room
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Room Title"
              placeholder="e.g. Late Night Acoustic Session & Chat"
              fullWidth
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <TextField
              select
              label="Category"
              fullWidth
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              <MenuItem value="Audio Lounge">Audio Lounge</MenuItem>
              <MenuItem value="Podcast">Podcast</MenuItem>
              <MenuItem value="Music & Jam">Music & Jam</MenuItem>
              <MenuItem value="Talk Show">Talk Show</MenuItem>
            </TextField>
            <TextField
              select
              label="Audio Quality Preset"
              fullWidth
              value={newQuality}
              onChange={(e) => setNewQuality(e.target.value)}
            >
              <MenuItem value="324kbps Ultra HD">
                324kbps Ultra HD Voice
              </MenuItem>
              <MenuItem value="256kbps HD Voice">256kbps HD Voice</MenuItem>
              <MenuItem value="128kbps Standard">
                128kbps Standard Voice
              </MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newTitle.trim() || createMutation.isPending}
            sx={{ fontWeight: 700 }}
          >
            {createMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              'Create Room'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
