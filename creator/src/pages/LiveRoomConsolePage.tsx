import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Grid,
  IconButton, List, ListItem, ListItemAvatar, ListItemText, Paper, Stack,
  TextField, Tooltip, Typography, Avatar,
} from '@mui/material';
import {
  ArrowLeft, Headphones, MessageCircle, Mic, MicOff, Pause, Play, Radio,
  RefreshCw, Send, Smile, Square, Users, UserPlus, UserMinus, Volume2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { useAuthStore } from '../store/auth.store';
import { connectCreatorRoomRealtime, CreatorRoomRealtime } from '../services/live-room-realtime.service';
import { creatorLiveMediaService, useCreatorLiveMedia } from '../services/creator-live-media.service';

const ROOM_EVENTS = [
  'user_joined','user_left','user_reconnected','presence_updated','participant_joined',
  'participant_left','participant_reconnected','speaker_joined','speaker_left','hand_raised',
  'hand_approved','hand_rejected','microphone_muted','microphone_unmuted','stage_updated',
  'room.started','room.paused','room.resumed','room.ended',
];

function messagesFrom(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export const LiveRoomConsolePage: React.FC = () => {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const creator = useAuthStore((s) => s.user);
  const creatorUserId = useAuthStore((s) => s.user?.id || s.userId);
  const realtimeRef = useRef<CreatorRoomRealtime | null>(null);
  const chatStreamRef = useRef<HTMLDivElement | null>(null);
  const liveMedia = useCreatorLiveMedia();
  const [reactionFeed, setReactionFeed] = useState<Array<{ emoji: string; username?: string; timestamp: string }>>([]);
  const [messageText, setMessageText] = useState('');
  const [runtimeError, setRuntimeError] = useState('');

  const room = useQuery({
    queryKey: ['creator','room-console',roomId,'room'],
    queryFn: () => creatorApi.getRoom(roomId),
    enabled: Boolean(roomId),
    refetchInterval: 2500,
  });
  const stage = useQuery({
    queryKey: ['creator','room-console',roomId,'stage'],
    queryFn: () => creatorApi.getRoomStage(roomId),
    enabled: Boolean(roomId && room.data && ['live','paused'].includes(room.data.status)),
    refetchInterval: 2000,
  });
  const participantIds = useMemo(
    () => Array.from(new Set((stage.data?.participants || []).map((p) => p.userId).filter(Boolean))),
    [stage.data?.participants],
  );
  const profiles = useQueries({
    queries: participantIds.map((id) => ({
      queryKey: ['creator','room-console','profile',id],
      queryFn: () => creatorApi.getUserProfileById(id),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const profileMap = useMemo(() => {
    const map = new Map<string, any>();
    profiles.forEach((q) => { if (q.data?.id) map.set(q.data.id, q.data); });
    return map;
  }, [profiles]);

  const conversation = useQuery({
    queryKey: ['creator','room-console',roomId,'conversation'],
    queryFn: () => creatorApi.getRoomConversation(roomId, room.data?.title),
    enabled: Boolean(roomId && room.data && ['live','paused'].includes(room.data.status)),
    staleTime: Infinity,
  });
  const messages = useQuery({
    queryKey: ['creator','room-console',roomId,'messages',conversation.data?.id],
    queryFn: () => creatorApi.getRoomMessages(conversation.data!.id),
    enabled: Boolean(conversation.data?.id),
    refetchInterval: 3000,
  });
  const sendMessage = useMutation({
    mutationFn: (content: string) => creatorApi.sendRoomMessage(conversation.data!.id, content),
    onSuccess: () => {
      setMessageText('');
      void qc.invalidateQueries({ queryKey: ['creator','room-console',roomId,'messages'] });
    },
  });

  const pause = useMutation({
    mutationFn: async () => {
      if (liveMedia.roomId === roomId && liveMedia.microphoneEnabled) {
        await creatorLiveMediaService.stopSpeaking(roomId).catch(() => undefined);
      }
      return creatorApi.pauseRoom(roomId);
    },
    onSuccess: () => {
      setRuntimeError('');
      void room.refetch();
      void qc.invalidateQueries({ queryKey: ['creator','rooms'] });
    },
    onError: (error: Error) => setRuntimeError(error?.message || 'Unable to pause broadcast'),
  });
  const resume = useMutation({
    mutationFn: () => creatorApi.resumeRoom(roomId),
    onSuccess: () => {
      setRuntimeError('');
      void room.refetch();
      void qc.invalidateQueries({ queryKey: ['creator','rooms'] });
    },
    onError: (error: Error) => setRuntimeError(error?.message || 'Unable to resume broadcast'),
  });
  const end = useMutation({
    mutationFn: async () => {
      await creatorLiveMediaService.disconnect(roomId).catch(() => undefined);
      await realtimeRef.current?.leave(roomId).catch(() => undefined);
      return creatorApi.endBroadcast(roomId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['creator','rooms'] });
      navigate('/rooms');
    },
  });
  const approve = useMutation({
    mutationFn: (userId: string) => creatorApi.approveSpeaker(roomId, userId),
    onSuccess: () => void stage.refetch(),
  });
  const reject = useMutation({
    mutationFn: (userId: string) => creatorApi.rejectSpeaker(roomId, userId),
    onSuccess: () => void stage.refetch(),
  });
  const invite = useMutation({
    mutationFn: (userId: string) => creatorApi.inviteSpeaker(roomId, userId),
    onSuccess: () => void stage.refetch(),
  });
  const removeSpeaker = useMutation({
    mutationFn: (userId: string) => creatorApi.removeSpeaker(roomId, userId),
    onSuccess: () => void stage.refetch(),
  });
  const muteSpeaker = useMutation({
    mutationFn: ({ userId, mute }: { userId: string; mute: boolean }) => creatorApi.muteSpeaker(roomId, userId, mute),
    onSuccess: () => void stage.refetch(),
  });

  const roomRuntimeActive = Boolean(room.data && ['live','paused'].includes(room.data.status));

  useEffect(() => {
    if (!roomId || !roomRuntimeActive) return;
    let cancelled = false;
    const realtime = connectCreatorRoomRealtime();
    realtimeRef.current = realtime;

    const refresh = (payload?: any) => {
      if (!payload?.roomId || payload.roomId === roomId) {
        void stage.refetch();
        void room.refetch();
        void qc.invalidateQueries({ queryKey: ['creator','rooms'] });
      }
    };
    const reaction = (payload: any) => {
      if (payload?.roomId !== roomId) return;
      setReactionFeed((items) => [
        ...items.slice(-39),
        {
          emoji: payload.emoji,
          username: payload.username || 'VoiceCloud user',
          timestamp: payload.timestamp || new Date().toISOString(),
        },
      ]);
    };
    const chatMessage = (payload: any) => {
      if (payload?.roomId && payload.roomId !== roomId) return;
      if (conversation.data?.id && payload?.conversationId && payload.conversationId !== conversation.data.id) return;
      qc.setQueryData(
        ['creator','room-console',roomId,'messages',conversation.data?.id],
        (current: any) => {
          if (!current) return { messages: [payload], total: 1, page: 1, limit: 100 };
          const list = messagesFrom(current);
          if (list.some((message) => message.id === payload?.id)) return current;
          const next = [...list, payload];
          return Array.isArray(current)
            ? next
            : { ...current, messages: next, total: Math.max(Number(current.total || 0) + 1, next.length) };
        },
      );
    };
    const chatRefresh = (payload?: any) => {
      if (!payload?.roomId || payload.roomId === roomId || payload?.conversationId === conversation.data?.id) {
        void messages.refetch();
      }
    };
    ROOM_EVENTS.forEach((event) => realtime.socket.on(event, refresh));
    realtime.socket.on('reaction:broadcast', reaction);
    realtime.socket.on('chat_message', chatMessage);
    ['chat_message_updated','chat_message_deleted','chat_reaction_added','chat_reaction_removed'].forEach((event) => realtime.socket.on(event, chatRefresh));

    void (async () => {
      try {
        await realtime.join(roomId, creator?.username);
        if (cancelled) return;
        await creatorLiveMediaService.ensureConnected(roomId);
      } catch (error) {
        if (!cancelled) {
          setRuntimeError(error instanceof Error ? error.message : 'Unable to initialize live room runtime');
        }
      }
    })();

    return () => {
      cancelled = true;
      ROOM_EVENTS.forEach((event) => realtime.socket.off(event, refresh));
      realtime.socket.off('reaction:broadcast', reaction);
      realtime.socket.off('chat_message', chatMessage);
      ['chat_message_updated','chat_message_deleted','chat_reaction_added','chat_reaction_removed'].forEach((event) => realtime.socket.off(event, chatRefresh));
      void realtime.leave(roomId).catch(() => undefined);
      realtime.disconnect();
      realtimeRef.current = null;
      // The shared creator media session intentionally survives navigation between
      // room management and this console. Explicit End Broadcast/log-out owns disconnect.
    };
  }, [roomId, roomRuntimeActive, conversation.data?.id, creator?.username, qc]);

  useEffect(() => {
    const element = chatStreamRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  }, [messages.data]);

  async function toggleMic() {
    try {
      setRuntimeError('');
      if (liveMedia.roomId === roomId && liveMedia.microphoneEnabled) {
        await creatorLiveMediaService.stopSpeaking(roomId);
      } else {
        await creatorLiveMediaService.startSpeaking(roomId);
      }
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'Microphone could not be enabled');
    }
  }


  if (room.isLoading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (room.isError || !room.data) return <Alert severity="error">{room.error instanceof Error ? room.error.message : 'Unable to load live room'}</Alert>;

  const data = room.data;
  const isLive = data.status === 'live';
  const isPaused = data.status === 'paused';
  const participants = stage.data?.participants || [];
  const listeners = participants.filter((p) => !['host','co_host','moderator','speaker'].includes(String(p.role || '').toLowerCase()));
  const speakers = stage.data?.speakers || [];
  const handQueue = stage.data?.handQueue || [];
  const messageList = messagesFrom(messages.data);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ justifyContent: 'space-between', gap: 2 }}
      >
        <Box>
          <Button
            startIcon={<ArrowLeft size={17} />}
            onClick={() => navigate('/rooms')}
            sx={{ mb: 1 }}
          >
            Back to rooms
          </Button>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {data.title}
            </Typography>
            <Chip
              color={isLive ? 'error' : isPaused ? 'warning' : 'default'}
              label={String(data.status).toUpperCase()}
            />
          </Stack>
          <Typography color="text.secondary">
            Live control console · RTC media, audience, stage, chat and reactions
          </Typography>
        </Box>

        <Stack
          direction="row"
          sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
        >
          {isLive ? (
            <Button
              color="warning"
              variant="outlined"
              startIcon={<Pause />}
              onClick={() => pause.mutate()}
              disabled={pause.isPending}
            >
              Pause
            </Button>
          ) : null}
          {isPaused ? (
            <Button
              color="success"
              variant="contained"
              startIcon={<Play />}
              onClick={() => resume.mutate()}
              disabled={resume.isPending}
            >
              Resume
            </Button>
          ) : null}
          <Button
            color="error"
            variant="contained"
            startIcon={<Square />}
            onClick={() => end.mutate()}
            disabled={end.isPending}
          >
            End Broadcast
          </Button>
        </Stack>
      </Stack>

      {runtimeError ? (
        <Alert severity="error" onClose={() => setRuntimeError('')}>
          {runtimeError}
        </Alert>
      ) : null}
      {liveMedia.state === 'error' ? (
        <Alert severity="warning">{liveMedia.detail}</Alert>
      ) : null}
      {liveMedia.state === 'playback-blocked' ? (
        <Alert
          severity="info"
          action={
            <Button onClick={() => void creatorLiveMediaService.startAudio()}>
              Enable Audio
            </Button>
          }
        >
          {liveMedia.detail}
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography sx={{ fontWeight: 800 }}>
                  Host microphone
                </Typography>
                <Radio size={19} />
              </Stack>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                Starting a broadcast does not automatically open your microphone.
                Use this control to publish or mute your voice.
              </Typography>
              <Button
                fullWidth
                sx={{ mt: 2 }}
                variant="contained"
                color={liveMedia.roomId === roomId && liveMedia.microphoneEnabled ? 'warning' : 'success'}
                startIcon={liveMedia.roomId === roomId && liveMedia.microphoneEnabled ? <MicOff /> : <Mic />}
                onClick={() => void toggleMic()}
                disabled={
                  !isLive ||
                  liveMedia.connecting
                }
              >
                {liveMedia.roomId === roomId && liveMedia.microphoneEnabled ? 'Mute Microphone' : 'Start Speaking'}
              </Button>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Chip
                  size="small"
                  color={liveMedia.roomId === roomId && liveMedia.microphoneEnabled ? 'success' : 'default'}
                  icon={liveMedia.roomId === roomId && liveMedia.microphoneEnabled ? <Volume2 size={14} /> : <MicOff size={14} />}
                  label={liveMedia.roomId === roomId && liveMedia.microphoneEnabled ? 'Mic publishing' : 'Mic off'}
                />
                <Chip
                  size="small"
                  label={liveMedia.roomId === roomId ? liveMedia.provider || 'RTC pending' : 'RTC idle'}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 800, mb: 2 }}>
                Live room status
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Headphones />
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {listeners.length}
                    </Typography>
                    <Typography variant="caption">Listeners</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Users />
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {participants.length}
                    </Typography>
                    <Typography variant="caption">Present</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Mic />
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {speakers.length}
                    </Typography>
                    <Typography variant="caption">On stage</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <UserPlus />
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {handQueue.length}
                    </Typography>
                    <Typography variant="caption">Hand requests</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Audience & stage
                </Typography>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => void stage.refetch()}>
                    <RefreshCw size={18} />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Divider sx={{ my: 1.5 }} />

              {isPaused ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Broadcast is paused. Speaker invitations, hand approvals, chat and live reactions resume when the room goes live again.
                </Alert>
              ) : null}
              {handQueue.length ? (
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>
                    Raised hands
                  </Typography>
                  {handQueue.map((request) => {
                    const profile = profileMap.get(request.userId);
                    return (
                      <Paper
                        key={request.userId}
                        variant="outlined"
                        sx={{ p: 1.5, mb: 1 }}
                      >
                        <Stack
                          direction="row"
                          sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center', minWidth: 0 }}
                          >
                            <Avatar src={profile?.avatarUrl}>
                              {(profile?.displayName || '?').slice(0, 1)}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 700 }}>
                                {profile?.displayName ||
                                  profile?.username ||
                                  'VoiceCloud user'}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Requested speaker seat {request.seatIndex || 1}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" sx={{ gap: 1 }}>
                            <Button
                              size="small"
                              color="success"
                              variant="contained"
                              onClick={() => approve.mutate(request.userId)}
                              disabled={!isLive || approve.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => reject.mutate(request.userId)}
                              disabled={!isLive || reject.isPending}
                            >
                              Reject
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Box>
              ) : null}

              <List dense>
                {participants.map((participant) => {
                  const profile = profileMap.get(participant.userId);
                  const speaker = speakers.find(
                    (item) => item.userId === participant.userId,
                  );
                  const isHost =
                    participant.userId === creatorUserId ||
                    String(participant.role).toLowerCase() === 'host';

                  const secondaryAction = isHost ? undefined : speaker ? (
                    <Stack direction="row">
                      <Tooltip
                        title={speaker.isMuted ? 'Unmute speaker' : 'Mute speaker'}
                      >
                        <IconButton
                          disabled={!isLive || muteSpeaker.isPending}
                          onClick={() =>
                            muteSpeaker.mutate({
                              userId: participant.userId,
                              mute: !speaker.isMuted,
                            })
                          }
                        >
                          {speaker.isMuted ? (
                            <MicOff size={17} />
                          ) : (
                            <Mic size={17} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Move to audience">
                        <IconButton
                          color="error"
                          disabled={!isLive || removeSpeaker.isPending}
                          onClick={() =>
                            removeSpeaker.mutate(participant.userId)
                          }
                        >
                          <UserMinus size={17} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ) : (
                    <Tooltip title="Invite listener to the speaker stage">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<UserPlus size={15} />}
                        onClick={() => invite.mutate(participant.userId)}
                        disabled={!isLive || invite.isPending}
                      >
                        Invite to stage
                      </Button>
                    </Tooltip>
                  );

                  return (
                    <ListItem
                      key={participant.userId}
                      secondaryAction={secondaryAction}
                    >
                      <ListItemAvatar>
                        <Avatar src={profile?.avatarUrl}>
                          {(profile?.displayName ||
                            profile?.username ||
                            '?').slice(0, 1)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          profile?.displayName ||
                          profile?.username ||
                          'VoiceCloud user'
                        }
                        secondary={`${participant.role || 'listener'}${
                          speaker?.isMuted || participant.isMuted ? ' · muted' : participant.isSpeaking ? ' · speaking' : ''
                        }`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <MessageCircle size={18} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Room chat
                  </Typography>
                </Stack>
                <Box
                  ref={chatStreamRef}
                  sx={{
                    height: 310,
                    overflowY: 'auto',
                    mt: 1.5,
                    pr: 0.75,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  {messageList.length ? (
                    messageList.map((message: any) => {
                      const senderId = message.senderId || message.sender?.id || message.sender?.userId;
                      const mine = Boolean(creatorUserId && senderId === creatorUserId);
                      return (
                        <Box
                          key={message.id}
                          sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}
                        >
                          <Box
                            sx={{
                              maxWidth: '82%',
                              px: 1.5,
                              py: 1,
                              borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              bgcolor: mine ? 'primary.main' : 'background.default',
                              color: mine ? 'primary.contrastText' : 'text.primary',
                              border: mine ? 'none' : '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ opacity: 0.78, display: 'block', mb: 0.25 }}
                            >
                              {mine ? 'You' : message.sender?.displayName || message.sender?.username || 'VoiceCloud user'}
                            </Typography>
                            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                              {message.content}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      No messages yet.
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={isPaused ? 'Chat is paused until broadcast resumes' : 'Send a message as host'}
                    value={messageText}
                    disabled={isPaused || sendMessage.isPending}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isLive && messageText.trim()) {
                        sendMessage.mutate(messageText.trim());
                      }
                    }}
                  />
                  <IconButton
                    color="primary"
                    disabled={!isLive || sendMessage.isPending || !messageText.trim()}
                    onClick={() =>
                      isLive && messageText.trim() &&
                      sendMessage.mutate(messageText.trim())
                    }
                  >
                    <Send />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Smile size={18} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Live reactions
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  sx={{ flexWrap: 'wrap', gap: 1, mt: 1.5 }}
                >
                  {reactionFeed.length ? (
                    reactionFeed
                      .slice(-18)
                      .map((reaction, index) => (
                        <Chip
                          key={`${reaction.timestamp}-${index}`}
                          label={`${reaction.username || 'VoiceCloud user'} ${reaction.emoji}`}
                        />
                      ))
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      Listener emoji reactions will appear here in real time.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};
