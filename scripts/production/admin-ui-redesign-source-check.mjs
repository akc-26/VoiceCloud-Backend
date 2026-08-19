import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const acceptedBaselineBranch = 'VoiceCloud-Backend-VC-PH08-WP08-04-02-R04';
const acceptedBaselineCommit = '0d8bb8375b657506f5f6eca74b6a28594e69181a';
const acceptedBaselineArchiveSha256 = 'e3abc2fd7617ee8ae43d62edae55816cfbb0e83ac553d2a69e9c8935221c1881';
const historicalProtectedLockfileSha256 = '17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a';

const protectedDirectoryDigests = new Map([
  ['src', 'e539eddd899266ce7c89fd0110b17eac4a4d5d114223f1c00ab76e26851dd54a'],
  ['creator', 'c8276c198944541c26a8784dd89f9e936c432bf79cb04fffd7c5f84cc40b65d7'],
  ['website', '949ce92289b62ade8be0883d3e87c1f63622d93ac8fe7ef826fc52736bc941c6'],
  ['admin/src/routes', 'e71bfe764e6511d39b84c9daaee500ee0d07750a67f6ce11dd276649b1063863'],
  ['admin/src/services', '809723f660aed6235f2b528017f5c4ae2d22f89b36097eff959b2c3e98ca6120'],
]);

const protectedFileHashes = new Map([
  ['admin/src/store/auth.store.ts', 'c58462a4d2f1e50535965fa71b059236559d3d1266b356af7300cb781d0a63bf'],
  ['admin/src/store/permissions.store.ts', '97e72d9377839b7f61371aa32338182825049e9ba8148e37ca3f48afecffdd2c'],
  ['admin/src/store/user.store.ts', 'e0db102a4e7b1858f0e9ccabedf67eca420af38f15cfe3619d4bdcd4fa44aae5'],
  ['admin/src/store/app-settings.store.ts', '07f77c84c5c062f00e2a360ae02067276ad0f8b3f0542165cf99e9ebf954b1e9'],
]);

const fail = (message) => {
  throw new Error(`Admin UI redesign source check failed: ${message}`);
};

const read = (relativePath) => {
  const absolute = join(root, relativePath);
  if (!existsSync(absolute)) fail(`missing required file: ${relativePath}`);
  return readFileSync(absolute, 'utf8');
};

const sha256File = (relativePath) =>
  createHash('sha256').update(readFileSync(join(root, relativePath))).digest('hex');

const directoryDigest = (relativeDirectory) => {
  const directory = join(root, relativeDirectory);
  if (!existsSync(directory)) fail(`missing protected directory: ${relativeDirectory}`);
  const files = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const absolute = join(current, name);
      const info = statSync(absolute);
      if (info.isDirectory()) walk(absolute);
      else files.push(absolute);
    }
  };
  walk(directory);
  const hash = createHash('sha256');
  const ordered = files
    .map((absolute) => ({
      absolute,
      relativePath: relative(directory, absolute).replaceAll('\\', '/'),
    }))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  for (const { absolute, relativePath } of ordered) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(createHash('sha256').update(readFileSync(absolute)).digest());
  }
  return hash.digest('hex');
};

for (const [directory, expected] of protectedDirectoryDigests) {
  const actual = directoryDigest(directory);
  if (actual !== expected) fail(`protected directory changed from R04 baseline: ${directory}`);
}
for (const [file, expected] of protectedFileHashes) {
  if (sha256File(file) !== expected) fail(`protected file changed from R04 baseline: ${file}`);
}

const lockfileBytes = readFileSync(join(root, 'package-lock.json'));
if (createHash('sha256').update(lockfileBytes).digest('hex') !== historicalProtectedLockfileSha256) {
  fail('package-lock.json no longer matches the historically protected LF-byte identity');
}
if (lockfileBytes.includes(Buffer.from('\r\n'))) {
  fail('package-lock.json contains CRLF; the protected lockfile must remain LF-only');
}

const gitAttributes = read('.gitattributes');
if (!/^package-lock\.json\s+text\s+eol=lf\s*$/m.test(gitAttributes)) {
  fail('.gitattributes must enforce package-lock.json text eol=lf for cross-platform byte identity');
}

const branding = read('shared/branding/index.ts');
for (const value of [
  "primary: '#2563eb'",
  "secondary: '#0f4c81'",
  "accent: '#38bdf8'",
  "lightBackground: '#f4f8fc'",
  "navigationBackground: '#0f5ea8'",
  "navigationSelected: '#dcebff'",
  "textPrimary: '#10233f'",
  "textSecondary: '#64748b'",
  "border: '#dce5ef'",
  "success: '#16a34a'",
  "warning: '#d97706'",
  "error: '#dc2626'",
  "info: '#0284c7'",
]) {
  if (!branding.includes(value)) fail(`missing approved Ocean Blue semantic token: ${value}`);
}
for (const commonToken of [
  "success: '#10b981'",
  "warning: '#f59e0b'",
  "error: '#ef4444'",
  "info: '#3b82f6'",
]) {
  if (!branding.includes(commonToken)) fail(`shared common/Creator semantic token drifted during Admin-only redesign: ${commonToken}`);
}
for (const preservedSurfaceToken of [
  "primary: '#7c3aed'",
  "accent: '#6366f1'",
  "accentDark: '#4f46e5'",
  "accentLight: '#a855f7'",
  "primarySoft: '#e0edff'",
]) {
  if (!branding.includes(preservedSurfaceToken)) fail(`Creator/Website branding drifted during Admin-only redesign: ${preservedSurfaceToken}`);
}

