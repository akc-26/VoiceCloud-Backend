import { Mic2, Radio, Users } from 'lucide-react';
import type { RoomParticipantView } from '@/features/rooms/types';

const roleLabel=(role:string)=>role.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export function RoomParticipantsPanel({participants,loading=false}:{participants:RoomParticipantView[];loading?:boolean}){
  const speakers=participants.filter(p=>['host','co_host','moderator','speaker'].includes(String(p.role).toLowerCase()));
  const listeners=participants.filter(p=>!speakers.includes(p));
  return <section className="vc-room-panel vc-room-participants"><header><div><span className="vc-eyebrow"><Users size={14}/> Participants</span><h2>{participants.length} in room</h2></div><Radio size={19}/></header>
    {loading?<p className="vc-room-muted">Refreshing room presence…</p>:null}
    <div className="vc-room-participant-group"><h3>Stage</h3>{speakers.length?<div className="vc-room-participant-list">{speakers.map(p=><article key={p.userId}><div className="vc-room-avatar">{p.avatarUrl?<img src={p.avatarUrl} alt=""/>:<span>{(p.displayName||p.username||'V')[0]}</span>}</div><div><strong>{p.displayName||p.username||'VoiceCloud user'}</strong><small><Mic2 size={11}/>{roleLabel(String(p.role))}{p.isMuted?' · Muted':''}</small></div></article>)}</div>:<p className="vc-room-muted">The host and active speakers will appear here.</p>}</div>
    <div className="vc-room-participant-group"><h3>Listeners</h3>{listeners.length?<div className="vc-room-participant-list">{listeners.map(p=><article key={p.userId}><div className="vc-room-avatar">{p.avatarUrl?<img src={p.avatarUrl} alt=""/>:<span>{(p.displayName||p.username||'V')[0]}</span>}</div><div><strong>{p.displayName||p.username||'VoiceCloud listener'}</strong><small>{roleLabel(String(p.role))}</small></div></article>)}</div>:<p className="vc-room-muted">No listeners are visible yet.</p>}</div>
  </section>
}
