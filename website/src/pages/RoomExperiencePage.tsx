import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Hand,
  Headphones,
  LogOut,
  Mic,
  MicOff,
  Radio,
  RefreshCw,
  ShieldCheck,
  Users,
  Volume2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';
import { RoomChatPanel } from '@/components/rooms/RoomChatPanel';
import { RoomParticipantsPanel } from '@/components/rooms/RoomParticipantsPanel';
import { RoomReactionBar } from '@/components/rooms/RoomReactionBar';
import { isConsumerVisibleUser } from '@/features/discovery/consumer-users';
import { profileApi } from '@/features/discovery/discovery.api';
import { roomArtwork } from '@/features/discovery/presentation';
import type { VoiceCloudRoom, VoiceCloudUser } from '@/features/discovery/types';
import { roomAccessIssue } from '@/features/rooms/room-access';
import { roomApi } from '@/features/rooms/room.api';
import {
  cancelScheduledRoomLeave,
  establishRoomRuntime,
  leaveRoomRuntime,
  reconnectRoomRuntime,
  scheduleRoomLeave,
} from '@/features/rooms/room-runtime';
import { useRoomSessionStore } from '@/features/rooms/room-session.store';
import { sendRoomReaction } from '@/features/rooms/room-realtime';
import type { RoomParticipantView, RoomReactionEvent } from '@/features/rooms/types';
import { connectWebsiteSocket } from '@/realtime/socket.client';
import {
  connectLiveKitAudio,
  type BrowserRtcSession,
  type BrowserAudioState,
} from '@shared/rtc/livekit-browser';

const STAGE_ROLES = new Set(['host', 'co_host', 'moderator', 'speaker']);

function eventTargetsUser(payload: any, userId?: string): boolean {
  if (!userId) return false;
  return payload?.targetUserId === userId || payload?.userId === userId;
}

