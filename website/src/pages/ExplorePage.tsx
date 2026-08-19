import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Compass, Radio, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { discoveryApi } from '@/features/discovery/discovery.api';
import { RoomCard } from '@/components/discovery/RoomCard';
import { UserCard } from '@/components/discovery/UserCard';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';

const categories = ['All','Music','Technology','Lifestyle','Gaming','Business','Wellness','Education','Poetry'];
export function ExplorePage(){
  const navigate=useNavigate();
  const rooms=useQuery({queryKey:['ph03','discover','rooms'],queryFn:()=>discoveryApi.trendingRooms(6)});
  const people=useQuery({queryKey:['ph03','discover','people'],queryFn:()=>discoveryApi.suggestedUsers(4)});
  const clubs=useQuery({queryKey:['ph03','discover','clubs'],queryFn:()=>discoveryApi.clubs(undefined,4)});
  const scheduled=useQuery({queryKey:['ph03','discover','scheduled'],queryFn:()=>discoveryApi.scheduled(undefined,4)});
  return <div className="vc-page-width vc-discovery-page">
    <section className="vc-discover-hero"><div><span><Compass size={16}/> Discover VoiceCloud</span><h1>Find your next <em>conversation.</em></h1><p>Explore live rooms, people, communities, and scheduled sessions backed by the VoiceCloud platform.</p></div><div className="vc-discover-hero__orb"><Sparkles size={54}/></div></section>
    <div className="vc-category-strip">{categories.map((c,i)=><button key={c} className={i===0?'active':''} type="button" onClick={()=>navigate(c==='All'?'/rooms':`/rooms?category=${encodeURIComponent(c)}`)}>{c}</button>)}</div>
    <section className="vc-discovery-section"><header><div><Radio size={18}/><h2>Featured Live Rooms</h2></div><button onClick={()=>navigate('/rooms')}>View all <ArrowRight size={14}/></button></header>{rooms.isPending?<DiscoveryLoading/>:rooms.isError?<DiscoveryError error={rooms.error}/>:rooms.data?.items.length?<div className="vc-discovery-room-grid">{rooms.data.items.map(r=><RoomCard room={r} key={r.id}/>)}</div>:<DiscoveryEmpty title="No featured rooms yet"/>}</section>
    <div className="vc-discover-lower">
      <section className="vc-mini-panel"><header><div><Users size={17}/><h2>Recommended People</h2></div><button onClick={()=>navigate('/people')}>View all</button></header>{people.isPending?<DiscoveryLoading/>:people.isError?<DiscoveryError error={people.error}/>:people.data?.items.length?<div className="vc-people-mini-list">{people.data.items.map(u=><UserCard user={u} key={u.id}/>)}</div>:<DiscoveryEmpty title="No people suggestions yet"/>}</section>
      <section className="vc-mini-panel"><header><h2>Suggested Communities</h2><button onClick={()=>navigate('/communities')}>View all</button></header>{clubs.isPending?<DiscoveryLoading/>:clubs.isError?<DiscoveryError error={clubs.error}/>:clubs.data?.data.length?<div className="vc-simple-list">{clubs.data.data.map(c=><button key={c.id} onClick={()=>navigate('/communities')}><strong>{c.name}</strong><span>{c.memberCount} members · {c.category}</span></button>)}</div>:<DiscoveryEmpty title="No communities yet"/>}</section>
      <section className="vc-mini-panel"><header><h2>Upcoming Sessions</h2><button onClick={()=>navigate('/events')}>View all</button></header>{scheduled.isPending?<DiscoveryLoading/>:scheduled.isError?<DiscoveryError error={scheduled.error}/>:scheduled.data?.data.length?<div className="vc-simple-list">{scheduled.data.data.map(s=><button key={s.id} onClick={()=>navigate('/events')}><strong>{s.title}</strong><span>{new Date(s.scheduledStartTime).toLocaleString()}</span></button>)}</div>:<DiscoveryEmpty title="No upcoming sessions"/>}</section>
    </div>
  </div>;
}
