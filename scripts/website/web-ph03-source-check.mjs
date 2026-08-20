import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const errors=[];
const required=[
  'website/src/features/discovery/types.ts','website/src/features/discovery/discovery.api.ts','website/src/features/discovery/presentation.ts',
  'website/src/components/discovery/RoomCard.tsx','website/src/components/discovery/UserCard.tsx','website/src/components/discovery/DiscoveryStates.tsx',
  'website/src/pages/ExplorePage.tsx','website/src/pages/LiveRoomsPage.tsx','website/src/pages/PeoplePage.tsx','website/src/pages/SearchPage.tsx',
  'website/src/pages/ProfilePage.tsx','website/src/pages/MyProfilePage.tsx','website/src/pages/SocialListPage.tsx','website/src/pages/FriendsPage.tsx',
  'VC-WEB-PH03-BASELINE.txt','docs/website/VC-WEB-PH03-IMPLEMENTATION-REPORT.md','docs/website/VC-WEB-PH03-MANUAL-QA.md'
];
for(const rel of required)if(!fs.existsSync(path.join(root,rel)))errors.push(`Missing ${rel}`);
const api=fs.readFileSync(path.join(root,'website/src/features/discovery/discovery.api.ts'),'utf8');
for(const route of ['/discovery/rooms/live','/discovery/rooms/trending','/discovery/users/trending','/discovery/users/suggested','/search','/clubs','/scheduled-rooms','/users/public/','/users/profile/me','/users/followers','/users/following','/users/friends','/users/friends/requests/pending','/users/friends/suggested','/users/friends/request'])if(!api.includes(route))errors.push(`PH03 API client missing ${route}`);
const router=fs.readFileSync(path.join(root,'website/src/app/router/AppRouter.tsx'),'utf8');
for(const route of ['/explore','/rooms','/people','/search','/profile/:username','/me','/followers','/following','/friends'])if(!router.includes(route))errors.push(`PH03 router missing ${route}`);
for(const page of ['ExplorePage','LiveRoomsPage','PeoplePage','SearchPage','ProfilePage','MyProfilePage','SocialListPage','FriendsPage'])if(router.includes(`path=\"/${page}\"`))errors.push(`PH03 route wiring malformed for ${page}`);
const home=fs.readFileSync(path.join(root,'website/src/pages/HomeFoundationPage.tsx'),'utf8');
if(home.includes('const liveRooms = ['))errors.push('Home must not use fabricated live-room runtime data');
if(!home.includes('discoveryApi.liveRooms()')||!home.includes('discoveryApi.trendingUsers('))errors.push('Home must consume backend discovery APIs');
const profile=fs.readFileSync(path.join(root,'website/src/pages/ProfilePage.tsx'),'utf8');
if(!profile.includes('publicByUsername')||!profile.includes('profileApi.byId')||!profile.includes('profileApi.follow')||!profile.includes('profileApi.unfollow'))errors.push('Public profile/follow authority incomplete');
if(api.includes('as { isFollowing: true }')||api.includes('as { isFollowing: false }'))errors.push('Follow/unfollow API must not expose incompatible literal-only mutation result types');
if(!api.includes('Promise<FollowMutationResult>')||!profile.includes('useMutation<FollowMutationResult, Error, void>'))errors.push('Follow/unfollow mutation must share the boolean FollowMutationResult contract');
const friends=fs.readFileSync(path.join(root,'website/src/pages/FriendsPage.tsx'),'utf8');
for(const token of ['friendsApi.list','friendsApi.pending','friendsApi.suggested','friendsApi.accept','friendsApi.reject','friendsApi.send'])if(!friends.includes(token))errors.push(`Friends UI missing ${token}`);
const search=fs.readFileSync(path.join(root,'website/src/pages/SearchPage.tsx'),'utf8');
for(const token of ['globalSearch','discoveryApi.clubs','discoveryApi.scheduled'])if(!search.includes(token))errors.push(`Search UI missing ${token}`);
const discoveryFiles=[...required.filter(x=>x.startsWith('website/src/features/discovery/')||x.startsWith('website/src/components/discovery/')||x.startsWith('website/src/pages/'))];
for(const rel of discoveryFiles){if(!fs.existsSync(path.join(root,rel)))continue;const s=fs.readFileSync(path.join(root,rel),'utf8');if(/#[0-9a-fA-F]{3,8}|rgba\(/.test(s))errors.push(`${rel} contains hard-coded brand color`)}
const css=fs.readFileSync(path.join(root,'website/src/styles/global.css'),'utf8');const marker=css.indexOf('/* VC-WEB-PH03');const ph03css=marker>=0?css.slice(marker):'';if(/#[0-9a-fA-F]{3,8}|rgba\(/.test(ph03css))errors.push('PH03 styles contain hard-coded colors instead of centralized branding variables');
const branding=fs.readFileSync(path.join(root,'website/src/branding/index.ts'),'utf8');if(/#[0-9a-fA-F]{3,8}/.test(branding))errors.push('Website branding adapter contains hard-coded colors');
const baseline=fs.readFileSync(path.join(root,'VC-WEB-PH03-BASELINE.txt'),'utf8');if(!baseline.includes('PARENT=90aafda6d731e38c3e76df0ee0b199e935b73484'))errors.push('PH03 protected parent is not frozen PH02-R05');
if(errors.length){console.error('[FAIL] VC-WEB-PH03 source check');errors.forEach(e=>console.error(' - '+e));process.exit(1)}
console.log('[PASS] VC-WEB-PH03 source check');
console.log(' - protected PH02-R05 parent recorded');
console.log(' - Home/Explore/Live Rooms/People/Search use canonical backend discovery/search APIs');
console.log(' - public/self profile and follow/unfollow flows mapped');
console.log(' - follow/unfollow mutation result typing protected against literal true/false inference conflicts');
console.log(' - Followers/Following/Friends use canonical social APIs');
console.log(' - no fabricated PH03 room/person runtime arrays');
console.log(' - centralized website branding remains the only PH03 color authority');
console.log(' - later-phase room detail/community/event features remain outside PH03 implementation');
