import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserRoundCheck, Users } from 'lucide-react';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { profileApi } from '@/features/discovery/discovery.api';
import { visibleConsumerUsers } from '@/features/discovery/consumer-users';
import { UserCard } from '@/components/discovery/UserCard';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';

export function SocialListPage({ mode }: { mode: 'followers' | 'following' }) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const currentUser = useWebsiteAuthStore((state) => state.user);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['ph03', 'social', mode, search],
    queryFn: () => mode === 'followers' ? profileApi.followers(search) : profileApi.following(search),
  });
  const visiblePeople = useMemo(
    () => visibleConsumerUsers(q.data?.data, currentUser),
    [q.data?.data, currentUser?.id, currentUser?.username],
  );
  const unfollow = useMutation({
    mutationFn: (id: string) => profileApi.unfollow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ph03', 'social', 'following'] }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setSearch(input.trim());
  }

  return <div className="vc-page-width vc-social-page">
    <section className="vc-social-hero"><div><span>{mode === 'followers' ? <Users/> : <UserRoundCheck/>}{mode === 'followers' ? 'Your audience' : 'Your following'}</span><h1>{mode === 'followers' ? 'Followers' : 'Following'}</h1><p>{mode === 'followers' ? 'People who follow your VoiceCloud profile.' : 'People whose voices and activity you chose to follow.'}</p></div><b>{visiblePeople.length}</b></section>
    <form className="vc-social-search" onSubmit={submit}><Search size={17}/><input value={input} onChange={e => setInput(e.target.value)} placeholder={`Search ${mode}`}/><button>Search</button></form>
    {q.isPending ? <DiscoveryLoading/> : q.isError ? <DiscoveryError error={q.error}/> : visiblePeople.length ? <div className="vc-person-grid">{visiblePeople.map(u => <UserCard key={u.id} user={u} action={mode === 'following' ? 'Unfollow' : undefined} onAction={mode === 'following' ? () => unfollow.mutate(u.id) : undefined} busy={unfollow.isPending}/>)}</div> : <DiscoveryEmpty title={`No ${mode} found`}/>} 
  </div>;
}
