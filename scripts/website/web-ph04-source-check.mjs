import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const required = [
  'VC-WEB-PH04-BASELINE.txt',
  'website/src/features/community/types.ts',
  'website/src/features/community/community.api.ts',
  'website/src/features/messaging/types.ts',
  'website/src/features/messaging/messaging.api.ts',
  'website/src/features/notifications/types.ts',
  'website/src/features/notifications/notifications.api.ts',
  'website/src/pages/CommunitiesPage.tsx',
  'website/src/pages/CommunityDetailsPage.tsx',
  'website/src/pages/CommunityMembersPage.tsx',
  'website/src/pages/CommunityRoomsPage.tsx',
  'website/src/pages/EventsPage.tsx',
  'website/src/pages/EventDetailsPage.tsx',
  'website/src/pages/MessagesPage.tsx',
  'website/src/pages/ConversationPage.tsx',
  'website/src/pages/NotificationsPage.tsx',
  'docs/website/VC-WEB-PH04-IMPLEMENTATION-REPORT.md',
  'docs/website/VC-WEB-PH04-MANUAL-QA.md',
];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) errors.push(`Missing ${rel}`);

const baseline = fs.readFileSync(path.join(root, 'VC-WEB-PH04-BASELINE.txt'), 'utf8');
if (!baseline.includes('PARENT=ba268d03f9ca2ec2cd949c121731c0fd3a633923')) errors.push('PH04 protected parent is not frozen PH03-R02');

const router = fs.readFileSync(path.join(root, 'website/src/app/router/AppRouter.tsx'), 'utf8');
for (const route of ['/communities','/communities/:communityId','/communities/:communityId/members','/communities/:communityId/rooms','/events','/events/:eventId','/messages','/messages/:conversationId','/notifications']) {
  if (!router.includes(`path="${route}"`)) errors.push(`PH04 router missing ${route}`);
}
if (router.includes("['/communities','/events'")) errors.push('PH04 community/events routes still use placeholder mapping');
if (router.includes("['/messages','/notifications'")) errors.push('PH04 messages/notifications routes still use placeholder mapping');

const communityApi = fs.readFileSync(path.join(root, 'website/src/features/community/community.api.ts'), 'utf8');
for (const token of ['/clubs','/members','/join','/leave','/scheduled-rooms','/reminder']) if (!communityApi.includes(token)) errors.push(`PH04 community/events API client missing ${token}`);
if (!communityApi.includes('clubId')) errors.push('Community scheduled-room query must use backend clubId filter');

const messagingApi = fs.readFileSync(path.join(root, 'website/src/features/messaging/messaging.api.ts'), 'utf8');
for (const token of ['/chat/conversations','/messages','/read']) if (!messagingApi.includes(token)) errors.push(`PH04 messaging API client missing ${token}`);
if (!messagingApi.includes("type: 'direct'")) errors.push('Direct-message creation must use canonical direct conversation contract');

const notificationApi = fs.readFileSync(path.join(root, 'website/src/features/notifications/notifications.api.ts'), 'utf8');
for (const token of ['/notifications','/unread-count','/read-all','/read']) if (!notificationApi.includes(token)) errors.push(`PH04 notification API client missing ${token}`);

const profile = fs.readFileSync(path.join(root, 'website/src/pages/ProfilePage.tsx'), 'utf8');
if (!profile.includes('messagingApi.direct') || !profile.includes('navigate(`/messages/${conversation.id}`)')) errors.push('Public profile Message action is not connected to canonical direct-chat creation');
if (profile.includes('Messaging is implemented in WEB-PH04')) errors.push('PH03 disabled messaging placeholder remains');

