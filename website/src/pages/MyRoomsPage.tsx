import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Mic2, Pause, Play, Plus, Radio, Search, Settings2, Square, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '@/api/client';
import { DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';
import { hostingApi } from '@/features/hosting/hosting.api';

export function MyRoomsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const host = useQuery({ queryKey: ['ph06','host-profile'], queryFn: hostingApi.hostProfile, retry: false });
  const rooms = useQuery({ queryKey: ['ph06','my-rooms',search], queryFn: () => hostingApi.ownedRooms(search), enabled: host.data?.status === 'APPROVED' });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['ph06','my-rooms'] });
  const start = useMutation({ mutationFn: hostingApi.startBroadcast, onSuccess: (room) => { refresh(); navigate(`/rooms/${room.id}/live`); }, onError: (e) => setNotice(apiErrorMessage(e)) });
  const pause = useMutation({ mutationFn: hostingApi.pause, onSuccess: refresh, onError: (e) => setNotice(apiErrorMessage(e)) });
  const resume = useMutation({ mutationFn: hostingApi.resume, onSuccess: refresh, onError: (e) => setNotice(apiErrorMessage(e)) });
  const end = useMutation({ mutationFn: hostingApi.endBroadcast, onSuccess: refresh, onError: (e) => setNotice(apiErrorMessage(e)) });
  const remove = useMutation({ mutationFn: hostingApi.deleteRoom, onSuccess: refresh, onError: (e) => setNotice(apiErrorMessage(e)) });

  if (host.isPending) return <div className="vc-page-width vc-ph06-page"><DiscoveryLoading label="Checking host access…" /></div>;
  if (host.isError || host.data?.status !== 'APPROVED') return <div className="vc-page-width vc-ph06-page"><section className="vc-ph06-access"><Mic2/><span className="vc-eyebrow">Host access</span><h1>Approved Host access is required.</h1><p>{host.isError ? apiErrorMessage(host.error) : `Your current Host status is ${host.data?.status || 'not available'}. Room creation and broadcasting remain backend-authoritative.`}</p><button className="vc-button vc-button--secondary" onClick={()=>navigate('/me')}>Back to profile</button></section></div>;

  return <div className="vc-page-width vc-ph06-page">
    <section className="vc-ph06-hero"><div><span className="vc-eyebrow"><Radio size={15}/> Host room management</span><h1>My <em>Rooms</em></h1><p>Create, configure, schedule and operate your VoiceCloud broadcasts from the consumer website.</p></div><div className="vc-ph06-hero__actions"><button className="vc-button vc-button--secondary" onClick={()=>navigate('/host/schedule')}><CalendarClock/>Schedule</button><button className="vc-button vc-button--primary" onClick={()=>navigate('/host/rooms/create')}><Plus/>Create Room</button></div></section>
    {notice ? <div className="vc-ph06-alert" role="alert">{notice}<button onClick={()=>setNotice('')}>×</button></div> : null}
    <label className="vc-ph06-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your rooms"/></label>
    {rooms.isPending ? <DiscoveryLoading/> : rooms.isError ? <DiscoveryError error={rooms.error}/> : rooms.data?.data.length ? <section className="vc-ph06-room-grid">{rooms.data.data.map(room=>{
      const status=String(room.status||'offline').toLowerCase(); const live=status==='live'; const paused=status==='paused';
      return <article className={`vc-ph06-room-card is-${status}`} key={room.id}><header><span>{live?'LIVE':paused?'PAUSED':status.toUpperCase()}</span><small>{room.category} · {room.language?.toUpperCase()}</small></header><h2>{room.title}</h2><p>{room.description||'No description added.'}</p><div className="vc-ph06-room-card__stats"><span><Users/>{Number(room.listenerCount||0)+Number(room.speakerCount||0)} present</span><span><Mic2/>{room.speakerCount||0} speakers</span></div><div className="vc-ph06-room-card__actions">
        {!live&&!paused?<button className="primary" disabled={start.isPending} onClick={()=>start.mutate(room.id)}><Play/>Start Broadcast</button>:null}
        {live?<button onClick={()=>pause.mutate(room.id)} disabled={pause.isPending}><Pause/>Pause</button>:null}
        {paused?<button className="primary" onClick={()=>resume.mutate(room.id)} disabled={resume.isPending}><Play/>Resume</button>:null}
        {live||paused?<button onClick={()=>navigate(`/rooms/${room.id}/live`)}><Radio/>Open Host Room</button>:null}
        {live||paused?<button className="danger" onClick={()=>end.mutate(room.id)} disabled={end.isPending}><Square/>End</button>:null}
        <button onClick={()=>navigate(`/host/rooms/${room.id}/settings`)}><Settings2/>Settings</button>
        {!live&&!paused?<button className="danger ghost" onClick={()=>window.confirm('Delete this room?')&&remove.mutate(room.id)} disabled={remove.isPending}><Trash2/>Delete</button>:null}
      </div></article>})}</section>:<section className="vc-ph06-empty"><Radio/><h2>No rooms yet</h2><p>Create your first host room or schedule a future session.</p><button className="vc-button vc-button--primary" onClick={()=>navigate('/host/rooms/create')}><Plus/>Create Room</button></section>}
  </div>;
}
