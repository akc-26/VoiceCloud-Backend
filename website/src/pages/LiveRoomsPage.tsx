import { useQuery } from '@tanstack/react-query';
import { Filter, Grid2X2, Mic2, Radio, SlidersHorizontal } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { discoveryApi } from '@/features/discovery/discovery.api';
import { RoomCard } from '@/components/discovery/RoomCard';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';

const categories=['All','Talk','Music','Mind & Body','Culture','Technology','Business','Stories'];
export function LiveRoomsPage(){
  const location=useLocation();
  const [params,setParams]=useSearchParams();
  const category=params.get('category')||'';
  const query=useQuery({queryKey:['ph03','live-rooms',category],queryFn:()=>discoveryApi.liveRooms(category||undefined)});
  const routeNotice=(location.state as {notice?:string}|null)?.notice;
  return <div className="vc-page-width vc-discovery-page">
    {routeNotice?<div className="vc-inline-success" role="status" aria-live="polite">{routeNotice}</div>:null}
    <section className="vc-live-hero"><div><span><Radio size={15}/> Live discovery</span><h1>Live <em>Rooms</em></h1><p>Join conversations happening now. Room access remains server-authoritative.</p></div><div className="vc-live-hero__mic"><Mic2 size={74}/></div></section>
    <div className="vc-room-toolbar"><div className="vc-room-toolbar__tabs"><button className="active"><i/>Live Now</button><button disabled>Scheduled</button><button disabled>Following</button><button disabled>Popular</button></div><div><Filter size={16}/><span>{query.data?.total ?? 0} live rooms</span><Grid2X2 size={18}/></div></div>
    <div className="vc-category-strip vc-category-strip--rooms"><SlidersHorizontal size={18}/>{categories.map(c=><button key={c} className={(c==='All'&&!category)||c===category?'active':''} onClick={()=>setParams(c==='All'?{}:{category:c})}>{c}</button>)}</div>
    {query.isPending?<DiscoveryLoading label="Finding live rooms…"/>:query.isError?<DiscoveryError error={query.error}/>:query.data?.items.length?<div className="vc-live-room-layout"><div className="vc-live-room-main"><div className="vc-live-room-grid">{query.data.items.map(r=><RoomCard room={r} key={r.id}/>)}</div></div><aside className="vc-live-room-aside"><h3>Today’s highlights</h3>{query.data.items.slice(0,5).map((r,i)=><div key={r.id}><b>{i+1}</b><span><strong>{r.title}</strong><small>{r.listenerCount} listening</small></span></div>)}</aside></div>:<DiscoveryEmpty title="No live rooms match these filters" description="Try another category or check back when a host goes live."/>}
  </div>;
}
