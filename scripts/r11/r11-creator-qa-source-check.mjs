import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const api = read('creator/src/services/creator-api.service.ts');
const profile = read('creator/src/pages/ProfilePage.tsx');
const audience = read('creator/src/pages/AudiencePage.tsx');
const followers = read('creator/src/pages/FollowersPage.tsx');
const subscribers = read('creator/src/pages/SubscribersPage.tsx');
const settings = read('creator/src/pages/SettingsPage.tsx');
const help = read('creator/src/pages/HelpPage.tsx');
const host = read('creator/src/pages/HostVerificationPage.tsx');
const store = read('creator/src/store/creator-profile.store.ts');
const schedule = read('creator/src/pages/SchedulePage.tsx');
const gifts = read('creator/src/pages/GiftsPage.tsx');

const checks = [
  ['Creator API no fabricated dashboard/profile/analytics/schedule/follower fallbacks',
    !/user-vc-creator-001|Alex AudioNut|Sarah Waves|Silver Supporter|rtmps:\/\/live\.voicecloud|dailyMetrics:\s*\[/.test(api)],
  ['Creator API propagates settings and stream credential failures',
    /return this\.request<Record<string, any>>\('\/users\/settings'/.test(api) &&
    /return this\.request<\{[\s\S]*rtmpUrl[\s\S]*\}>\('\/creator\/stream-credentials'/.test(api) &&
    !/catch\s*\{\s*return settings/.test(api)],
  ['Profile save no longer reports local fallback success',
    /setSaveError/.test(profile) && /Failed to Load Creator Profile/.test(profile) && !/Fallback local state save/.test(profile)],
  ['Audience page uses backend follower/dashboard data rather than hard-coded demographics',
    /getFollowStats/.test(audience) && /getDashboardSummary/.test(audience) && /getFollowersPage/.test(audience) &&
    !/14,250|5\.9%|Alex AudioNut|Michael Sound/.test(audience)],
  ['Follower directory has real backend pagination/search/sort and follow-back actions',
    /getFollowersPage/.test(followers) && /followMutation/.test(followers) && /followUser/.test(api) && /unfollowUser/.test(api) &&
    /sortOrder/.test(api)],
  ['Subscription tiers use canonical USD plan contract and real create/update/archive APIs',
    /monthlyPrice/.test(subscribers) && /Monthly Price \(USD\)/.test(subscribers) &&
    /createCreatorPlan/.test(api) && /updateCreatorPlan/.test(api) && /archiveCreatorPlan/.test(api) &&
    !/Monthly Coin Price|\$4\.99\/mo|VIP Badge',\s*'Priority Mic Seat/.test(subscribers)],
  ['Settings page surfaces load/save failures and service does not fake persistence',
    /setLoadError/.test(settings) && /setSaveError/.test(settings) && /Settings were not saved/.test(settings) &&
    !/return settings;/.test(api)],
  ['Help page no longer claims a fake persisted support ticket',
    /mailto:/.test(help) && /Open Email Client/.test(help) && !/Your ticket has been sent/.test(help)],
  ['Host verification application is not pre-populated with fabricated identity/experience claims',
    /const \[country, setCountry\] = useState\(''\)/.test(host) &&
    /const \[languages, setLanguages\] = useState\(''\)/.test(host) &&
    /const \[categories, setCategories\] = useState\(''\)/.test(host) &&
    /const \[experience, setExperience\] = useState\(''\)/.test(host) &&
    !/United States|2\+ years in live broadcasting/.test(host)],
  ['Host status distinguishes not-applied from backend failure and surfaces progression failure',
    /error instanceof ApiError && error\.statusCode === 404/.test(host) && /hostLoadError/.test(host) && /progressionError/.test(host)],
  ['Creator profile store starts neutral instead of impersonating branded demo creator',
    /displayName: '',/.test(store) && /handle: '',/.test(store) && /bio: '',/.test(store) && !/officialCreator/.test(store)],
  ['Schedule and gift pages no longer use fabricated runtime values',
    /actionError/.test(schedule) && !/20:00 UTC|Reminders Active/.test(schedule) &&
    !/\?\? 500|@supporter/.test(gifts)],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (ok) passed += 1;
}
console.log(`R11 Creator QA source check: ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
