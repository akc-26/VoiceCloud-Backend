import { ArrowLeft, Construction } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const labels: Record<string, string> = {
  '/explore': 'Explore',
  '/rooms': 'Live Rooms',
  '/communities': 'Communities',
  '/people': 'People & Creators',
  '/events': 'Events',
  '/about': 'About VoiceCloud',
  '/search': 'Search',
  '/messages': 'Messages',
  '/notifications': 'Notifications',
  '/me': 'My Profile',
  '/settings': 'Settings',
  '/auth/sign-in': 'Sign In',
  '/auth/register': 'Create Account',
  '/auth/phone': 'Phone Sign-In',
  '/auth/verify': 'OTP Verification',
  '/onboarding': 'Welcome to VoiceCloud',
};

export function FeaturePlaceholderPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = labels[pathname] ?? 'VoiceCloud';

  return (
    <section className="vc-placeholder vc-page-width">
      <div className="vc-placeholder__card">
        <div className="vc-placeholder__icon"><Construction size={30} /></div>
        <span className="vc-eyebrow">Implementation roadmap</span>
        <h1>{title}</h1>
        <p>This route is wired into the PH01 application shell. Its approved design and backend integration are implemented in the assigned feature phase.</p>
        <button type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Go back</button>
      </div>
    </section>
  );
}
