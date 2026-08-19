import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react';
import { apiErrorMessage } from '@/api/client';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthField } from '@/components/auth/AuthField';
import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';
import { websiteAuthApi } from '@/auth/auth.api';
import { acquireGoogleFirebaseIdToken, isGoogleWebSignInConfigured } from '@/auth/firebase-web';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { referralFromSearch, returnToFromLocation } from '@/auth/auth-navigation';
import { creatorStudioUrl } from '@/config/app-targets';

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuthResponse = useWebsiteAuthStore((s) => s.setAuthResponse);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'password'|'google'|'guest'|null>(null);
  const [error, setError] = useState<string | null>(null);
  const referral = referralFromSearch(location.search);

  async function complete(action: () => Promise<Awaited<ReturnType<typeof websiteAuthApi.login>>>, destination?: string) {
    try {
      setError(null);
      const auth = await action();
      setAuthResponse(auth);
      navigate(destination ?? returnToFromLocation(location), { replace: true });
    } catch (err: unknown) {
      const message = apiErrorMessage(err);
      if (/locked|restricted|suspended|insufficient/i.test(message)) {
        navigate('/auth/restricted', { replace: true, state: { message } });
        return;
      }
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || !password) return setError('Enter your email or username and password.');
    setBusy('password');
    void complete(() => websiteAuthApi.login({ identifier, password }));
  }

  function googleSignIn() {
    setBusy('google');
    void complete(async () => websiteAuthApi.googleLogin(await acquireGoogleFirebaseIdToken(), referral));
  }

  function guestSignIn() {
    setBusy('guest');
    void complete(() => websiteAuthApi.guestLogin(referral));
  }

  return (
    <div className="vc-page-width vc-auth-page">
      <AuthVisualPanel />
      <AuthCard title="Welcome back" subtitle="Sign in with your email or username to continue.">
        {error ? <div className="vc-auth-alert"><AlertCircle size={17} />{error}</div> : null}
        <form className="vc-auth-form" onSubmit={submit}>
          <AuthField label="Email or username" value={identifier} onChange={(e)=>setIdentifier(e.target.value)} autoComplete="username" placeholder="ava@example.com or avachenspeaks" />
          <AuthField label="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Your password" />
          <button className="vc-button vc-button--primary vc-auth-submit" disabled={Boolean(busy)}>{busy==='password'?<LoaderCircle className="vc-spin" size={18}/>:null} Sign In <ArrowRight size={17}/></button>
        </form>
        <div className="vc-auth-divider"><span>or</span></div>
        <div className="vc-auth-stack">
          <button className="vc-button vc-button--secondary vc-auth-submit" type="button" disabled={Boolean(busy) || !isGoogleWebSignInConfigured()} onClick={googleSignIn}>{busy==='google'?<LoaderCircle className="vc-spin" size={18}/>:null} Continue with Google</button>
          <button className="vc-button vc-button--secondary vc-auth-submit" type="button" disabled={Boolean(busy)} onClick={guestSignIn}>{busy==='guest'?<LoaderCircle className="vc-spin" size={18}/>:null} Continue as Guest</button>
        </div>
        {!isGoogleWebSignInConfigured() ? <p className="vc-auth-provider-note">Google sign-in appears only when the public Firebase web configuration is provided.</p> : null}
        <div className="vc-auth-links"><Link to="/auth/phone">Use phone OTP</Link><a href={creatorStudioUrl('login')}>Creator Sign-In</a></div>
        <p className="vc-auth-switch">New to VoiceCloud? <Link to="/auth/register">Create an account</Link></p>
      </AuthCard>
    </div>
  );
}
