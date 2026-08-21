import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck, Clock3, Headphones, LockKeyhole, Mic2, Radio, ShieldCheck, Ticket, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';
import { RoomAccessNotice } from '@/components/rooms/RoomAccessNotice';
import { profileApi } from '@/features/discovery/discovery.api';
import { roomArtwork } from '@/features/discovery/presentation';
import type { VoiceCloudRoom } from '@/features/discovery/types';
import { roomAccessIssue, roomRestrictionLabels } from '@/features/rooms/room-access';
import { roomApi } from '@/features/rooms/room.api';
import { useRoomSessionStore } from '@/features/rooms/room-session.store';

function roomStatusText(status:string,isLive:boolean){if(isLive)return 'Live now';return status.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}

export function RoomDetailsPage(){
  const {roomId=''}=useParams();
  const navigate=useNavigate();
  const authenticated=useWebsiteAuthStore(s=>s.isAuthenticated);
  const beginJoin=useRoomSessionStore(s=>s.beginJoin);
  const setConnected=useRoomSessionStore(s=>s.setConnected);
  const setFailure=useRoomSessionStore(s=>s.setFailure);
  const room=useQuery({queryKey:['ph05','room',roomId],queryFn:()=>roomApi.detail(roomId),enabled:Boolean(roomId)});
  const host=useQuery({queryKey:['ph05','room-host',room.data?.hostId],queryFn:()=>profileApi.byId(room.data!.hostId),enabled:Boolean(authenticated&&room.data?.hostId)});
  const join=useMutation({mutationFn:async()=>{beginJoin(roomId);return roomApi.join(roomId)},onSuccess:(rtc)=>{setConnected(rtc);navigate(`/rooms/${roomId}/live`)},onError:(error)=>setFailure(roomAccessIssue(error))});
  if(room.isPending)return <div className="vc-page-width vc-ph05-page"><DiscoveryLoading label="Loading room…"/></div>;
  if(room.isError||!room.data)return <div className="vc-page-width vc-ph05-page"><DiscoveryError error={room.error}/></div>;
  const item=room.data;
  const labels=roomRestrictionLabels(item);
  const artwork=roomArtwork(item as VoiceCloudRoom);
  const joinable=item.isLive||item.status.toLowerCase()==='paused';
  return <div className="vc-page-width vc-ph05-page">
    <button className="vc-room-back" type="button" onClick={()=>navigate('/rooms')}><ArrowLeft size={16}/> Live rooms</button>
    <section className="vc-room-detail-hero">
      <div className="vc-room-detail-hero__art" style={{backgroundImage:`url(${artwork})`}}><div className="vc-room-detail-hero__shade"/><div className="vc-room-detail-hero__badges"><span className={item.isLive?'is-live':''}><Radio size={13}/>{roomStatusText(item.status,item.isLive)}</span>{item.isLocked?<span><LockKeyhole size={13}/>Locked</span>:null}</div></div>
      <div className="vc-room-detail-hero__copy"><span className="vc-eyebrow">{item.category} · {item.language.toUpperCase()}</span><h1>{item.title}</h1><p>{item.description||'A live VoiceCloud conversation.'}</p><div className="vc-room-detail-hero__meta"><span><Users/>{item.listenerCount} listeners</span><span><Mic2/>{item.speakerCount} speakers</span><span><Headphones/>{item.audioQuality||'Voice audio'}</span></div>
        {host.data?<button className="vc-room-host" type="button" onClick={()=>navigate(`/profile/${host.data!.username}`)}><span>{host.data.avatarUrl?<img src={host.data.avatarUrl} alt=""/>:host.data.displayName?.[0]}</span><div><small>Hosted by</small><strong>{host.data.displayName}</strong></div>{host.data.isVerified?<BadgeCheck size={16}/>:null}</button>:<div className="vc-room-host vc-room-host--plain"><span>V</span><div><small>Hosted by</small><strong>VoiceCloud host</strong></div></div>}
        {join.error?<RoomAccessNotice room={item} issue={roomAccessIssue(join.error)}/>:<RoomAccessNotice room={item}/>} 
        <div className="vc-room-detail-hero__actions"><button className="vc-button vc-button--primary" type="button" disabled={!joinable||join.isPending} onClick={()=>authenticated?join.mutate():navigate('/auth/sign-in')}><Headphones size={17}/>{join.isPending?'Checking access…':authenticated?(joinable?'Join as listener':'Room unavailable'):'Sign in to join'}</button>{item.scheduledRoomId?<button className="vc-button vc-button--secondary" type="button" onClick={()=>navigate(`/events/${item.scheduledRoomId}`)}><Clock3 size={17}/>Scheduled details</button>:null}</div>
      </div>
    </section>
    <section className="vc-room-detail-grid"><article><ShieldCheck/><h2>Server-authoritative access</h2><p>Room state, tickets, invitations, community membership, subscriptions and verification are checked by VoiceCloud when you join.</p></article><article><Radio/><h2>Realtime presence</h2><p>After access is approved, room presence, participants, chat and reactions are synchronized through the authenticated realtime service.</p></article><article><Ticket/><h2>{labels.length?'Restricted access':'Open conversation'}</h2><p>{labels.length?labels.join(' · '):'No additional room restriction is advertised for this room.'}</p></article></section>
  </div>;
}
