import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, LockKeyhole, Search, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';
import { communityApi } from '@/features/community/community.api';

const categories = ['All', 'General', 'Music', 'Technology', 'Gaming', 'Wellness', 'Education'];

export function CommunitiesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const query = useQuery({
    queryKey: ['ph04', 'communities', search, category],
    queryFn: () => communityApi.list(search, category === 'All' ? '' : category, 1, 30),
  });

  return <div className="vc-page-width vc-ph04-page">
    <section className="vc-ph04-hero">
      <div><span className="vc-eyebrow"><Users size={15}/> VoiceCloud communities</span><h1>Find your people. <em>Stay for the conversation.</em></h1><p>Browse public and private communities backed by VoiceCloud club membership, member roles, and scheduled-room authority.</p></div>
      <div className="vc-ph04-hero__stat"><b>{query.data?.total ?? '—'}</b><span>communities available</span></div>
    </section>
    <section className="vc-ph04-toolbar">
      <label className="vc-ph04-search"><Search size={17}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search communities" aria-label="Search communities"/></label>
      <div className="vc-ph04-chips">{categories.map(item=><button key={item} type="button" className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div>
    </section>
    {query.isPending?<DiscoveryLoading/>:query.isError?<DiscoveryError error={query.error}/>:query.data?.data.length?<section className="vc-community-grid">{query.data.data.map(club=><button className="vc-community-card" type="button" key={club.id} onClick={()=>navigate(`/communities/${club.handle || club.id}`)}>
      <div className="vc-community-card__banner" style={club.bannerUrl?{backgroundImage:`url(${club.bannerUrl})`}:undefined}><span>{club.visibility?.toUpperCase()==='PRIVATE'?<LockKeyhole size={15}/>:<Users size={15}/>} {club.visibility || 'Public'}</span></div>
      <div className="vc-community-card__body"><div className="vc-community-card__identity">{club.imageUrl?<img src={club.imageUrl} alt=""/>:<span>{club.name.slice(0,1).toUpperCase()}</span>}<div><h2>{club.name} {club.isVerified?<BadgeCheck size={16}/>:null}</h2><small>@{club.handle}</small></div></div><p>{club.description || 'A VoiceCloud community.'}</p><footer><span><b>{club.memberCount}</b> members</span><span><b>{club.upcomingRoomsCount}</b> upcoming</span><span>{club.category}</span></footer></div>
    </button>)}</section>:<DiscoveryEmpty title="No communities found" description="Try a different search or category."/>}
  </div>;
}
