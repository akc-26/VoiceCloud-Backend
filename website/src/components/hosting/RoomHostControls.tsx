import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hand, Mic, MicOff, Pause, Play, Search, Settings2, Square, UserMinus, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '@/api/client';
import { hostingApi } from '@/features/hosting/hosting.api';
import { inviteRoomParticipant } from '@/features/rooms/room-realtime';
import type { RoomParticipantView } from '@/features/rooms/types';

function useHostAction<T extends unknown[]>(fn: (...args: T) => Promise<unknown>, onSuccess: () => void, onError: (error: unknown) => void) {
  return useMutation({ mutationFn: (args: T) => fn(...args), onSuccess, onError });
}

export function RoomHostControls({ roomId, participants, status }: { roomId: string; participants: RoomParticipantView[]; status: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const normalized = String(status || '').toLowerCase();
  const isLive = normalized === 'live';
  const isPaused = normalized === 'paused';
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const stage = useQuery({ queryKey: ['ph06','stage',roomId], queryFn: () => hostingApi.stage(roomId), enabled: Boolean(roomId && (isLive || isPaused)), refetchInterval: 3_000 });
  const people = useQuery({ queryKey: ['ph06','invite-search',search], queryFn: () => hostingApi.searchPeople(search), enabled: search.trim().length >= 2, staleTime: 10_000 });
  const refresh = () => { void stage.refetch(); void qc.invalidateQueries({ queryKey: ['ph05','room',roomId,'participants'] }); };
  const actionSuccess = () => { refresh(); setNotice('Host action completed.'); };
  const actionError = (error: unknown) => setNotice(apiErrorMessage(error));
  const approve = useHostAction((userId:string) => hostingApi.approveSpeaker(roomId,userId), actionSuccess, actionError);
  const reject = useHostAction((userId:string) => hostingApi.rejectSpeaker(roomId,userId), actionSuccess, actionError);
  const inviteSpeaker = useHostAction((userId:string) => hostingApi.inviteSpeaker(roomId,userId), actionSuccess, actionError);
  const removeSpeaker = useHostAction((userId:string) => hostingApi.removeSpeaker(roomId,userId), actionSuccess, actionError);
  const mute = useHostAction((userId:string,value:boolean) => hostingApi.muteSpeaker(roomId,userId,value), actionSuccess, actionError);
  const inviteAudience = useHostAction((userId:string) => inviteRoomParticipant(roomId,userId), actionSuccess, actionError);
  const pause = useMutation({ mutationFn: () => hostingApi.pause(roomId), onSuccess: () => void qc.invalidateQueries({ queryKey: ['ph05','room',roomId] }), onError: e => setNotice(apiErrorMessage(e)) });
  const resume = useMutation({ mutationFn: () => hostingApi.resume(roomId), onSuccess: () => void qc.invalidateQueries({ queryKey: ['ph05','room',roomId] }), onError: e => setNotice(apiErrorMessage(e)) });
  const end = useMutation({ mutationFn: () => hostingApi.endBroadcast(roomId), onSuccess: () => navigate('/host/rooms', { replace: true, state: { notice: 'Broadcast ended.' } }), onError: e => setNotice(apiErrorMessage(e)) });
  const participantMap = useMemo(() => new Map(participants.map(p => [p.userId,p])), [participants]);
  const speakers = stage.data?.speakers || [];
  const speakerIds = new Set(speakers.map(s => s.userId));
  const listeners = participants.filter(p => !speakerIds.has(p.userId) && String(p.role).toLowerCase() === 'listener');

  return <section className="vc-ph06-host-console">
    <header><div><span className="vc-eyebrow"><Settings2/>Host controls</span><h2>Manage this live room</h2></div><div className="vc-ph06-host-console__lifecycle">{isLive?<button onClick={()=>pause.mutate()} disabled={pause.isPending}><Pause/>Pause</button>:null}{isPaused?<button className="primary" onClick={()=>resume.mutate()} disabled={resume.isPending}><Play/>Resume</button>:null}<button className="danger" onClick={()=>window.confirm('End this broadcast for everyone?')&&end.mutate()} disabled={end.isPending}><Square/>End</button><button onClick={()=>navigate(`/host/rooms/${roomId}/settings`)}><Settings2/>Settings</button></div></header>
    {notice?<div className="vc-ph06-alert">{notice}<button onClick={()=>setNotice('')}>×</button></div>:null}
    <div className="vc-ph06-host-console__grid">
      <article><h3><Hand/>Raised hands</h3>{stage.data?.handQueue?.length?stage.data.handQueue.map(req=>{const p=participantMap.get(req.userId);return <div className="vc-ph06-stage-row" key={req.userId}><div><b>{p?.displayName||p?.username||'VoiceCloud user'}</b><small>Requested seat {req.seatIndex||1}</small></div><div><button className="primary" disabled={!isLive||approve.isPending} onClick={()=>approve.mutate([req.userId])}>Approve</button><button disabled={!isLive||reject.isPending} onClick={()=>reject.mutate([req.userId])}>Reject</button></div></div>}):<p className="vc-room-muted">No pending speaker requests.</p>}</article>
      <article><h3><Mic/>Speaker stage</h3>{speakers.length?speakers.map(s=>{const p=participantMap.get(s.userId);const muted=Boolean(s.isMuted||p?.isMuted);return <div className="vc-ph06-stage-row" key={s.userId}><div><b>{p?.displayName||p?.username||'VoiceCloud speaker'}</b><small>{muted?'Muted':'Microphone permitted'}</small></div><div><button disabled={!isLive||mute.isPending} onClick={()=>mute.mutate([s.userId,!muted])}>{muted?<Mic/>:<MicOff/>}{muted?'Unmute':'Mute'}</button><button className="danger ghost" disabled={!isLive||removeSpeaker.isPending} onClick={()=>removeSpeaker.mutate([s.userId])}><UserMinus/>Audience</button></div></div>}):<p className="vc-room-muted">No active speakers yet.</p>}</article>
      <article><h3><Users/>Invite present listeners</h3>{listeners.length?listeners.slice(0,8).map(p=><div className="vc-ph06-stage-row" key={p.userId}><div><b>{p.displayName||p.username||'VoiceCloud listener'}</b><small>Currently in audience</small></div><button disabled={!isLive||inviteSpeaker.isPending} onClick={()=>inviteSpeaker.mutate([p.userId])}><UserPlus/>Invite to stage</button></div>):<p className="vc-room-muted">Listeners will appear here when they join.</p>}</article>
      <article><h3><UserPlus/>Invite people to room</h3><label className="vc-ph06-mini-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or username"/></label>{search.trim().length<2?<p className="vc-room-muted">Type at least two characters.</p>:people.isFetching?<p className="vc-room-muted">Searching…</p>:people.data?.data.length?people.data.data.filter(u=>!participants.some(p=>p.userId===u.id)).slice(0,8).map(u=><div className="vc-ph06-stage-row" key={u.id}><div><b>{u.displayName||u.username||'VoiceCloud user'}</b><small>{u.username?`@${u.username}`:'Registered user'}</small></div><button disabled={!isLive||inviteAudience.isPending} onClick={()=>inviteAudience.mutate([u.id])}><UserPlus/>Invite</button></div>):<p className="vc-room-muted">No matching users found.</p>}</article>
    </div>
  </section>;
}
