import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';
import { communityApi } from '@/features/community/community.api';
import { isConsumerVisibleUser } from '@/features/discovery/consumer-users';

export function CommunityMembersPage() {
  const { communityId = '' } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const club = useQuery({ queryKey: ['ph04', 'community', communityId], queryFn: () => communityApi.detail(communityId) });
  const members = useQuery({ queryKey: ['ph04', 'community', 'members', club.data?.id, search], queryFn: () => communityApi.members(club.data!.id, search, 1, 100), enabled: Boolean(club.data?.id) });
  const visibleMembers = useMemo(
    () => (members.data?.data ?? []).filter((member) => !member.user || isConsumerVisibleUser(member.user)),
    [members.data?.data],
  );

  return <div className="vc-page-width vc-ph04-page">
    <section className="vc-ph04-titlebar"><div><span className="vc-eyebrow"><Users size={14}/> Community members</span><h1>{club.data?.name || 'Community'}</h1><p>Member identities and roles are loaded from the canonical club member API.</p></div><button className="vc-button vc-button--secondary" onClick={() => navigate(`/communities/${communityId}`)}>Community overview</button></section>
    <label className="vc-ph04-search vc-ph04-search--wide"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members"/></label>
    {club.isError ? <DiscoveryError error={club.error}/> : members.isPending ? <DiscoveryLoading/> : members.isError ? <DiscoveryError error={members.error}/> : visibleMembers.length ? <section className="vc-member-grid">{visibleMembers.map(member => <button key={member.id} className="vc-member-card" onClick={() => member.user?.username && navigate(`/profile/${member.user.username}`)}><div className="vc-avatar-fallback">{member.user?.avatarUrl ? <img src={member.user.avatarUrl} alt=""/> : (member.user?.displayName || 'V').slice(0, 1)}</div><div><strong>{member.user?.displayName || 'VoiceCloud user'}</strong><span>@{member.user?.username || 'user'}</span><small><ShieldCheck size={13}/> {member.role}</small></div></button>)}</section> : <DiscoveryEmpty title="No members found"/>}
  </div>;
}
