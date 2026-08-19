import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, LoaderCircle, Smartphone } from 'lucide-react';
import { apiErrorMessage } from '@/api/client';
import { websiteAuthApi } from '@/auth/auth.api';
import { referralFromSearch } from '@/auth/auth-navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthField } from '@/components/auth/AuthField';
import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';

export function PhoneSignInPage(){
 const navigate=useNavigate(); const location=useLocation(); const [phone,setPhone]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);
 async function submit(e:FormEvent){e.preventDefault();if(!/^\+[1-9]\d{1,14}$/.test(phone.trim()))return setError('Enter the phone number in E.164 format, for example +919876543210.');setBusy(true);setError(null);try{const response=await websiteAuthApi.sendPhoneOtp(phone);navigate('/auth/verify',{state:{phoneNumber:phone.trim(),expiresAt:response.expiresAt,resendCooldownSeconds:response.resendCooldownSeconds,developmentOtp:response.otpCode,referralCode:referralFromSearch(location.search)}});}catch(err){setError(apiErrorMessage(err));}finally{setBusy(false)}}
 return <div className="vc-page-width vc-auth-page"><AuthVisualPanel variant="phone"/><AuthCard title="Sign in with your phone" subtitle="VoiceCloud will send a short-lived verification code.">{error?<div className="vc-auth-alert"><AlertCircle size={17}/>{error}</div>:null}<form className="vc-auth-form" onSubmit={submit}><AuthField label="Phone number" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" placeholder="+919876543210" hint="Use full international E.164 format."/><button className="vc-button vc-button--primary vc-auth-submit" disabled={busy}>{busy?<LoaderCircle className="vc-spin" size={18}/>:<Smartphone size={18}/>} Send OTP <ArrowRight size={17}/></button></form><p className="vc-auth-provider-note">Delivery depends on the SMS provider configured by VoiceCloud. Development environments may surface the generated OTP in server-supported development mode.</p></AuthCard></div>
}
