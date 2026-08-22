import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/app/guards/RequireAuth';
import { WebsiteShell } from '@/components/layout/WebsiteShell';
import { FeaturePlaceholderPage } from '@/pages/FeaturePlaceholderPage';
import { HomeFoundationPage } from '@/pages/HomeFoundationPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { LiveRoomsPage } from '@/pages/LiveRoomsPage';
import { RoomDetailsPage } from '@/pages/RoomDetailsPage';
import { RoomExperiencePage } from '@/pages/RoomExperiencePage';
import { PeoplePage } from '@/pages/PeoplePage';
import { SearchPage } from '@/pages/SearchPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { MyProfilePage } from '@/pages/MyProfilePage';
import { SocialListPage } from '@/pages/SocialListPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { CommunitiesPage } from '@/pages/CommunitiesPage';
import { CommunityDetailsPage } from '@/pages/CommunityDetailsPage';
import { CommunityMembersPage } from '@/pages/CommunityMembersPage';
import { CommunityRoomsPage } from '@/pages/CommunityRoomsPage';
import { EventsPage } from '@/pages/EventsPage';
import { EventDetailsPage } from '@/pages/EventDetailsPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { ConversationPage } from '@/pages/ConversationPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SignInPage } from '@/pages/auth/SignInPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { PhoneSignInPage } from '@/pages/auth/PhoneSignInPage';
import { OtpVerifyPage } from '@/pages/auth/OtpVerifyPage';
import { GuestUpgradePage } from '@/pages/auth/GuestUpgradePage';
import { RestrictedAccountPage } from '@/pages/auth/RestrictedAccountPage';
import { SessionExpiredPage } from '@/pages/auth/SessionExpiredPage';
import { OnboardingPage } from '@/pages/auth/OnboardingPage';
import { MyRoomsPage } from '@/pages/MyRoomsPage';
import { CreateRoomPage } from '@/pages/CreateRoomPage';
import { RoomSettingsPage } from '@/pages/RoomSettingsPage';
import { HostSchedulePage } from '@/pages/HostSchedulePage';


export function AppRouter(){return <Routes><Route element={<WebsiteShell/>}>
<Route index element={<HomeFoundationPage/>}/>
<Route path="/explore" element={<ExplorePage/>}/><Route path="/rooms" element={<LiveRoomsPage/>}/><Route path="/rooms/:roomId" element={<RoomDetailsPage/>}/><Route element={<RequireAuth/>}><Route path="/rooms/:roomId/live" element={<RoomExperiencePage/>}/></Route><Route path="/people" element={<PeoplePage/>}/><Route path="/search" element={<SearchPage/>}/><Route path="/profile/:username" element={<ProfilePage/>}/>
<Route path="/communities" element={<CommunitiesPage/>}/><Route path="/communities/:communityId" element={<CommunityDetailsPage/>}/><Route path="/communities/:communityId/members" element={<CommunityMembersPage/>}/><Route path="/communities/:communityId/rooms" element={<CommunityRoomsPage/>}/><Route path="/events" element={<EventsPage/>}/><Route path="/events/:eventId" element={<EventDetailsPage/>}/><Route path="/about" element={<FeaturePlaceholderPage/>}/>
<Route path="/auth/sign-in" element={<SignInPage/>}/><Route path="/auth/register" element={<RegisterPage/>}/><Route path="/auth/phone" element={<PhoneSignInPage/>}/><Route path="/auth/verify" element={<OtpVerifyPage/>}/><Route path="/auth/restricted" element={<RestrictedAccountPage/>}/><Route path="/auth/session-expired" element={<SessionExpiredPage/>}/>
<Route element={<RequireAuth/>}><Route path="/me" element={<MyProfilePage/>}/><Route path="/followers" element={<SocialListPage mode="followers"/>}/><Route path="/following" element={<SocialListPage mode="following"/>}/><Route path="/friends" element={<FriendsPage/>}/><Route path="/messages" element={<MessagesPage/>}/><Route path="/messages/:conversationId" element={<ConversationPage/>}/><Route path="/notifications" element={<NotificationsPage/>}/><Route path="/settings" element={<FeaturePlaceholderPage/>}/><Route path="/auth/guest/upgrade" element={<GuestUpgradePage/>}/><Route path="/onboarding" element={<OnboardingPage/>}/><Route path="/host/rooms" element={<MyRoomsPage/>}/><Route path="/host/rooms/create" element={<CreateRoomPage/>}/><Route path="/host/rooms/:roomId/settings" element={<RoomSettingsPage/>}/><Route path="/host/schedule" element={<HostSchedulePage/>}/></Route>
<Route path="*" element={<NotFoundPage/>}/></Route></Routes>}
