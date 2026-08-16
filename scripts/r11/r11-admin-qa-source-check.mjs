import fs from 'node:fs';
const read = (f) => fs.readFileSync(f, 'utf8');
const checks = [
  ['Admin profile persists through users profile API', read('admin/src/pages/ProfilePage.tsx').includes("api.patch('/users/profile'")],
  ['Admin avatar persists through users avatar API', read('admin/src/pages/ProfilePage.tsx').includes("api.post('/users/avatar'")],
  ['Admin profile has no local-only success implementation', !read('admin/src/pages/ProfilePage.tsx').includes("updateUser({ displayName, avatarUrl })")],
  ['Analytics exposes API failure instead of null-to-zero fallback', read('admin/src/pages/AnalyticsPage.tsx').includes('Analytics unavailable')],
  ['Users load failure is surfaced', read('admin/src/pages/UsersPage.tsx').includes('Failed to load users')],
  ['Rankings load failure is surfaced', read('admin/src/pages/RankingsPage.tsx').includes('Failed to load ranking data')],
  ['Auth settings load failure is surfaced', read('admin/src/pages/AuthManagementPage.tsx').includes('Failed to load authentication settings')],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
if (failed.length) process.exit(1);
console.log(`R11 Admin QA source check: ${checks.length}/${checks.length}`);