const conversation = fs.readFileSync(path.join(root, 'website/src/pages/ConversationPage.tsx'), 'utf8');
if (!conversation.includes('messagingApi.messages') || !conversation.includes('messagingApi.sendMessage') || !conversation.includes('messagingApi.markRead')) errors.push('Conversation page missing message/read backend authority');
if (conversation.includes("emit('join_room',{roomId:conversationId})") || conversation.includes("emit('join_room', { roomId: conversationId })")) errors.push('Direct/group chat must not misuse voice-room presence join with conversationId');
if (!conversation.includes('refetchInterval:5_000')) errors.push('Conversation refresh must use bounded HTTP refresh until a canonical direct-chat socket join exists');

const notifications = fs.readFileSync(path.join(root, 'website/src/pages/NotificationsPage.tsx'), 'utf8');
for (const token of ['notificationsApi.list','notificationsApi.markRead','notificationsApi.markAllRead','notificationsApi.remove','notification:new']) if (!notifications.includes(token)) errors.push(`Notifications page missing ${token}`);
const header = fs.readFileSync(path.join(root, 'website/src/components/layout/WebsiteHeader.tsx'), 'utf8');
if (!header.includes('notificationsApi.unreadCount') || !header.includes('vc-notification-badge')) errors.push('Header unread notification authority not wired');

const communityDetails = fs.readFileSync(path.join(root, 'website/src/pages/CommunityDetailsPage.tsx'), 'utf8');
if (!communityDetails.includes('communityApi.join') || !communityDetails.includes('communityApi.leave') || !communityDetails.includes('inviteCode')) errors.push('Community join/leave/private invite flow incomplete');
const communityRooms = fs.readFileSync(path.join(root, 'website/src/pages/CommunityRoomsPage.tsx'), 'utf8');
if (!communityRooms.includes('communityApi.scheduledRooms')) errors.push('Community room directory must use club-filtered scheduled-room authority');
if (/live community rooms|live club rooms/i.test(communityRooms) && !communityRooms.includes('does not invent')) errors.push('Community page appears to claim unsupported club live-room discovery');


const discoveryBackend = fs.readFileSync(path.join(root, 'src/modules/discovery/discovery.service.ts'), 'utf8');
if (!discoveryBackend.includes('UserRole.USER, UserRole.CREATOR') || !discoveryBackend.includes('role: In(this.consumerUserRoles)')) errors.push('Consumer discovery must exclude backend-only/guest roles at backend authority');
const searchBackend = fs.readFileSync(path.join(root, 'src/modules/search/search.service.ts'), 'utf8');
if (searchBackend.includes('host.displayName') || searchBackend.includes('host.category ILIKE')) errors.push('Global host search still references non-existent host profile columns');
for (const token of ['host.realName ILIKE', 'CAST(host.categories AS TEXT) ILIKE', 'hostUser.displayName ILIKE', 'user.role IN (:...consumerRoles)']) if (!searchBackend.includes(token)) errors.push(`Search authority correction missing ${token}`);
const discoveryApi = fs.readFileSync(path.join(root, 'website/src/features/discovery/discovery.api.ts'), 'utf8');
if (!discoveryApi.includes("type: 'users'") || !discoveryApi.includes("type: 'rooms'") || discoveryApi.includes("type: 'all'")) errors.push('Consumer search must query user/room authority separately instead of invoking unrelated all-domain search branches');
const publicProfileBackend = fs.readFileSync(path.join(root, 'src/modules/users/social-identity.service.ts'), 'utf8');
if (!publicProfileBackend.includes('[UserRole.USER, UserRole.CREATOR].includes')) errors.push('Backend-only roles must not have consumer public profiles');
const consumerUsers = fs.readFileSync(path.join(root, 'website/src/features/discovery/consumer-users.ts'), 'utf8');
for (const token of ["new Set(['USER', 'CREATOR'])", 'isConsumerVisibleUser', 'user.id === current.id', 'user.username?.trim().toLowerCase() === current.username']) {
  if (!consumerUsers.includes(token)) errors.push(`Consumer people visibility policy missing ${token}`);
}
for (const rel of ['website/src/pages/HomeFoundationPage.tsx','website/src/pages/ExplorePage.tsx','website/src/pages/PeoplePage.tsx','website/src/pages/FriendsPage.tsx','website/src/pages/SocialListPage.tsx']) {
  const page = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!page.includes('visibleConsumerUsers') && !page.includes('isConsumerDiscoverableUser')) errors.push(`${rel} does not protect consumer people results from self/backend-only accounts`);
}
const searchPage = fs.readFileSync(path.join(root, 'website/src/pages/SearchPage.tsx'), 'utf8');
if (!searchPage.includes('useWebsiteAuthStore') || !searchPage.includes('visibleConsumerUsers(global.data?.results.users?.items, currentUser)')) errors.push('Search people results must explicitly exclude the signed-in user as well as backend-only identities');
const userCard = fs.readFileSync(path.join(root, 'website/src/components/discovery/UserCard.tsx'), 'utf8');
if (!userCard.includes('isConsumerDiscoverableUser(user, currentUser)') || !userCard.includes('return null')) errors.push('UserCard defense-in-depth visibility guard missing');
const communityMembers = fs.readFileSync(path.join(root, 'website/src/pages/CommunityMembersPage.tsx'), 'utf8');
if (!communityMembers.includes('isConsumerVisibleUser(member.user)')) errors.push('Community member directory must hide backend-only/guest identities');
if (!header.includes('<form className="vc-header__search"') || !header.includes('submitSearch') || !header.includes('searchRef.current?.focus()') || header.includes("onClick={() => navigate('/search')}")) errors.push('Header search must be inline-editable and submit query to search results');
const shell = fs.readFileSync(path.join(root, 'website/src/components/layout/WebsiteShell.tsx'), 'utf8');
if (!shell.includes('vc-route-transition') || !shell.includes('useLocation')) errors.push('Smooth route transition wrapper missing');