export function RoomExperiencePage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentUser = useWebsiteAuthStore((s) => s.user);
  const rtc = useRoomSessionStore((s) => s.rtc);
  const connectionState = useRoomSessionStore((s) => s.connectionState);
  const accessIssue = useRoomSessionStore((s) => s.accessIssue);
  const reactions = useRoomSessionStore((s) => s.reactions);
  const beginJoin = useRoomSessionStore((s) => s.beginJoin);
  const setConnected = useRoomSessionStore((s) => s.setConnected);
  const setSocketJoined = useRoomSessionStore((s) => s.setSocketJoined);
  const setReconnecting = useRoomSessionStore((s) => s.setReconnecting);
  const setFailure = useRoomSessionStore((s) => s.setFailure);
  const addReaction = useRoomSessionStore((s) => s.addReaction);
  const reset = useRoomSessionStore((s) => s.reset);

  const reconnectingRef = useRef(false);
  const endedRef = useRef(false);
  const mediaRef = useRef<BrowserRtcSession | null>(null);
  const [audioState, setAudioState] = useState<BrowserAudioState>('idle');
  const [audioDetail, setAudioDetail] = useState('');
  const [handRaised, setHandRaised] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [stageNotice, setStageNotice] = useState('');

  const room = useQuery({
    queryKey: ['ph05', 'room', roomId],
    queryFn: () => roomApi.detail(roomId),
    enabled: Boolean(roomId),
    refetchInterval: 5_000,
  });
  const participants = useQuery({
    queryKey: ['ph05', 'room', roomId, 'participants'],
    queryFn: () => roomApi.participants(roomId),
    enabled: Boolean(roomId && connectionState === 'connected'),
    refetchInterval: 4_000,
  });
  const ids = useMemo(
    () => Array.from(new Set((participants.data?.participants ?? []).map((p) => p.userId).filter(Boolean))),
    [participants.data],
  );
  const profileQueries = useQueries({
    queries: ids.map((userId) => ({
      queryKey: ['ph05', 'participant-profile', userId],
      queryFn: () => profileApi.byId(userId),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const profileMap = useMemo(
    () => new Map(profileQueries.flatMap((q) => (q.data ? [[q.data.id, q.data] as const] : []))),
    [profileQueries],
  );
  const participantViews = useMemo<RoomParticipantView[]>(() => {
    return (participants.data?.participants ?? []).flatMap((p) => {
      const profile = profileMap.get(p.userId);
      if (profile && !isConsumerVisibleUser(profile as VoiceCloudUser) && p.userId !== room.data?.hostId) return [];
      return [{
        ...p,
        displayName: profile?.displayName,
        username: profile?.username ?? p.username,
        avatarUrl: profile?.avatarUrl,
        isVerified: profile?.isVerified,
      }];
    });
  }, [participants.data, profileMap, room.data?.hostId]);

  const conversation = useQuery({
    queryKey: ['ph05', 'room', roomId, 'conversation'],
    queryFn: () => roomApi.roomConversation(roomId, room.data?.title),
    enabled: Boolean(roomId && room.data && connectionState === 'connected'),
  });
  const messages = useQuery({
    queryKey: ['ph05', 'room', roomId, 'messages', conversation.data?.id],
    queryFn: () => roomApi.roomMessages(conversation.data!.id),
    enabled: Boolean(conversation.data?.id),
    refetchInterval: 6_000,
  });
  const sendMessage = useMutation({
    mutationFn: (content: string) => roomApi.sendRoomMessage(conversation.data!.id, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ph05', 'room', roomId, 'messages'] }),
  });
  const reactMessage = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) => roomApi.addMessageReaction(messageId, emoji),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ph05', 'room', roomId, 'messages'] }),
  });
  const raiseHand = useMutation({
    mutationFn: () => roomApi.raiseHand(roomId),
    onSuccess: () => {
      setHandRaised(true);
      setStageNotice('Your hand is raised. The host can approve you for the stage.');
      void participants.refetch();
    },
  });
  const cancelHand = useMutation({
    mutationFn: () => roomApi.cancelRaiseHand(roomId),
    onSuccess: () => {
      setHandRaised(false);
      setStageNotice('Speaker request cancelled.');
      void participants.refetch();
    },
  });

  const role = String(rtc?.role || 'listener').toLowerCase();
  const canSpeak = STAGE_ROLES.has(role);
  const currentParticipant = useMemo(
    () => participantViews.find((participant) => participant.userId === currentUser?.id),
    [participantViews, currentUser?.id],
  );
  const mutedByHost = Boolean(currentParticipant?.isMuted);

  async function establish() {
    if (!roomId) return;
    beginJoin(roomId);
    try {
      cancelScheduledRoomLeave(roomId);
      const joined = await establishRoomRuntime(roomId, currentUser?.username, rtc?.roomId === roomId ? rtc : null);
      setConnected(joined);
      setSocketJoined(true);
    } catch (error) {
      setFailure(roomAccessIssue(error));
    }
  }

  async function reconnect() {
    if (!roomId || reconnectingRef.current) return;
    reconnectingRef.current = true;
    setReconnecting();
    try {
      const joined = await reconnectRoomRuntime(roomId, rtc?.token);
      setConnected(joined);
      setSocketJoined(true);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['ph05', 'room', roomId] }),
        qc.invalidateQueries({ queryKey: ['ph05', 'room', roomId, 'participants'] }),
      ]);
    } catch (error) {
      setFailure(roomAccessIssue(error));
    } finally {
      reconnectingRef.current = false;
    }
  }

  async function refreshAuthoritativeRtcRole(notice?: string) {
    if (!roomId) return;
    try {
      const joined = await roomApi.rejoin(roomId, useRoomSessionStore.getState().rtc?.token);
      setConnected(joined);
      if (notice) setStageNotice(notice);
      await participants.refetch();
    } catch (error) {
      setStageNotice(error instanceof Error ? error.message : 'VoiceCloud could not refresh your stage role.');
    }
  }

  async function closeEndedRoom() {
    if (endedRef.current) return;
    endedRef.current = true;
    setStageNotice('This broadcast has ended. Returning to live rooms…');
    try {
      await mediaRef.current?.disableMicrophone().catch(() => undefined);
      await mediaRef.current?.disconnect().catch(() => undefined);
      mediaRef.current = null;
      await leaveRoomRuntime(roomId).catch(() => undefined);
    } finally {
      reset();
      navigate('/rooms', { replace: true, state: { notice: 'The live broadcast ended.' } });
    }
  }

  useEffect(() => {
    cancelScheduledRoomLeave(roomId);
    if (connectionState === 'idle' || rtc?.roomId !== roomId) {
      void establish();
    } else if (connectionState === 'connected') {
      void establishRoomRuntime(roomId, currentUser?.username, rtc)
        .then(() => setSocketJoined(true))
        .catch((error) => setFailure(roomAccessIssue(error)));
    }
    return () => scheduleRoomLeave(roomId);
    // Runtime establishment is intentionally keyed to the route room identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;
    setMicEnabled(false);
    void mediaRef.current?.disconnect().catch(() => undefined);
    mediaRef.current = null;
    if (!rtc?.token) return;
    if (rtc.provider !== 'livekit' || !rtc.serverUrl) {
      setAudioState('error');
      setAudioDetail(`Real room audio requires an active LiveKit provider. Current provider: ${rtc.provider || 'unknown'}.`);
      return;
    }
    void connectLiveKitAudio({
      serverUrl: rtc.serverUrl,
      token: rtc.token,
      publishMicrophone: false,
      onState: (state, detail) => {
        if (!cancelled) {
          setAudioState(state);
          setAudioDetail(detail || '');
        }
      },
    })
      .then((session) => {
        if (cancelled) void session.disconnect();
        else mediaRef.current = session;
      })
      .catch((error) => {
        if (!cancelled) {
          setAudioState('error');
          setAudioDetail(error instanceof Error ? error.message : 'Unable to connect room audio');
        }
      });
    return () => {
      cancelled = true;
      void mediaRef.current?.disconnect().catch(() => undefined);
      mediaRef.current = null;
    };
  }, [rtc?.token, rtc?.serverUrl, rtc?.provider]);

  useEffect(() => {
    const socket = connectWebsiteSocket();
    const refreshParticipants = (payload?: any) => {
      if (!payload?.roomId || payload.roomId === roomId) {
        void qc.invalidateQueries({ queryKey: ['ph05', 'room', roomId, 'participants'] });
        void qc.invalidateQueries({ queryKey: ['ph05', 'room', roomId] });
      }
    };
    const receiveMessage = (payload?: any) => {
      if (payload?.roomId && payload.roomId !== roomId) return;
      if (conversation.data?.id && payload?.conversationId && payload.conversationId !== conversation.data.id) return;
      qc.setQueryData(
        ['ph05', 'room', roomId, 'messages', conversation.data?.id],
        (current: any) => {
          if (!current) return { messages: [payload], total: 1, page: 1, limit: 100 };
          const list = Array.isArray(current) ? current : Array.isArray(current.messages) ? current.messages : [];
          if (list.some((message: any) => message.id === payload?.id)) return current;
          const next = [...list, payload];
          return Array.isArray(current)
            ? next
            : { ...current, messages: next, total: Math.max(Number(current.total || 0) + 1, next.length) };
        },
      );
    };
    const refreshMessages = (payload?: any) => {
      if (!payload?.roomId || payload.roomId === roomId || payload?.conversationId === conversation.data?.id) {
        void qc.invalidateQueries({ queryKey: ['ph05', 'room', roomId, 'messages'] });
      }
    };
    const reaction = (payload: RoomReactionEvent) => {
      if (payload?.roomId === roomId) addReaction(payload);
    };
    const disconnected = () => {
      if (useRoomSessionStore.getState().roomId === roomId) setReconnecting();
    };
    const connected = () => {
      if (useRoomSessionStore.getState().connectionState === 'reconnecting') void reconnect();
    };
    const approved = (payload: any) => {
      if (payload?.roomId !== roomId || !eventTargetsUser(payload, currentUser?.id)) return;
      setHandRaised(false);
      void refreshAuthoritativeRtcRole('You are on stage. Click Start Speaking when you are ready.');
    };
    const rejected = (payload: any) => {
      if (payload?.roomId !== roomId || !eventTargetsUser(payload, currentUser?.id)) return;
      setHandRaised(false);
      setStageNotice(payload?.reason === 'cancelled_by_user' ? 'Speaker request cancelled.' : 'The host did not approve this speaker request.');
      void participants.refetch();
    };
    const removed = (payload: any) => {
      if (payload?.roomId !== roomId || !eventTargetsUser(payload, currentUser?.id)) return;
      void mediaRef.current?.disableMicrophone().catch(() => undefined);
      setMicEnabled(false);
      void refreshAuthoritativeRtcRole('You were moved back to the audience.');
    };
    const muted = (payload: any) => {
      if (payload?.roomId !== roomId || !eventTargetsUser(payload, currentUser?.id)) return;
      if (payload?.isMuted !== false) {
        void mediaRef.current?.disableMicrophone().catch(() => undefined);
        setMicEnabled(false);
        setStageNotice('The host muted your microphone.');
      }
      void participants.refetch();
    };
    const unmuted = (payload: any) => {
      if (payload?.roomId !== roomId || !eventTargetsUser(payload, currentUser?.id)) return;
      setStageNotice('The host unmuted your stage permission. Click Start Speaking when you are ready.');
      void participants.refetch();
    };
    const roomPaused = (payload: any) => {
      if (payload?.roomId !== roomId) return;
      qc.setQueryData(['ph05', 'room', roomId], (current: any) => current ? { ...current, status: 'paused' } : current);
      void mediaRef.current?.disableMicrophone().catch(() => undefined);
      setMicEnabled(false);
      void roomApi.reportSpeakingState(roomId, false).catch(() => undefined);
      setStageNotice('Broadcast paused by the host. Chat, reactions and speaker actions are temporarily disabled.');
    };
    const roomResumed = (payload: any) => {
      if (payload?.roomId !== roomId) return;
      qc.setQueryData(['ph05', 'room', roomId], (current: any) => current ? { ...current, status: 'live' } : current);
      setStageNotice('Broadcast resumed. Live interactions are available again.');
      void participants.refetch();
    };
    const roomEnded = (payload: any) => {
      if (payload?.roomId !== roomId) return;
      qc.setQueryData(['ph05', 'room', roomId], (current: any) => current ? { ...current, status: 'ended' } : current);
      void closeEndedRoom();
    };

    const roomEvents = [
      'user_joined', 'user_left', 'user_reconnected', 'presence_updated',
      'participant_joined', 'participant_left', 'participant_reconnected', 'stage_updated',
      'speaker_joined', 'speaker_left', 'hand_raised', 'hand_rejected', 'hand_approved',
    ];
    roomEvents.forEach((event) => socket.on(event, refreshParticipants));
    socket.on('chat_message', receiveMessage);
    socket.on('chat_message_updated', refreshMessages);
    socket.on('chat_message_deleted', refreshMessages);
    socket.on('chat_reaction_added', refreshMessages);
    socket.on('chat_reaction_removed', refreshMessages);
    socket.on('reaction:broadcast', reaction);
    socket.on('disconnect', disconnected);
    socket.on('connect', connected);
    socket.on('hand_approved', approved);
    socket.on('hand_rejected', rejected);
    socket.on('speaker_left', removed);
    socket.on('microphone_muted', muted);
    socket.on('microphone_unmuted', unmuted);
    socket.on('room.paused', roomPaused);
    socket.on('room.resumed', roomResumed);
    socket.on('room.ended', roomEnded);
    socket.on('room_paused', roomPaused);
    socket.on('room_resumed', roomResumed);
    socket.on('room_ended', roomEnded);

    return () => {
      roomEvents.forEach((event) => socket.off(event, refreshParticipants));
      socket.off('chat_message', receiveMessage);
      socket.off('chat_message_updated', refreshMessages);
      socket.off('chat_message_deleted', refreshMessages);
      socket.off('chat_reaction_added', refreshMessages);
      socket.off('chat_reaction_removed', refreshMessages);
      socket.off('reaction:broadcast', reaction);
      socket.off('disconnect', disconnected);
      socket.off('connect', connected);
      socket.off('hand_approved', approved);
      socket.off('hand_rejected', rejected);
      socket.off('speaker_left', removed);
      socket.off('microphone_muted', muted);
      socket.off('microphone_unmuted', unmuted);
      socket.off('room.paused', roomPaused);
      socket.off('room.resumed', roomResumed);
      socket.off('room.ended', roomEnded);
      socket.off('room_paused', roomPaused);
      socket.off('room_resumed', roomResumed);
      socket.off('room_ended', roomEnded);
    };
  }, [roomId, qc, addReaction, currentUser?.id, conversation.data?.id]);

  useEffect(() => {
    if (String(room.data?.status || '').toLowerCase() === 'ended') {
      void closeEndedRoom();
    }
  }, [room.data?.status]);

  useEffect(() => {
    const me = participantViews.find((participant) => participant.userId === currentUser?.id);
    if (me?.handRaised !== undefined) setHandRaised(Boolean(me.handRaised));
    if (me?.isMuted && micEnabled) {
      void mediaRef.current?.disableMicrophone().catch(() => undefined);
      setMicEnabled(false);
      setStageNotice('The host muted your microphone.');
    }
  }, [participantViews, currentUser?.id, micEnabled]);

  async function toggleMicrophone() {
    const media = mediaRef.current;
    if (mutedByHost) {
      setStageNotice('Your microphone is muted by the host. Wait until the host unmutes your stage permission.');
      return;
    }
    if (!canSpeak) {
      setStageNotice('Raise your hand and wait for host approval before speaking.');
      return;
    }
    if (!media) {
      setStageNotice(audioDetail || 'Real RTC audio is not connected.');
      return;
    }
    try {
      if (micEnabled) {
        await media.disableMicrophone();
        setMicEnabled(false);
        await roomApi.reportSpeakingState(roomId, false).catch(() => undefined);
        setStageNotice('Microphone muted.');
      } else {
        await media.enableMicrophone();
        setMicEnabled(true);
        await roomApi.reportSpeakingState(roomId, true).catch(() => undefined);
        setStageNotice('Your microphone is live in this room.');
      }
    } catch (error) {
      setStageNotice(error instanceof Error ? error.message : 'Microphone could not be updated.');
    }
  }

  async function leave() {
    try {
      if (micEnabled) await roomApi.reportSpeakingState(roomId, false).catch(() => undefined);
      await mediaRef.current?.disconnect().catch(() => undefined);
      mediaRef.current = null;
      await leaveRoomRuntime(roomId);
    } finally {
      reset();
      navigate(`/rooms/${roomId}`);
    }
  }

  async function quickReaction(emoji: string) {
    if (String(room.data?.status || '').toLowerCase() !== 'live') {
      setStageNotice('Live reactions are unavailable while the broadcast is paused.');
      return;
    }
    try {
      const response = await sendRoomReaction(roomId, emoji);
      const reaction = response.reaction as RoomReactionEvent | undefined;
      if (reaction?.roomId === roomId) addReaction(reaction);
    } catch (error) {
      setStageNotice(error instanceof Error ? error.message : 'Live reaction could not be sent.');
    }
  }

  if (room.isPending) return <div className="vc-page-width vc-ph05-page"><DiscoveryLoading label="Entering room…" /></div>;
  if (room.isError || !room.data) return <div className="vc-page-width vc-ph05-page"><DiscoveryError error={room.error} /></div>;
  const item = room.data;
  const isLive = String(item.status || '').toLowerCase() === 'live';
  const isPaused = String(item.status || '').toLowerCase() === 'paused';
  if (connectionState === 'failed') {
    return <div className="vc-page-width vc-ph05-page"><section className="vc-room-runtime-failure"><ShieldCheck /><span className="vc-eyebrow">Room access</span><h1>{accessIssue?.title || 'Unable to enter the room'}</h1><p>{accessIssue?.message || 'VoiceCloud could not establish this room session.'}</p><div><button className="vc-button vc-button--primary" onClick={() => void establish()}><RefreshCw />Try again</button><button className="vc-button vc-button--secondary" onClick={() => navigate(`/rooms/${roomId}`)}><ArrowLeft />Room details</button></div></section></div>;
  }

  return <div className="vc-room-live-page">
    <section className="vc-room-live-stage" style={{ backgroundImage: `url(${roomArtwork(item as VoiceCloudRoom)})` }}>
      <div className="vc-room-live-stage__veil" />
      <div className="vc-room-live-stage__top">
        <button type="button" onClick={() => navigate(`/rooms/${roomId}`)}><ArrowLeft />Details</button>
        <span className={`vc-room-connection is-${connectionState}`}><Radio />{connectionState === 'connected' ? `Connected as ${role.replaceAll('_', ' ')}` : connectionState === 'reconnecting' ? 'Reconnecting…' : 'Joining…'}</span>
        <button type="button" className="danger" onClick={() => void leave()}><LogOut />Leave</button>
      </div>
      <div className="vc-room-live-stage__copy">
        <span className="vc-eyebrow">{item.category} · {item.language.toUpperCase()}</span>
        <h1>{item.title}</h1>
        <p>{item.description || 'Live on VoiceCloud'}</p>
        <div className="vc-room-live-stage__stats">
          <span><Headphones />{item.listenerCount} listeners</span>
          <span><Users />{participantViews.length} present</span>
          <span><Radio />{rtc?.provider || 'RTC'} · {role.replaceAll('_', ' ')}</span>
          <span><Volume2 />{audioState === 'connected' || audioState === 'publishing' || audioState === 'muted' ? 'Audio connected' : audioState === 'playback-blocked' ? 'Audio blocked' : audioState === 'error' ? 'Audio unavailable' : 'Audio connecting'}</span>
        </div>
        <div className="vc-room-stage-actions">
          {canSpeak
            ? <button type="button" className={`vc-button ${micEnabled ? 'vc-button--secondary' : 'vc-button--primary'}`} onClick={() => void toggleMicrophone()} disabled={!isLive || audioState === 'error' || mutedByHost}>{micEnabled || mutedByHost ? <MicOff /> : <Mic />}{mutedByHost ? 'Muted by Host' : micEnabled ? 'Mute Microphone' : 'Start Speaking'}</button>
            : handRaised
              ? <button type="button" className="vc-button vc-button--secondary" onClick={() => cancelHand.mutate()} disabled={!isLive || cancelHand.isPending}><Hand />Cancel Hand Raise</button>
              : <button type="button" className="vc-button vc-button--primary" onClick={() => raiseHand.mutate()} disabled={!isLive || raiseHand.isPending || connectionState !== 'connected'}><Hand />Raise Hand</button>}
          {audioState === 'playback-blocked' ? <button type="button" className="vc-button vc-button--secondary" onClick={() => void mediaRef.current?.startAudio()}><Volume2 />Enable Audio</button> : null}
        </div>
        {isPaused ? <p className="vc-room-stage-notice">Broadcast paused. Listening remains connected, but chat, reactions and speaker actions are disabled.</p> : null}
        {stageNotice ? <p className="vc-room-stage-notice">{stageNotice}</p> : null}
        {audioState === 'error' ? <p className="vc-room-audio-warning">{audioDetail}</p> : null}
      </div>
      <RoomReactionBar onReact={(emoji) => void quickReaction(emoji)} disabled={!isLive || connectionState !== 'connected'} />
      <div className="vc-room-floating-reactions" aria-hidden="true">{reactions.slice(-6).map((r, index) => <span key={`${r.timestamp}-${index}`}>{r.emoji}</span>)}</div>
    </section>
    <div className="vc-page-width vc-room-live-layout">
      <RoomParticipantsPanel participants={participantViews} loading={participants.isFetching} />
      <RoomChatPanel messages={messages.data?.messages ?? []} currentUserId={currentUser?.id} sending={sendMessage.isPending || !conversation.data} disabled={!isLive} onSend={(content) => isLive && sendMessage.mutate(content)} onReact={(messageId, emoji) => isLive && reactMessage.mutate({ messageId, emoji })} />
    </div>
    {connectionState === 'reconnecting' ? <div className="vc-room-reconnect-banner"><RefreshCw /><div><strong>Reconnecting to VoiceCloud</strong><span>Restoring authoritative room access, presence and RTC role…</span></div><button onClick={() => void reconnect()}>Retry now</button></div> : null}
  </div>;
}
