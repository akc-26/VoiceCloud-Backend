import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { discoveryApi } from '@/features/discovery/discovery.api';
import { UserCard } from '@/components/discovery/UserCard';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';

export function PeoplePage(){
  const navigate=useNavigate();
  const trending=useQuery({queryKey:['ph03','people','trending'],queryFn:()=>discoveryApi.trendingUsers(12)});
  const suggested=useQuery({queryKey:['ph03','people','suggested'],queryFn:()=>discoveryApi.suggestedUsers(12)});
  return <div className="vc-page-width vc-discovery-page">
    <section className="vc-people-hero"><div><span><Sparkles size={15}/> People discovery</span><h1>Find voices worth <em>following.</em></h1><p>Discover people based on real VoiceCloud discovery signals and public profile information.</p><button onClick={()=>navigate('/search')}><Search size={16}/>Search people</button></div><div className="vc-people-hero__faces"><Users size={78}/></div></section>
    <section className="vc-discovery-section"><header><h2>Trending People</h2></header>{trending.isPending?<DiscoveryLoading/>:trending.isError?<DiscoveryError error={trending.error}/>:trending.data?.items.length?<div className="vc-person-grid">{trending.data.items.map(u=><UserCard user={u} key={u.id}/>)}</div>:<DiscoveryEmpty title="No trending people yet"/>}</section>
    <section className="vc-discovery-section"><header><h2>Suggested for You</h2></header>{suggested.isPending?<DiscoveryLoading/>:suggested.isError?<DiscoveryError error={suggested.error}/>:suggested.data?.items.length?<div className="vc-person-grid">{suggested.data.items.map(u=><UserCard user={u} key={u.id}/>)}</div>:<DiscoveryEmpty title="No suggestions yet"/>}</section>
  </div>;
}
