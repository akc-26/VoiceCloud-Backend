import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { discoveryApi } from '@/features/discovery/discovery.api';
import { visibleConsumerUsers } from '@/features/discovery/consumer-users';
import { RoomCard } from '@/components/discovery/RoomCard';
import { UserCard } from '@/components/discovery/UserCard';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';

export function SearchPage() {
  const navigate = useNavigate();
  const currentUser = useWebsiteAuthStore((state) => state.user);
  const [params, setParams] = useSearchParams();
  const queryValue = params.get('q') || '';
  const [input, setInput] = useState(queryValue);

  useEffect(() => setInput(queryValue), [queryValue]);

  const enabled = queryValue.trim().length > 0;
  const global = useQuery({
    queryKey: ['ph03', 'search', 'global', queryValue],
    queryFn: () => discoveryApi.globalSearch(queryValue),
    enabled,
  });
  const clubs = useQuery({
    queryKey: ['ph03', 'search', 'clubs', queryValue],
    queryFn: () => discoveryApi.clubs(queryValue, 8),
    enabled,
  });
  const events = useQuery({
    queryKey: ['ph03', 'search', 'scheduled', queryValue],
    queryFn: () => discoveryApi.scheduled(queryValue, 8),
    enabled,
  });

  // Consumer search is intentionally self-excluding. Searching your own display
  // name/username must not return your own account as a discoverable person.
  const peopleResults = useMemo(
    () => visibleConsumerUsers(global.data?.results.users?.items, currentUser),
    [global.data?.results.users?.items, currentUser?.id, currentUser?.username],
  );
  const counts = useMemo(
    () => ({
      rooms: global.data?.results.rooms?.total || 0,
      people: peopleResults.length,
      clubs: clubs.data?.total || 0,
      events: events.data?.total || 0,
    }),
    [global.data, peopleResults.length, clubs.data, events.data],
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = input.trim();
    setParams(q ? { q } : {});
  }

  return <div className="vc-page-width vc-search-page">
    <section className="vc-search-hero"><div><span>Search VoiceCloud</span><h1>{enabled ? <>Results for <em>“{queryValue}”</em></> : <>Find rooms, people and communities.</>}</h1><p>Search results are returned by VoiceCloud’s canonical search, club, and scheduled-room APIs.</p></div><Search size={72}/></section>
    <form className="vc-search-input" onSubmit={submit}><Search size={20}/><input value={input} onChange={e => setInput(e.target.value)} placeholder="Search VoiceCloud"/><button>Search</button></form>
    {!enabled ? <DiscoveryEmpty title="Start searching" description="Enter a room title, person, community, or topic."/> : global.isPending || clubs.isPending || events.isPending ? <DiscoveryLoading label="Searching VoiceCloud…"/> : global.isError ? <DiscoveryError error={global.error}/> : <>
      <div className="vc-search-counts"><span>{counts.rooms} Rooms</span><span>{counts.people} People</span><span>{counts.clubs} Communities</span><span>{counts.events} Scheduled sessions</span></div>
      <section className="vc-discovery-section"><header><h2>Rooms</h2></header>{global.data?.results.rooms?.items.length ? <div className="vc-discovery-room-grid">{global.data.results.rooms.items.slice(0, 8).map(r => <RoomCard room={r} compact key={r.id}/>)}</div> : <DiscoveryEmpty title="No matching rooms"/>}</section>
      <section className="vc-discovery-section"><header><div><Users size={17}/><h2>People</h2></div></header>{peopleResults.length ? <div className="vc-person-grid">{peopleResults.slice(0, 8).map(u => <UserCard user={u} key={u.id}/>)}</div> : <DiscoveryEmpty title="No matching people"/>}</section>
      <div className="vc-discover-lower vc-search-secondary"><section className="vc-mini-panel"><header><h2>Communities</h2></header>{clubs.isError ? <DiscoveryError error={clubs.error}/> : clubs.data?.data.length ? <div className="vc-simple-list">{clubs.data.data.map(c => <button type="button" key={c.id} onClick={() => navigate(`/communities/${c.handle || c.id}`)}><strong>{c.name}</strong><span>{c.memberCount} members · {c.category}</span></button>)}</div> : <DiscoveryEmpty title="No matching communities"/>}</section><section className="vc-mini-panel"><header><h2>Scheduled Sessions</h2></header>{events.isError ? <DiscoveryError error={events.error}/> : events.data?.data.length ? <div className="vc-simple-list">{events.data.data.map(s => <button type="button" key={s.id} onClick={() => navigate(`/events/${s.id}`)}><strong>{s.title}</strong><span>{new Date(s.scheduledStartTime).toLocaleString()}</span></button>)}</div> : <DiscoveryEmpty title="No matching scheduled sessions"/>}</section></div>
    </>}
  </div>;
}
