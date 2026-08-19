import { BadgeCheck, MessageCircle, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { VoiceCloudUser } from '@/features/discovery/types';
import { compactNumber, userAvatar } from '@/features/discovery/presentation';

export function UserCard({ user, action, onAction, busy }: { user: VoiceCloudUser; action?: string; onAction?: () => void; busy?: boolean }) {
  const navigate = useNavigate();
  return <article className="vc-person-card">
    <button className="vc-person-card__identity" type="button" onClick={() => navigate(`/profile/${user.username}`)}>
      <span className="vc-person-card__avatar-wrap"><img src={userAvatar(user)} alt=""/>{user.isOnline ? <i/> : null}</span>
      <span><strong>{user.displayName}{user.isVerified ? <BadgeCheck size={15}/> : null}</strong><small>@{user.username}</small></span>
    </button>
    <p>{user.bio || user.statusMessage || (user.interests?.length ? user.interests.slice(0,3).join(' · ') : 'VoiceCloud member')}</p>
    <div className="vc-person-card__stats"><span><b>{compactNumber(user.followersCount)}</b> Followers</span><span><b>{user.wealthLevel || 1}</b> Level</span></div>
    <div className="vc-person-card__actions">
      {action && onAction ? <button type="button" disabled={busy} onClick={onAction}><UserPlus size={14}/>{busy ? 'Working…' : action}</button> : null}
      <button type="button" onClick={() => navigate(`/profile/${user.username}`)}><MessageCircle size={14}/>Profile</button>
    </div>
  </article>;
}
