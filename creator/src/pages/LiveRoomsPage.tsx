import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert,
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
  SlidersHorizontal,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorApi, type CreateLiveRoomInput } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { connectCreatorRoomRealtime } from '../services/live-room-realtime.service';
import { creatorLiveMediaService, useCreatorLiveMedia } from '../services/creator-live-media.service';

export const LiveRoomsPage: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const liveMedia = useCreatorLiveMedia();
  const [mediaError, setMediaError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Audio Lounge');
  const [newQuality, setNewQuality] = useState('324kbps Ultra HD');
  const [newAccess, setNewAccess] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');

  const roomsQuery = useQuery({
    queryKey: ['creator', 'rooms'],
    queryFn: ({ signal }) => creatorApi.getRooms(signal),
    staleTime: 2 * 1000,
    refetchInterval: 2500,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLiveRoomInput) => creatorApi.createRoom(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
      setIsCreateOpen(false);
      setNewTitle('');
      setNewAccess('PUBLIC');
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => creatorApi.startBroadcast(id),
    onSuccess: () => {
      setMediaError('');
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      if (liveMedia.roomId === id && liveMedia.microphoneEnabled) {
        await creatorLiveMediaService.stopSpeaking(id).catch(() => undefined);
      }
      return creatorApi.pauseRoom(id);
    },
    onSuccess: () => {
      setMediaError('');
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
    onError: (error: Error) => setMediaError(error?.message || 'Unable to pause broadcast'),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => creatorApi.resumeRoom(id),
    onSuccess: () => {
      setMediaError('');
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
    onError: (error: Error) => setMediaError(error?.message || 'Unable to resume broadcast'),
  });

  const endMutation = useMutation({
    mutationFn: async (id: string) => {
      if (liveMedia.roomId === id) await creatorLiveMediaService.disconnect(id);
      return creatorApi.endBroadcast(id);
    },
    onSuccess: () => {
      setMediaError('');
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
    onError: (error: Error) => setMediaError(error?.message || 'Unable to end broadcast'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => creatorApi.deleteRoom(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const handleCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    createMutation.mutate({
      title,
      category: newCategory,
      audioQuality: newQuality,
      isPrivate: newAccess === 'PRIVATE',
    });
  };

  const rooms = roomsQuery.data || [];
  const activeRoomKey = rooms
    .filter((room) => room.status === 'live' || room.status === 'paused')
    .map((room) => room.id)
    .sort()
    .join('|');

  useEffect(() => {
    const roomIds = activeRoomKey ? activeRoomKey.split('|').filter(Boolean) : [];
    if (!roomIds.length) return;
    let cancelled = false;
    let realtime: ReturnType<typeof connectCreatorRoomRealtime> | null = null;
    const refreshRooms = (payload?: { roomId?: string }) => {
      if (cancelled) return;
      if (payload?.roomId && !roomIds.includes(payload.roomId)) return;
      void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    };
    try {
      // Passive management-page subscription only. Do not join room presence here:
      // opening the management list must never make the creator appear present in every live room.
      realtime = connectCreatorRoomRealtime();
      [
        'user_joined', 'user_left', 'user_reconnected', 'presence_updated',
        'participant_joined', 'participant_left', 'participant_reconnected',
        'speaker_joined', 'speaker_left', 'hand_raised', 'hand_approved',
        'hand_rejected', 'microphone_muted', 'microphone_unmuted', 'stage_updated',
        'room.started', 'room.paused', 'room.resumed', 'room.ended',
      ].forEach((event) => realtime?.socket.on(event, refreshRooms));
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Realtime room updates are unavailable');
    }
    return () => {
      cancelled = true;
      realtime?.disconnect();
    };
  }, [activeRoomKey, queryClient]);

  async function toggleCardMic(roomId: string) {
    setMediaError('');
    try {
      if (liveMedia.roomId === roomId && liveMedia.microphoneEnabled) {
        await creatorLiveMediaService.stopSpeaking(roomId);
      } else {
        await creatorLiveMediaService.startSpeaking(roomId);
      }
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Unable to start the host microphone');
    }
  }

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
          onClick={() => { createMutation.reset(); setIsCreateOpen(true); }}
          sx={{ fontWeight: 700 }}
        >
          Create Audio Room
        </Button>
      </Box>

      {startMutation.isError ? (
        <Alert severity="error" onClose={() => startMutation.reset()}>
          {startMutation.error instanceof Error
            ? startMutation.error.message
            : 'Unable to start this broadcast. Verify the active RTC media provider and try again.'}
        </Alert>
      ) : null}

      {mediaError ? (
        <Alert severity="error" onClose={() => setMediaError('')}>
          {mediaError}
        </Alert>
      ) : null}

      {/* Empty State */}
      {rooms.length === 0 ? (
        <EmptyState
          icon={<Radio size={48} />}
          title="No Audio Rooms Available"
          description="Create your first audio room to start broadcasting live sessions to your followers."
          actionLabel="Create Audio Room"
          onAction={() => { createMutation.reset(); setIsCreateOpen(true); }}
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
                    boxShadow: isLive ? theme.shadows[6] : theme.shadows[1],
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
                        label={room.isPrivate ? 'Private' : 'Public'}
                        color={room.isPrivate ? 'warning' : 'success'}
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

                    <Box
                      sx={{
                        mt: 1,
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: 'background.default',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                            Broadcast controls
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {isLive ? 'On air — manage broadcast and microphone.' : isPaused ? 'Paused — resume when you are ready.' : 'Ready — start the broadcast when prepared.'}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          icon={<Radio size={14} />}
                          label={isLive ? 'On air' : isPaused ? 'Paused' : 'Ready'}
                          color={isLive ? 'error' : isPaused ? 'warning' : 'primary'}
                          variant={isLive ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 800, flexShrink: 0 }}
                        />
                      </Stack>
                      <Grid container spacing={1.25}>
                        {isLive ? (
                          <>
                            <Grid size={{ xs: 6 }}>
                              <Button
                                fullWidth
                                variant="outlined"
                                color="warning"
                                startIcon={<Pause size={16} />}
                                onClick={() => pauseMutation.mutate(room.id)}
                                disabled={pauseMutation.isPending}
                                sx={{ fontWeight: 800, minHeight: 48, borderRadius: 2 }}
                              >
                                Pause Broadcast
                              </Button>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Button
                                fullWidth
                                variant="contained"
                                color="error"
                                startIcon={<Square size={16} />}
                                onClick={() => endMutation.mutate(room.id)}
                                disabled={endMutation.isPending}
                                sx={{ fontWeight: 800, minHeight: 48, borderRadius: 2 }}
                              >
                                End Broadcast
                              </Button>
                            </Grid>
                          </>
                        ) : isPaused ? (
                          <>
                            <Grid size={{ xs: 6 }}>
                              <Button
                                fullWidth
                                variant="contained"
                                color="success"
                                startIcon={<Play size={16} />}
                                onClick={() => resumeMutation.mutate(room.id)}
                                disabled={resumeMutation.isPending}
                                sx={{ fontWeight: 800, minHeight: 48, borderRadius: 2 }}
                              >
                                Resume Broadcast
                              </Button>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Button
                                fullWidth
                                variant="contained"
                                color="error"
                                startIcon={<Square size={16} />}
                                onClick={() => endMutation.mutate(room.id)}
                                disabled={endMutation.isPending}
                                sx={{ fontWeight: 800, minHeight: 48, borderRadius: 2 }}
                              >
                                End Broadcast
                              </Button>
                            </Grid>
                          </>
                        ) : (
                          <Grid size={{ xs: 12 }}>
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<Play size={16} />}
                              fullWidth
                              onClick={() => startMutation.mutate(room.id)}
                              disabled={startMutation.isPending}
                              sx={{ fontWeight: 850, minHeight: 52, borderRadius: 2 }}
                            >
                              {startMutation.isPending ? 'Starting broadcast…' : 'Go Live'}
                            </Button>
                          </Grid>
                        )}

                        {isLive || isPaused ? (
                          <>
                            <Grid size={{ xs: 6 }}>
                              <Button
                                fullWidth
                                variant={liveMedia.roomId === room.id && liveMedia.microphoneEnabled ? 'outlined' : 'contained'}
                                color={liveMedia.roomId === room.id && liveMedia.microphoneEnabled ? 'warning' : 'success'}
                                startIcon={liveMedia.roomId === room.id && liveMedia.microphoneEnabled ? <MicOff size={16} /> : <Mic size={16} />}
                                onClick={() => void toggleCardMic(room.id)}
                                disabled={isPaused || (liveMedia.roomId === room.id && liveMedia.connecting)}
                                sx={{ fontWeight: 800, minHeight: 48, borderRadius: 2 }}
                              >
                                {isPaused
                                  ? 'Speaking Paused'
                                  : liveMedia.roomId === room.id && liveMedia.microphoneEnabled
                                    ? 'Mute Microphone'
                                    : liveMedia.roomId === room.id && liveMedia.connecting
                                      ? 'Connecting…'
                                      : 'Start Speaking'}
                              </Button>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<SlidersHorizontal size={16} />}
                                onClick={() => navigate(`/rooms/${room.id}/live`)}
                                sx={{ fontWeight: 800, minHeight: 48, borderRadius: 2 }}
                              >
                                Manage Live Room
                              </Button>
                            </Grid>
                          </>
                        ) : null}
                      </Grid>

                      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 0.75 }}>
                        <Tooltip title={isLive || isPaused ? 'End the broadcast before deleting this room' : 'Delete room'}>
                          <span>
                            <IconButton
                              color="error"
                              onClick={() => deleteMutation.mutate(room.id)}
                              disabled={deleteMutation.isPending || isLive || isPaused}
                              size="small"
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Room Modal */}
      <Dialog
        open={isCreateOpen}
        onClose={() => { createMutation.reset(); setIsCreateOpen(false); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Create New Live Audio Room
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {createMutation.isError && (
              <Alert severity="error">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Unable to create the room. Please review the room details and try again.'}
              </Alert>
            )}
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
              label="Room Access"
              fullWidth
              value={newAccess}
              onChange={(e) => setNewAccess(e.target.value as 'PUBLIC' | 'PRIVATE')}
              helperText="Private rooms are invite-only and are not listed in public room discovery."
            >
              <MenuItem value="PUBLIC">Public</MenuItem>
              <MenuItem value="PRIVATE">Private (Invite Only)</MenuItem>
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
          <Button onClick={() => { createMutation.reset(); setIsCreateOpen(false); }}>Cancel</Button>
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
