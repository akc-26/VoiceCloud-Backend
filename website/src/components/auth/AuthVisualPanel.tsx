import { Headphones, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { WEBSITE_BRAND } from '@/branding';

type AuthVisualPanelProps = {
  variant?: 'standard' | 'phone';
  eyebrow?: string;
  title?: string;
  copy?: string;
};

export function AuthVisualPanel({
  variant = 'standard',
  eyebrow,
  title,
  copy,
}: AuthVisualPanelProps) {
  const content = variant === 'phone'
    ? {
          image: '/website/auth/poetry.jpg',
          eyebrow: eyebrow ?? 'Secure phone access',
          title: title ?? 'One code. Back to the conversation.',
          copy: copy ?? 'VoiceCloud uses short-lived OTP verification for supported phone sign-in.',
        }
    : {
          image: '/website/auth/midnight.jpg',
          eyebrow: eyebrow ?? 'Real voices. Real connections.',
          title: title ?? 'Come back to the conversation.',
          copy: copy ?? 'Join live rooms, follow people you care about and keep every conversation within reach.',
        };

  return (
    <aside className={`vc-auth-visual vc-auth-visual--${variant}`}>
      <img className="vc-auth-visual__image" src={content.image} alt="" />
      <div className="vc-auth-visual__veil" />
      <div className="vc-auth-visual__content">
        <span className="vc-auth-visual__eyebrow"><Sparkles size={15} /> {content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.copy}</p>
        <div className="vc-auth-visual__signals" aria-label={`${WEBSITE_BRAND.identity.name} benefits`}>
          <span><Headphones size={16} /> Live voice</span>
          <span><UsersRound size={16} /> Real people</span>
          <span><ShieldCheck size={16} /> Secure access</span>
        </div>
      </div>
    </aside>
  );
}