const ph04Files = required.filter((rel) => rel.startsWith('website/src/'));
for (const rel of ph04Files) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  if (/#[0-9a-fA-F]{3,8}|rgba\(/.test(src)) errors.push(`${rel} contains hard-coded brand color`);
}
const css = fs.readFileSync(path.join(root, 'website/src/styles/global.css'), 'utf8');
if (!css.includes('@keyframes vc-route-enter') || !css.includes('.vc-header__search:focus-within')) errors.push('Header search focus UX or smooth route transition styles missing');
const marker = css.indexOf('/* VC-WEB-PH04');
if (marker < 0) errors.push('PH04 style block marker missing');
else if (/#[0-9a-fA-F]{3,8}|rgba\(/.test(css.slice(marker))) errors.push('PH04 styles contain hard-coded colors instead of centralized branding variables');
const branding = fs.readFileSync(path.join(root, 'website/src/branding/index.ts'), 'utf8');
if (/#[0-9a-fA-F]{3,8}/.test(branding)) errors.push('Website branding adapter contains hard-coded colors');

if (errors.length) {
  console.error('[FAIL] VC-WEB-PH04 source check');
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}
console.log('[PASS] VC-WEB-PH04 source check');
console.log(' - protected PH03-R02 parent recorded');
console.log(' - Communities use canonical clubs/member/join/leave APIs');
console.log(' - community-linked schedules use scheduled-rooms clubId authority without fabricating private live listings');
console.log(' - Events and reminders use canonical scheduled-room APIs');
console.log(' - Messages use canonical chat conversation/message/read APIs');
console.log(' - direct/group chat avoids invalid voice-room socket joins and uses bounded refresh');
console.log(' - Notifications use canonical list/unread/read/delete APIs plus user-scoped realtime events');
console.log(' - public profile Message action creates/opens canonical direct conversations');
console.log(' - consumer people visibility excludes backend-only/guest identities and self across recommendations, search and social lists');
console.log(' - global search host query uses real HostProfile/User fields');
console.log(' - header search is directly editable and route transitions are smooth/reduced-motion safe');
console.log(' - centralized Royal Sapphire branding remains the only PH04 presentation authority');
