import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/app/guards/RequireAuth';
import { WebsiteShell } from '@/components/layout/WebsiteShell';
import { FeaturePlaceholderPage } from '@/pages/FeaturePlaceholderPage';
import { HomeFoundationPage } from '@/pages/HomeFoundationPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SignInPage } from '@/pages/auth/SignInPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { PhoneSignInPage } from '@/pages/auth/PhoneSignInPage';
import { OtpVerifyPage } from '@/pages/auth/OtpVerifyPage';
import { GuestUpgradePage } from '@/pages/auth/GuestUpgradePage';
import { RestrictedAccountPage } from '@/pages/auth/RestrictedAccountPage';
import { SessionExpiredPage } from '@/pages/auth/SessionExpiredPage';
import { OnboardingPage } from '@/pages/auth/OnboardingPage';

const publicFeatureRoutes = ['/explore','/rooms','/communities','/people','/events','/about','/search'] as const;
const protectedFeatureRoutes = ['/messages','/notifications','/me','/settings'] as const;

export function AppRouter(){return <Routes><Route element={<WebsiteShell/>}><Route index element={<HomeFoundationPage/>}/>{publicFeatureRoutes.map(path=><Route key={path} path={path} element={<FeaturePlaceholderPage/>}/>)}
<Route path="/auth/sign-in" element={<SignInPage/>}/><Route path="/auth/register" element={<RegisterPage/>}/><Route path="/auth/phone" element={<PhoneSignInPage/>}/><Route path="/auth/verify" element={<OtpVerifyPage/>}/><Route path="/auth/restricted" element={<RestrictedAccountPage/>}/><Route path="/auth/session-expired" element={<SessionExpiredPage/>}/>
<Route element={<RequireAuth/>}>{protectedFeatureRoutes.map(path=><Route key={path} path={path} element={<FeaturePlaceholderPage/>}/>)}<Route path="/auth/guest/upgrade" element={<GuestUpgradePage/>}/><Route path="/onboarding" element={<OnboardingPage/>}/></Route><Route path="*" element={<NotFoundPage/>}/></Route></Routes>}
