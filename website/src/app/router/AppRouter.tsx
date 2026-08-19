import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/app/guards/RequireAuth';
import { WebsiteShell } from '@/components/layout/WebsiteShell';
import { FeaturePlaceholderPage } from '@/pages/FeaturePlaceholderPage';
import { HomeFoundationPage } from '@/pages/HomeFoundationPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { LiveRoomsPage } from '@/pages/LiveRoomsPage';
import { PeoplePage } from '@/pages/PeoplePage';
import { SearchPage } from '@/pages/SearchPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { MyProfilePage } from '@/pages/MyProfilePage';
import { SocialListPage } from '@/pages/SocialListPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SignInPage } from '@/pages/auth/SignInPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { PhoneSignInPage } from '@/pages/auth/PhoneSignInPage';
import { OtpVerifyPage } from '@/pages/auth/OtpVerifyPage';
import { GuestUpgradePage } from '@/pages/auth/GuestUpgradePage';
import { RestrictedAccountPage } from '@/pages/auth/RestrictedAccountPage';
import { SessionExpiredPage } from '@/pages/auth/SessionExpiredPage';
import { OnboardingPage } from '@/pages/auth/OnboardingPage';

export function AppRouter(){return <Routes><Route element={<WebsiteShell/>}>
<Route index element={<HomeFoundationPage/>}/>
<Route path="/explore" element={<ExplorePage/>}/><Route path="/rooms" element={<LiveRoomsPage/>}/><Route path="/rooms/:roomId" element={<FeaturePlaceholderPage/>}/><Route path="/people" element={<PeoplePage/>}/><Route path="/search" element={<SearchPage/>}/><Route path="/profile/:username" element={<ProfilePage/>}/>
{['/communities','/events','/about'].map(path=><Route key={path} path={path} element={<FeaturePlaceholderPage/>}/>)}
<Route path="/auth/sign-in" element={<SignInPage/>}/><Route path="/auth/register" element={<RegisterPage/>}/><Route path="/auth/phone" element={<PhoneSignInPage/>}/><Route path="/auth/verify" element={<OtpVerifyPage/>}/><Route path="/auth/restricted" element={<RestrictedAccountPage/>}/><Route path="/auth/session-expired" element={<SessionExpiredPage/>}/>
<Route element={<RequireAuth/>}><Route path="/me" element={<MyProfilePage/>}/><Route path="/followers" element={<SocialListPage mode="followers"/>}/><Route path="/following" element={<SocialListPage mode="following"/>}/><Route path="/friends" element={<FriendsPage/>}/>{['/messages','/notifications','/settings'].map(path=><Route key={path} path={path} element={<FeaturePlaceholderPage/>}/>)}<Route path="/auth/guest/upgrade" element={<GuestUpgradePage/>}/><Route path="/onboarding" element={<OnboardingPage/>}/></Route>
<Route path="*" element={<NotFoundPage/>}/></Route></Routes>}
