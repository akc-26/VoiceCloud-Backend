import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react';
import { apiErrorMessage } from '@/api/client';
import { websiteAuthApi } from '@/auth/auth.api';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthField } from '@/components/auth/AuthField';
import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';

export function GuestUpgradePage(){
 const user=useWebsiteAuthStore(s=>s.user);const setAuth=useWebsiteAuthStore(s=>s.setAuthResponse);const navigate=useNavigate();
 const [displayName,setDisplayName]=useState(user?.displayName??'');const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);
 if(!user)return <Navigate replace to="/auth/sign-in"/>; if(!user.isGuest)return <Navigate replace to="/"/>;
 async function submit(e:FormEvent){e.preventDefault();if(!email.trim()||password.length<8)return setError('Enter a valid email and a password of at least 8 characters.');setBusy(true);setError(null);try{const auth=await websiteAuthApi.upgradeGuest({method:'email',displayName:displayName.trim()||undefined,email:email.trim().toLowerCase(),password});setAuth(auth);navigate('/onboarding',{replace:true});}catch(err){setError(apiErrorMessage(err));}finally{setBusy(false)}}
 return <div className="vc-page-width vc-auth-page"><AuthVisualPanel eyebrow="Keep your guest progress" title="Turn this visit into your VoiceCloud account." copy="Upgrade the active guest identity using the backend-supported account conversion flow."/><AuthCard title="Upgrade guest account" subtitle="Add permanent email credentials while keeping this guest account identity.">{error?<div className="vc-auth-alert"><AlertCircle size={17}/>{error}</div>:null}<div className="vc-guest-summary"><span>{user.displayName.slice(0,1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>@{user.username} · Guest session</small></div></div><form className="vc-auth-form" onSubmit={submit}><AuthField label="Display name" value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name"/><AuthField label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/><AuthField label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" hint="Minimum 8 characters"/><button className="vc-button vc-button--primary vc-auth-submit" disabled={busy}>{busy?<LoaderCircle className="vc-spin" size={18}/>:null} Upgrade Account <ArrowRight size={17}/></button></form><p className="vc-auth-provider-note">The existing guest username is preserved because the current backend guest-upgrade contract does not accept a username replacement.</p></AuthCard></div>
}
