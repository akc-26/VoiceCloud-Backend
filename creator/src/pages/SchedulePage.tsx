import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Bell,
  Calendar,
  Clock,
  Edit3,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  SlidersHorizontal,
  Square,
  Trash2,
  Users,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { useAuthStore } from '../store/auth.store';
import { creatorLiveMediaService, useCreatorLiveMedia } from '../services/creator-live-media.service';

function localInputParts(value?: string) {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  const pad = (part: number) => String(part).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function scheduleStatus(value?: string) {
  return String(value || 'scheduled').toLowerCase();
}

function localScheduleInstant(dateValue: string, timeValue: string): Date | null {
  if (!dateValue || !timeValue) return null;
  const value = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export const SchedulePage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const creatorUserId = useAuthStore((state) => state.user?.id || state.userId);
  const liveMedia = useCreatorLiveMedia();
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const scheduleQuery = useQuery({
    queryKey: ['creator', 'schedule', creatorUserId],
    queryFn: ({ signal }) => creatorApi.getScheduledRooms(creatorUserId, signal),
    enabled: Boolean(creatorUserId),
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 1,
  });

  const roomsQuery = useQuery({
    queryKey: ['creator', 'rooms'],
    queryFn: ({ signal }) => creatorApi.getRooms(signal),
    staleTime: 2_000,
    refetchInterval: 3_000,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['creator', 'schedule'] });
    void queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
  };

  const closeDialog = () => {
    setIsScheduleOpen(false);
    setEditingEvent(null);
    setTitle('');
    setScheduledDate('');
    setScheduledTime('');
  };

  const openCreate = () => {
    setActionError(null);
    setEditingEvent(null);
    setTitle('');
    setScheduledDate('');
    setScheduledTime('');
    setIsScheduleOpen(true);
  };

  const openEdit = (event: any) => {
    const local = localInputParts(event.scheduledStartTime);
    setActionError(null);
    setEditingEvent(event);
    setTitle(event.title || '');
    setScheduledDate(local.date);
    setScheduledTime(local.time);
    setIsScheduleOpen(true);
  };

  const schedulePayload = () => {
    const instant = localScheduleInstant(scheduledDate, scheduledTime);
    if (!instant) throw new Error('Select a valid local date and time for the broadcast.');
    return {
      title: title.trim(),
      scheduledStartTime: instant.toISOString(),
      timeZone: localTimeZone,
      category: editingEvent?.category || 'Audio Lounge',
      description: editingEvent?.description || 'Scheduled broadcast session',
    };
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = schedulePayload();
      return editingEvent?.id
        ? creatorApi.updateScheduledRoom(editingEvent.id, payload)
        : creatorApi.createScheduledRoom(payload);
    },
    onSuccess: () => {
      refresh();
      closeDialog();
      setActionError(null);
    },
    onError: (error: Error) => setActionError(error?.message || 'Scheduled broadcast could not be saved.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => creatorApi.deleteScheduledRoom(id),
    onSuccess: () => { refresh(); setActionError(null); },
    onError: (error: Error) => setActionError(error?.message || 'Scheduled broadcast could not be deleted.'),
  });

  const startMutation = useMutation({
    mutationFn: async (event: any) => {
      const latestRooms = await creatorApi.getRooms();
      let linked = latestRooms.find((room) => room.scheduledRoomId === event.id);
      if (!linked) {
        linked = await creatorApi.createRoom({
          title: event.title,
          category: event.category || 'Audio Lounge',
          description: event.description || 'Scheduled broadcast session',
          scheduledRoomId: event.id,
          isInviteOnly: Boolean(event.isInviteOnly),
          isPremium: Boolean(event.isPremium),
          ticketPriceAmount: Number(event.ticketPriceAmount || 0),
        });
      }
      if (linked.status !== 'live') await creatorApi.startBroadcast(linked.id);
      return linked.id;
    },
    onSuccess: () => { refresh(); setActionError(null); },
    onError: (error: Error) => setActionError(error?.message || 'Scheduled broadcast could not be started.'),
  });

  const pauseMutation = useMutation({
    mutationFn: async (roomId: string) => {
      if (liveMedia.roomId === roomId && liveMedia.microphoneEnabled) {
        await creatorLiveMediaService.stopSpeaking(roomId).catch(() => undefined);
      }
      return creatorApi.pauseRoom(roomId);
    },
    onSuccess: () => { refresh(); setActionError(null); },
    onError: (error: Error) => setActionError(error?.message || 'Broadcast could not be paused.'),
  });

  const resumeMutation = useMutation({
    mutationFn: (roomId: string) => creatorApi.resumeRoom(roomId),
    onSuccess: () => { refresh(); setActionError(null); },
    onError: (error: Error) => setActionError(error?.message || 'Broadcast could not be resumed.'),
  });

  const endMutation = useMutation({
    mutationFn: async (roomId: string) => {
      if (liveMedia.roomId === roomId) await creatorLiveMediaService.disconnect(roomId);
      return creatorApi.endBroadcast(roomId);
    },
    onSuccess: () => { refresh(); setActionError(null); },
    onError: (error: Error) => setActionError(error?.message || 'Broadcast could not be ended.'),
  });

  async function toggleMic(roomId: string) {
    setActionError(null);
    try {
      if (liveMedia.roomId === roomId && liveMedia.microphoneEnabled) {
        await creatorLiveMediaService.stopSpeaking(roomId);
      } else {
        await creatorLiveMediaService.startSpeaking(roomId);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Microphone could not be updated.');
    }
  }

  if (scheduleQuery.isLoading) {
    return <Box sx={{ p: 1 }}><LoadingSkeleton type="card" count={2} /></Box>;
  }
  if (scheduleQuery.isError) {
    return (
      <PageErrorState
        title="Failed to Load Schedule"
        message={scheduleQuery.error?.message || 'Unable to retrieve upcoming broadcast events.'}
        onRetry={() => scheduleQuery.refetch()}
      />
    );
  }

  const events = scheduleQuery.data || [];
  const liveRooms = roomsQuery.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Stream & Session Schedule</Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage future sessions. Times are shown in your local timezone: <strong>{localTimeZone}</strong>.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<Plus size={18} />} onClick={openCreate} sx={{ fontWeight: 700 }}>
          Schedule Broadcast
        </Button>
      </Box>

      {actionError ? <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert> : null}

      {events.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title="No Scheduled Broadcasts"
          description="You have no upcoming live sessions scheduled. Schedule one now to alert your subscribers."
          actionLabel="Schedule Session"
          onAction={openCreate}
        />
      ) : (
        <Grid container spacing={3}>
          {events.map((event: any, index: number) => {
            const linked = liveRooms.find((room) => room.scheduledRoomId === event.id);
            const linkedLive = linked?.status === 'live';
            const linkedPaused = linked?.status === 'paused';
            const status = scheduleStatus(event.status);
            const editable = status === 'scheduled' || status === 'postponed';
            const canStart = !linkedLive && !linkedPaused && !['cancelled', 'completed'].includes(status);
            const localStart = event.scheduledStartTime ? new Date(event.scheduledStartTime) : null;
            const micLive = Boolean(linked && liveMedia.roomId === linked.id && liveMedia.microphoneEnabled);

            return (
              <Grid key={event.id || index} size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%', borderColor: linkedLive ? 'primary.main' : 'divider' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip label={event.category || 'Audio Lounge'} color="primary" size="small" />
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip
                          size="small"
                          label={linkedLive ? '🔴 LIVE' : linkedPaused ? '⏸ PAUSED' : status.toUpperCase()}
                          color={linkedLive ? 'error' : linkedPaused ? 'warning' : 'default'}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Bell size={14} /> {event.rsvpCount ?? 0} reminders
                        </Typography>
                      </Stack>
                    </Stack>

                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{event.title}</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Calendar size={16} /> {localStart ? localStart.toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock size={16} /> {localStart ? localStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{localTimeZone}</Typography>
                    </Stack>

                    <Box sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                      <Grid container spacing={1}>
                        {canStart ? (
                          <Grid size={{ xs: 12, sm: editable ? 6 : 12 }}>
                            <Button
                              fullWidth
                              size="large"
                              variant="contained"
                              startIcon={<Play size={17} />}
                              disabled={startMutation.isPending}
                              onClick={() => startMutation.mutate(event)}
                              sx={{ fontWeight: 800, minHeight: 48, borderRadius: 2 }}
                            >
                              {startMutation.isPending ? 'Starting…' : linked ? 'Start Linked Broadcast' : 'Create & Start Broadcast'}
                            </Button>
                          </Grid>
                        ) : null}
                        {editable && !linkedLive && !linkedPaused ? (
                          <Grid size={{ xs: 12, sm: canStart ? 6 : 12 }}>
                            <Button fullWidth size="large" variant="outlined" startIcon={<Edit3 size={17} />} onClick={() => openEdit(event)} sx={{ fontWeight: 800, minHeight: 48, borderRadius: 2 }}>
                              Edit Date & Time
                            </Button>
                          </Grid>
                        ) : null}

                        {linkedLive || linkedPaused ? (
                          <>
                            <Grid size={{ xs: 6 }}>
                              {linkedLive ? (
                                <Button fullWidth size="large" variant="outlined" color="warning" startIcon={<Pause size={16} />} onClick={() => pauseMutation.mutate(linked!.id)} disabled={pauseMutation.isPending}>
                                  Pause
                                </Button>
                              ) : (
                                <Button fullWidth size="large" variant="contained" color="success" startIcon={<Play size={16} />} onClick={() => resumeMutation.mutate(linked!.id)} disabled={resumeMutation.isPending}>
                                  Resume
                                </Button>
                              )}
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Button fullWidth size="large" variant="contained" color="error" startIcon={<Square size={16} />} onClick={() => endMutation.mutate(linked!.id)} disabled={endMutation.isPending}>
                                End
                              </Button>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Button
                                fullWidth
                                variant={micLive ? 'outlined' : 'contained'}
                                color={micLive ? 'warning' : 'success'}
                                startIcon={micLive ? <MicOff size={16} /> : <Mic size={16} />}
                                disabled={linkedPaused || liveMedia.connecting}
                                onClick={() => void toggleMic(linked!.id)}
                              >
                                {linkedPaused ? 'Speaking Paused' : micLive ? 'Mute Mic' : 'Start Speaking'}
                              </Button>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Button fullWidth size="large" variant="outlined" startIcon={<SlidersHorizontal size={16} />} onClick={() => navigate(`/rooms/${linked!.id}/live`)}>
                                Open Console
                              </Button>
                            </Grid>
                          </>
                        ) : null}
                      </Grid>
                    </Box>

                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Users size={14} /> {event.rsvpCount ?? 0} RSVPs
                      </Typography>
                      <Tooltip title={editable ? 'Delete scheduled broadcast' : 'Only upcoming schedules can be deleted'}>
                        <span>
                          <IconButton color="error" onClick={() => deleteMutation.mutate(event.id)} disabled={!editable || deleteMutation.isPending || linkedLive || linkedPaused} size="small">
                            <Trash2 size={16} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={isScheduleOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingEvent ? 'Edit Scheduled Broadcast' : 'Schedule Future Broadcast'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Broadcast Title" placeholder="e.g. VIP Member Q&A Hour" fullWidth value={title} onChange={(event) => setTitle(event.target.value)} />
            <TextField label={`Date (${localTimeZone})`} type="date" slotProps={{ inputLabel: { shrink: true } }} fullWidth value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} />
            <TextField label={`Time (${localTimeZone})`} type="time" slotProps={{ inputLabel: { shrink: true } }} fullWidth value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} />
            <Alert severity="info">VoiceCloud stores the instant in UTC internally and automatically displays it in each viewer's local timezone.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate()}
            disabled={!title.trim() || !scheduledDate || !scheduledTime || saveMutation.isPending}
            sx={{ fontWeight: 700 }}
          >
            {saveMutation.isPending ? <CircularProgress size={20} /> : editingEvent ? 'Save Changes' : 'Save Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
