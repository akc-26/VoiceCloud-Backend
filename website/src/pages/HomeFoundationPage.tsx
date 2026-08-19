import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Headphones, Mic2, Radio, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GradientButton } from '@/components/common/GradientButton';
import { RoomCard } from '@/components/discovery/RoomCard';
import { UserCard } from '@/components/discovery/UserCard';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';
import { discoveryApi } from '@/features/discovery/discovery.api';

export function HomeFoundationPage() {
  const navigate = useNavigate();
  const rooms = useQuery({ queryKey: ['ph03','home','rooms'], queryFn: () => discoveryApi.liveRooms() });
  const people = useQuery({ queryKey: ['ph03','home','people'], queryFn: () => discoveryApi.trendingUsers(4) });

  return (
    <div className="vc-home vc-page-width">
      <section className="vc-hero">
        <div className="vc-hero__copy">
          <div className="vc-eyebrow"><Sparkles size={15} /> Speak freely. Connect deeply.</div>
          <h1>Where voices <em>become connections.</em></h1>
          <p>Join live conversations, discover incredible people, and be part of communities that sound like you.</p>
          <div className="vc-hero__actions">
            <GradientButton onClick={() => navigate('/rooms')}><Radio size={17} /> Explore Rooms</GradientButton>
            <GradientButton variant="secondary" onClick={() => navigate('/explore')}>Discover VoiceCloud <ArrowRight size={17} /></GradientButton>
          </div>
          <div className="vc-hero__trust">
            <span><Headphones size={17} /> Live conversations</span>
            <span><ShieldCheck size={17} /> Safety first</span>
            <span><Users size={17} /> Real communities</span>
          </div>
        </div>
        <div className="vc-hero-art" aria-hidden="true">
          <div className="vc-hero-art__orbit vc-hero-art__orbit--one" />
          <div className="vc-hero-art__orbit vc-hero-art__orbit--two" />
          <div className="vc-hero-art__mic"><Mic2 size={72} strokeWidth={1.55} /></div>
          <div className="vc-hero-art__avatar vc-hero-art__avatar--one">A</div>
          <div className="vc-hero-art__avatar vc-hero-art__avatar--two">M</div>
          <div className="vc-hero-art__avatar vc-hero-art__avatar--three">J</div>
        </div>
      </section>

      <section className="vc-section vc-discovery-section">
        <div className="vc-section__heading">
          <div><span className="vc-live-dot" /> <h2>Live Now</h2><p>Rooms returned by the VoiceCloud live-room discovery API.</p></div>
          <button type="button" onClick={() => navigate('/rooms')}>View all <ArrowRight size={15} /></button>
        </div>
        {rooms.isPending ? <DiscoveryLoading label="Loading live rooms…"/> : rooms.isError ? <DiscoveryError error={rooms.error}/> : rooms.data?.items.length ? <div className="vc-discovery-room-grid">{rooms.data.items.slice(0,4).map(room => <RoomCard key={room.id} room={room}/>)}</div> : <DiscoveryEmpty title="No rooms are live right now" description="When a host goes live, their room will appear here automatically."/>}
      </section>

      <section className="vc-home-panels">
        <article className="vc-home-panel">
          <div className="vc-home-panel__icon"><Users size={22} /></div>
          <h3>Discover People</h3>
          <p>Find public VoiceCloud profiles using real discovery and profile data.</p>
          <button type="button" onClick={() => navigate('/people')}>Meet people <ArrowRight size={15} /></button>
        </article>
        <article className="vc-home-panel vc-home-panel--feature">
          <div className="vc-home-panel__quote">“</div><h3>Your voice belongs here.</h3><p>Be heard. Be you. Belong.</p>
          <GradientButton onClick={() => navigate('/explore')}>Start Exploring <ArrowRight size={16} /></GradientButton>
        </article>
        <article className="vc-home-panel vc-home-panel--people">
          <div className="vc-home-panel__icon"><Sparkles size={22} /></div><h3>Trending voices</h3>
          {people.isPending ? <small>Loading…</small> : people.data?.items.length ? <div className="vc-home-people">{people.data.items.slice(0,3).map(u=><UserCard key={u.id} user={u}/>)}</div> : <p>No trending profiles yet.</p>}
        </article>
      </section>
    </div>
  );
}
