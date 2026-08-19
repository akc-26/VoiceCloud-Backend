import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react';
import { apiErrorMessage } from '@/api/client';
import { websiteAuthApi } from '@/auth/auth.api';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthField } from '@/components/auth/AuthField';
import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';

export function RegisterPage(){
 const navigate=useNavigate(); const setAuth=useWebsiteAuthStore(s=>s.setAuthResponse);
 const [form,setForm]=useState({displayName:'',username:'',email:'',password:''}); const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
 const update=(key:keyof typeof form)=>(e:React.ChangeEvent<HTMLInputElement>)=>setForm(v=>({...v,[key]:e.target.value}));
 async function submit(e:FormEvent){e.preventDefault(); if(!form.displayName.trim()||!form.username.trim()||!form.email.trim()||!form.password)return setError('Complete all required account fields.'); if(form.password.length<8)return setError('Password must be at least 8 characters.'); setBusy(true);setError(null);try{const auth=await websiteAuthApi.register(form);setAuth(auth);navigate('/onboarding',{replace:true});}catch(err){setError(apiErrorMessage(err));}finally{setBusy(false)}}
 return <div className="vc-page-width vc-auth-page"><AuthVisualPanel eyebrow="Your VoiceCloud identity" title="Make a space for your voice." copy="Create one account for live rooms, communities, messaging and the wider VoiceCloud experience."/><AuthCard title="Create your account" subtitle="These four fields match the authoritative registration contract.">
 {error?<div className="vc-auth-alert"><AlertCircle size={17}/>{error}</div>:null}<form className="vc-auth-form vc-auth-form--two" onSubmit={submit}><AuthField label="Display name" value={form.displayName} onChange={update('displayName')} autoComplete="name" placeholder="Ava Chen"/><AuthField label="Username" value={form.username} onChange={update('username')} autoComplete="username" placeholder="avachenspeaks"/><AuthField label="Email address" type="email" value={form.email} onChange={update('email')} autoComplete="email" placeholder="ava@example.com"/><AuthField label="Password" type="password" value={form.password} onChange={update('password')} autoComplete="new-password" hint="Minimum 8 characters"/><button className="vc-button vc-button--primary vc-auth-submit vc-auth-submit--wide" disabled={busy}>{busy?<LoaderCircle className="vc-spin" size={18}/>:null} Create Account <ArrowRight size={17}/></button></form>
 <p className="vc-auth-legal">By creating an account, you agree to the VoiceCloud Terms of Service and Privacy Policy.</p><p className="vc-auth-switch">Already have an account? <Link to="/auth/sign-in">Sign in</Link></p>
 </AuthCard></div>
}