const theme = read('admin/src/theme/theme.ts');
for (const removedStyleOverride of ['containedPrimary:', 'filledPrimary:', 'standardSuccess:', 'standardWarning:', 'standardError:', 'standardInfo:']) {
  if (theme.includes(removedStyleOverride)) fail(`removed MUI v9 composed styleOverride key was reintroduced: ${removedStyleOverride}`);
}
for (const requiredSelector of [
  '.MuiButton-contained.MuiButton-colorPrimary',
  '.MuiChip-filled.MuiChip-colorPrimary',
  '.MuiAlert-standard.MuiAlert-colorSuccess',
  '.MuiAlert-standard.MuiAlert-colorWarning',
  '.MuiAlert-standard.MuiAlert-colorError',
  '.MuiAlert-standard.MuiAlert-colorInfo',
]) {
  if (!theme.includes(requiredSelector)) fail(`MUI v9 theme selector is missing: ${requiredSelector}`);
}
for (const removedIconImport of [
  "@mui/icons-material/PeopleOutline'",
  "@mui/icons-material/PersonOutline'",
]) {
  for (const relativePath of ['admin/src/pages/DashboardPage.tsx', 'admin/src/components/layout/UserDropdown.tsx']) {
    if (read(relativePath).includes(removedIconImport)) fail(`removed MUI v9 icon export was reintroduced in ${relativePath}: ${removedIconImport}`);
  }
}
for (const required of [
  'BRAND_CONFIG.colors.admin',
  'MuiButton',
  'MuiCard',
  'MuiOutlinedInput',
  'MuiTableCell',
  'MuiDialog',
  'MuiChip',
  'MuiTabs',
  'MuiSwitch',
]) {
  if (!theme.includes(required)) fail(`Admin design system theme is incomplete: ${required}`);
}

const sidebar = read('admin/src/components/layout/Sidebar.tsx');
for (const section of ['Overview', 'User Management', 'Economy', 'Operations', 'Platform', 'System']) {
  if (!sidebar.includes(`label: '${section}'`)) fail(`Admin navigation group is missing: ${section}`);
}
for (const route of [
  '/dashboard', '/users', '/rooms', '/wallet', '/gifts', '/vip', '/hosts', '/rankings',
  '/tasks-achievements', '/store', '/referrals', '/reports', '/moderation', '/announcements',
  '/notifications', '/messaging', '/rtc', '/cms', '/feature-flags', '/provider-configs',
  '/backups', '/auth-management', '/system-settings', '/app-versions', '/audit-logs',
  '/analytics', '/support', '/profile',
]) {
  if (!sidebar.includes(`path: '${route}'`)) fail(`Admin navigation destination disappeared: ${route}`);
}
if (sidebar.includes("badge: '5'")) fail('Admin sidebar still contains the old hard-coded report badge count');

const header = read('admin/src/components/layout/Header.tsx');
if (header.includes('Global search users, rooms, reports')) fail('non-functional global search was reintroduced');
if (header.includes('New Host Verification Application') || header.includes('System Security Alert')) {
  fail('hard-coded sample notification content was reintroduced into the Admin header');
}
if (!header.includes("navigate('/notifications')")) fail('Header notification control must route to the existing notification console');

const dashboard = read('admin/src/pages/DashboardPage.tsx');
for (const forbidden of [
  '14280',
  '1840',
  '42180',
  'userGrowthData',
  'revenueTrendData',
  'categoryDistribution',
  'Dummy chart data',
  'Fall back to clean populated state',
]) {
  if (dashboard.includes(forbidden)) fail(`Dashboard contains illustrative production data: ${forbidden}`);
}
for (const required of [
  'adminService.getDashboardStats()',
  'statsData.overview',
  'statsData.infrastructure',
  'System Health',
  'Realtime Capacity',
]) {
  if (!dashboard.includes(required)) fail(`Dashboard is missing the real-data presentation contract: ${required}`);
}

const login = read('admin/src/pages/LoginPage.tsx');
if (!login.includes('authService.login')) fail('Admin Login no longer uses the accepted authentication service');
if (!login.includes("navigate('/dashboard')")) fail('Admin Login no longer navigates to the accepted Dashboard route');

const forbiddenPresentationLabels = [
  /VC-PH/i,
  /WP08/i,
  /Phase\s+\d+/i,
  /Authentication Entry/i,
  /Foundation Ready/i,
  new RegExp(['AI', 'Studio'].join('\\s+'), 'i'),
];
const walkAdminSource = (directory) => {
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    const info = statSync(absolute);
    if (info.isDirectory()) {
      walkAdminSource(absolute);
      continue;
    }
    if (!/\.(ts|tsx|css)$/.test(name)) continue;
    const text = readFileSync(absolute, 'utf8');
    for (const pattern of forbiddenPresentationLabels) {
      if (pattern.test(text)) fail(`${relative(root, absolute)} contains forbidden development presentation text (${pattern})`);
    }
  }
};
walkAdminSource(join(root, 'admin/src'));

console.log('Admin Modern Cloud / Ocean Blue source contract passed.');
console.log(`Accepted baseline branch: ${acceptedBaselineBranch}`);
console.log(`Accepted baseline commit: ${acceptedBaselineCommit}`);
console.log(`Authoritative Git archive SHA-256: ${acceptedBaselineArchiveSha256}`);
console.log('Backend src, Creator, Website, Admin routes/services and protected Admin state remain byte-identical to R04.');
console.log('package-lock.json is restored to the historical LF-byte contract and .gitattributes enforces it cross-platform.');
console.log('Admin Ocean Blue semantic tokens and reusable MUI component language are present.');
console.log('All existing Admin navigation destinations remain present.');
console.log('Admin header contains no fake global search or hard-coded sample notifications.');
console.log('Admin Dashboard consumes the existing real dashboard API response rather than illustrative fallback metrics.');
