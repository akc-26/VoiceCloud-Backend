import { ArrowRight, Headphones, Mic2, Radio, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GradientButton } from '@/components/common/GradientButton';

const liveRooms = [
  ['Midnight Talkers', 'Deep talks, real vibes', '1.2K', 'room-card--midnight'],
  ['Chill Café', 'Relax, unwind, sip', '532', 'room-card--sunset'],
  ['Poetry & Piano', 'Words. Music. Feelings.', '799', 'room-card--cosmic'],
  ['Creators Connect', 'Share. Learn. Grow.', '1.6K', 'room-card--violet'],
] as const;

export function HomeFoundationPage() {
  const navigate = useNavigate();

  return (
    <div className="vc-home vc-page-width">
      <section className="vc-hero">
        <div className="vc-hero__copy">
          <div className="vc-eyebrow"><Sparkles size={15} /> Speak freely. Connect deeply.</div>
          <h1>Where voices <em>become connections.</em></h1>
          <p>Join live conversations, discover incredible people, and be part of communities that sound like you.</p>
          <div className="vc-hero__actions">
            <GradientButton onClick={() => navigate('/rooms')}><Radio size={17} /> Explore Rooms</GradientButton>
            <GradientButton variant="secondary" onClick={() => navigate('/communities')}>Discover Communities <ArrowRight size={17} /></GradientButton>
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

      <section className="vc-section">
        <div className="vc-section__heading">
          <div><span className="vc-live-dot" /> <h2>Live Now</h2><p>Jump into conversations happening right now.</p></div>
          <button type="button" onClick={() => navigate('/rooms')}>View all <ArrowRight size={15} /></button>
        </div>
        <div className="vc-room-grid">
          {liveRooms.map(([title, subtitle, listeners, artClass]) => (
            <article className="vc-room-card" key={title}>
              <div className={`vc-room-card__art ${artClass}`}>
                <span className="vc-room-card__live">LIVE</span>
                <span className="vc-room-card__listeners">◉ {listeners}</span>
                <div className="vc-room-card__wave" />
              </div>
              <div className="vc-room-card__body">
                <h3>{title}</h3>
                <p>{subtitle}</p>
                <button type="button" onClick={() => navigate('/rooms')}>Join Room <Mic2 size={14} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="vc-home-panels">
        <article className="vc-home-panel">
          <div className="vc-home-panel__icon"><Users size={22} /></div>
          <h3>Trending Communities</h3>
          <p>Find communities built around conversations you actually want to have.</p>
          <button type="button" onClick={() => navigate('/communities')}>Explore communities <ArrowRight size={15} /></button>
        </article>
        <article className="vc-home-panel vc-home-panel--feature">
          <div className="vc-home-panel__quote">“</div>
          <h3>Your voice belongs here.</h3>
          <p>Be heard. Be you. Belong.</p>
          <GradientButton onClick={() => navigate('/rooms')}>Join a Room Now <ArrowRight size={16} /></GradientButton>
        </article>
        <article className="vc-home-panel">
          <div className="vc-home-panel__icon"><Sparkles size={22} /></div>
          <h3>Recommended People</h3>
          <p>Discover hosts and listeners who share the things you care about.</p>
          <button type="button" onClick={() => navigate('/people')}>Meet people <ArrowRight size={15} /></button>
        </article>
      </section>
    </div>
  );
}
