import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, UserPlus, Users, X } from 'lucide-react';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { friendsApi } from '@/features/discovery/discovery.api';
import { isConsumerDiscoverableUser, visibleConsumerUsers } from '@/features/discovery/consumer-users';
import { UserCard } from '@/components/discovery/UserCard';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';

export function FriendsPage() {
  const qc = useQueryClient();
  const currentUser = useWebsiteAuthStore((state) => state.user);
  const friends = useQuery({ queryKey: ['ph03', 'friends', 'list'], queryFn: () => friendsApi.list() });
  const pending = useQuery({ queryKey: ['ph03', 'friends', 'pending'], queryFn: friendsApi.pending });
  const suggested = useQuery({ queryKey: ['ph03', 'friends', 'suggested'], queryFn: friendsApi.suggested });

  const visibleFriends = useMemo(
    () => (friends.data?.data ?? []).filter((item) => isConsumerDiscoverableUser(item.user, currentUser)),
    [friends.data?.data, currentUser?.id, currentUser?.username],
  );
  const visibleSuggestions = useMemo(
    () => visibleConsumerUsers(suggested.data?.data, currentUser),
    [suggested.data?.data, currentUser?.id, currentUser?.username],
  );
  const incoming = useMemo(
    () => (pending.data?.incoming ?? []).filter((request) => !request.sender || isConsumerDiscoverableUser(request.sender, currentUser)),
    [pending.data?.incoming, currentUser?.id, currentUser?.username],
  );
  const outgoing = useMemo(
    () => (pending.data?.outgoing ?? []).filter((request) => !request.receiver || isConsumerDiscoverableUser(request.receiver, currentUser)),
    [pending.data?.outgoing, currentUser?.id, currentUser?.username],
  );

  const refresh = () => { qc.invalidateQueries({ queryKey: ['ph03', 'friends'] }); };
  const accept = useMutation({ mutationFn: friendsApi.accept, onSuccess: refresh });
  const reject = useMutation({ mutationFn: friendsApi.reject, onSuccess: refresh });
  const send = useMutation({ mutationFn: friendsApi.send, onSuccess: refresh });

  return <div className="vc-page-width vc-social-page">
    <section className="vc-social-hero"><div><span><Users/>VoiceCloud social graph</span><h1>Friends</h1><p>Manage accepted friendships and pending requests through the canonical friends APIs.</p></div><b>{visibleFriends.length}</b></section>
    <div className="vc-friends-columns"><main>
      <section className="vc-discovery-section"><header><h2>Your Friends</h2></header>{friends.isPending ? <DiscoveryLoading/> : friends.isError ? <DiscoveryError error={friends.error}/> : visibleFriends.length ? <div className="vc-person-grid">{visibleFriends.map(f => <UserCard key={f.friendshipId} user={f.user}/>)}</div> : <DiscoveryEmpty title="No friends yet"/>}</section>
      <section className="vc-discovery-section"><header><h2>Suggested Friends</h2></header>{suggested.isPending ? <DiscoveryLoading/> : suggested.isError ? <DiscoveryError error={suggested.error}/> : visibleSuggestions.length ? <div className="vc-person-grid">{visibleSuggestions.map(u => <UserCard key={u.id} user={u} action="Add Friend" busy={send.isPending} onAction={() => send.mutate(u.id)}/>)}</div> : <DiscoveryEmpty title="No suggestions right now"/>}</section>
    </main><aside className="vc-friend-requests"><h2>Friend Requests</h2>{pending.isPending ? <DiscoveryLoading/> : pending.isError ? <DiscoveryError error={pending.error}/> : incoming.length ? incoming.map(r => <div key={r.id}><span><strong>{r.sender?.displayName || 'VoiceCloud user'}</strong><small>@{r.sender?.username || 'user'}</small></span><div><button onClick={() => accept.mutate(r.id)}><Check/></button><button onClick={() => reject.mutate(r.id)}><X/></button></div></div>) : <DiscoveryEmpty title="No incoming requests" description="New friend requests will appear here."/>}<h3><UserPlus size={16}/>Sent requests</h3>{outgoing.slice(0, 5).map(r => <p key={r.id}>{r.receiver?.displayName || 'VoiceCloud user'} · Pending</p>)}</aside></div>
  </div>;
}
