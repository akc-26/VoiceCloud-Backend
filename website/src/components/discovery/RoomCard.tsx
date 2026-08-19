import { LockKeyhole, Mic2, Radio, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { VoiceCloudRoom } from '@/features/discovery/types';
import { compactNumber, roomArtwork } from '@/features/discovery/presentation';

export function RoomCard({ room, compact = false }: { room: VoiceCloudRoom; compact?: boolean }) {
  const navigate = useNavigate();
  return <article className={`vc-discovery-room ${compact ? 'is-compact' : ''}`}>
    <div className="vc-discovery-room__art" style={{ backgroundImage: `url(${roomArtwork(room)})` }}>
      <span className={`vc-room-state ${room.isLive ? 'is-live' : ''}`}>{room.isLive ? <><Radio size={11}/> Live</> : room.status}</span>
      <span className="vc-room-audience"><Users size={12}/>{compactNumber(room.listenerCount)}</span>
    </div>
    <div className="vc-discovery-room__body">
      <div className="vc-discovery-room__title"><h3>{room.title}</h3>{room.isLocked ? <LockKeyhole size={14}/> : null}</div>
      <p>{room.description || `${room.category} · ${room.language.toUpperCase()}`}</p>
      <div className="vc-discovery-room__meta"><span>{room.category}</span><span>{room.speakerCount} speakers</span></div>
      <button type="button" onClick={() => navigate(`/rooms/${room.id}`)}><Mic2 size={14}/>{room.isLive ? 'View Room' : 'Room Details'}</button>
    </div>
  </article>;
}
