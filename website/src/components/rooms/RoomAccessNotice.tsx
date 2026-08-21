import { BadgeCheck, LockKeyhole, ShieldCheck, Ticket, UserCheck, Users } from 'lucide-react';
import type { RoomAccessIssue, VoiceCloudRoomDetail } from '@/features/rooms/types';
import { roomRestrictionLabels } from '@/features/rooms/room-access';

export function RoomAccessNotice({ room, issue }: { room: VoiceCloudRoomDetail; issue?: RoomAccessIssue | null }) {
  const labels = roomRestrictionLabels(room);
  return <div className={`vc-room-access${issue ? ' is-blocked' : ''}`}>
    <div className="vc-room-access__heading">
      {!issue ? <ShieldCheck/> : issue.reason === 'ticket' ? <Ticket/> : issue.reason === 'verification' ? <BadgeCheck/> : issue.reason === 'subscription' ? <UserCheck/> : issue.reason === 'club' ? <Users/> : <LockKeyhole/>}
      <div><strong>{issue?.title || (labels.length ? 'Room access requirements' : 'Open room')}</strong><p>{issue?.message || (labels.length ? 'VoiceCloud checks these requirements when you join.' : 'Sign in and join as a listener when the room is live.')}</p></div>
    </div>
    {labels.length ? <div className="vc-room-access__chips">{labels.map(label => <span key={label}>{label}</span>)}</div> : null}
  </div>;
}
