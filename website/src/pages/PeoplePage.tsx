import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { discoveryApi } from '@/features/discovery/discovery.api';
import { visibleConsumerUsers } from '@/features/discovery/consumer-users';
import { UserCard } from '@/components/discovery/UserCard';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';

export function PeoplePage() {
  const navigate = useNavigate();
  const currentUser = useWebsiteAuthStore((state) => state.user);
  const trending = useQuery({ queryKey: ['ph03','people','trending'], queryFn: () => discoveryApi.trendingUsers(16) });
  const suggested = useQuery({ queryKey: ['ph03','people','suggested'], queryFn: () => discoveryApi.suggestedUsers(16) });
  const trendingUsers = useMemo(() => visibleConsumerUsers(trending.data?.items, currentUser).slice(0, 12), [trending.data?.items, currentUser?.id, currentUser?.username]);
  const suggestedUsers = useMemo(() => visibleConsumerUsers(suggested.data?.items, currentUser).slice(0, 12), [suggested.data?.items, currentUser?.id, currentUser?.username]);

  return <div className="vc-page-width vc-discovery-page">
    <section className="vc-people-hero"><div><span><Sparkles size={15}/> People discovery</span><h1>Find voices worth <em>following.</em></h1><p>Discover people based on real VoiceCloud discovery signals and public profile information.</p><button onClick={() => navigate('/search')}><Search size={16}/>Search people</button></div><div className="vc-people-hero__faces"><Users size={78}/></div></section>
    <section className="vc-discovery-section"><header><h2>Trending People</h2></header>{trending.isPending?<DiscoveryLoading/>:trending.isError?<DiscoveryError error={trending.error}/>:trendingUsers.length?<div className="vc-person-grid">{trendingUsers.map((user) => <UserCard user={user} key={user.id}/>)}</div>:<DiscoveryEmpty title="No trending people yet"/>}</section>
    <section className="vc-discovery-section"><header><h2>Suggested for You</h2></header>{suggested.isPending?<DiscoveryLoading/>:suggested.isError?<DiscoveryError error={suggested.error}/>:suggestedUsers.length?<div className="vc-person-grid">{suggestedUsers.map((user) => <UserCard user={user} key={user.id}/>)}</div>:<DiscoveryEmpty title="No suggestions yet"/>}</section>
  </div>;
}
