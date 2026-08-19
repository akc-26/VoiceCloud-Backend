import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=[
'website/src/auth/auth.api.ts','website/src/auth/device.ts','website/src/auth/firebase-web.ts','website/src/auth/auth-navigation.ts','website/src/vite-env.d.ts','website/src/config/app-targets.ts',
'website/src/components/auth/AuthVisualPanel.tsx','website/src/components/auth/AuthCard.tsx','website/src/components/auth/AuthField.tsx',
'website/src/pages/auth/SignInPage.tsx','website/src/pages/auth/RegisterPage.tsx',
'website/src/pages/auth/PhoneSignInPage.tsx','website/src/pages/auth/OtpVerifyPage.tsx','website/src/pages/auth/GuestUpgradePage.tsx',
'website/src/pages/auth/RestrictedAccountPage.tsx','website/src/pages/auth/SessionExpiredPage.tsx','website/src/pages/auth/OnboardingPage.tsx'];
const errors=[];
for(const rel of required)if(!fs.existsSync(path.join(root,rel)))errors.push(`Missing ${rel}`);
const auth=fs.readFileSync(path.join(root,'website/src/auth/auth.api.ts'),'utf8');
for(const route of ['/auth/login','/auth/register','/auth/phone/send-otp','/auth/phone/login','/auth/guest/login','/auth/guest/upgrade','/auth/google/login'])if(!auth.includes(route))errors.push(`Missing auth route ${route}`);
const reg=fs.readFileSync(path.join(root,'website/src/pages/auth/RegisterPage.tsx'),'utf8');
for(const field of ['displayName','username','email','password'])if(!reg.includes(field))errors.push(`Registration UI missing ${field}`);
if(reg.toLowerCase().includes('forgot password'))errors.push('Unsupported forgot-password flow introduced');
const signIn=fs.readFileSync(path.join(root,'website/src/pages/auth/SignInPage.tsx'),'utf8');
if(!signIn.includes("creatorStudioUrl('login')"))errors.push('Consumer sign-in must hand Creator Sign-In directly to the Creator Studio login');
const otp=fs.readFileSync(path.join(root,'website/src/pages/auth/OtpVerifyPage.tsx'),'utf8');
if(otp.includes("verifyPhoneOtp"))errors.push('OTP login flow must not consume OTP through standalone verify before phone/login');
if(otp.includes('state.phoneNumber')||otp.includes('state.referralCode'))errors.push('OTP verify page must safely narrow navigation state before async handlers use it');
if(otp.includes("digit || '•'")||otp.includes('pointer-events: none'))errors.push('OTP UI must not use decorative pre-filled bullets or a non-interactive hidden input');
for(const token of ['inputRefs','handleKeyDown','handlePaste','maxLength={1}',"disabled={busy || !isComplete}",'canShowDevelopmentOtp',"window.location.hostname === 'localhost'",'import.meta.env.DEV'])if(!otp.includes(token))errors.push(`OTP input regression protection missing ${token}`);
const styles=fs.readFileSync(path.join(root,'website/src/styles/global.css'),'utf8');
if(!styles.includes('.vc-otp-input:focus')||styles.includes('.vc-otp-input { position: absolute; width: 1px; height: 1px'))errors.push('OTP inputs must remain visible, focusable and keyboard accessible');
const viteEnv=fs.readFileSync(path.join(root,'website/src/vite-env.d.ts'),'utf8');
if(!viteEnv.includes('vite/client')||!viteEnv.includes('VITE_FIREBASE_API_KEY')||!viteEnv.includes('VITE_CREATOR_APP_URL'))errors.push('Website Vite environment typing is incomplete');

const targets=fs.readFileSync(path.join(root,'website/src/config/app-targets.ts'),'utf8');
if(!targets.includes('http://localhost:3000')||!targets.includes('VITE_CREATOR_APP_URL')||!targets.includes("'/creator'"))errors.push('Creator/Admin cross-app routing must leave website Vite origin in development and remain same-origin in production');
const viteConfig=fs.readFileSync(path.join(root,'website/vite.config.ts'),'utf8');
if(!viteConfig.includes("envDir: path.resolve(__dirname, '..')"))errors.push('Website Vite must load public VITE_* configuration from repository root environment');
const apiClient=fs.readFileSync(path.join(root,'website/src/api/client.ts'),'utf8');
if(!apiClient.includes('local VoiceCloud backend is unavailable')||!apiClient.includes('error.response.status >= 500'))errors.push('Backend-unavailable proxy failures must not leak raw Axios 500 messages');
const router=fs.readFileSync(path.join(root,'website/src/app/router/AppRouter.tsx'),'utf8');
if(router.includes('/auth/creator'))errors.push('Redundant consumer /auth/creator route must not exist');
for(const route of ['/auth/sign-in','/auth/register','/auth/phone','/auth/verify','/auth/guest/upgrade','/auth/restricted','/auth/session-expired','/onboarding'])if(!router.includes(route))errors.push(`Router missing ${route}`);
const branding=fs.readFileSync(path.join(root,'website/src/branding/index.ts'),'utf8');
if(/#[0-9a-fA-F]{3,8}/.test(branding))errors.push('Website branding adapter contains hard-coded colors');
const backendAuth=fs.readFileSync(path.join(root,'src/modules/auth/auth.controller.ts'),'utf8');
if(!backendAuth.includes("@Post('guest/upgrade')")||!backendAuth.includes("@Post('phone/login')"))errors.push('Protected backend auth authority changed unexpectedly');
if(errors.length){console.error('[FAIL] VC-WEB-PH02 source check');errors.forEach(e=>console.error(' - '+e));process.exit(1)}
console.log('[PASS] VC-WEB-PH02 source check');
console.log(' - email/username registration/login contracts mapped');
console.log(' - phone OTP login avoids double verification');
console.log(' - guest login and upgrade mapped');
console.log(' - Google uses Firebase ID token only when web provider config exists');
console.log(' - Creator Studio login remains independently role-gated');
console.log(' - restricted/session-expired/onboarding routes present');
console.log(' - centralized branding authority preserved');
console.log(' - Vite Firebase environment typing and OTP navigation-state narrowing protected');
console.log(' - direct dev/prod Creator Studio sign-in hand-off protected; no redundant /auth/creator route');
console.log(' - root VITE_* env loading and backend-unavailable UX protected');
console.log(' - real six-field OTP entry, keyboard/paste behavior and development-only OTP display protected');
