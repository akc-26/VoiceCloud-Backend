import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const acceptedBaselineBranch = 'VoiceCloud-Backend-VC-PH08-WP08-04-03-R04';
const acceptedBaselineCommit = '3ab7cb1270ba724411bf65587d6cee2107c8ba34';
const historicalProtectedLockfileSha256 =
  '17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a';

const protectedDirectoryDigests = new Map([
  ['src', 'e539eddd899266ce7c89fd0110b17eac4a4d5d114223f1c00ab76e26851dd54a'],
  ['admin', '469abd83cec690e78583b03fcaa59d8334506f722f9e323a12145f43e7356880'],
  [
    'website',
    '949ce92289b62ade8be0883d3e87c1f63622d93ac8fe7ef826fc52736bc941c6',
  ],
  [
    'creator/src/routes',
    '2ce7ae8a10baf268546df2774a4dad50bb2ddaf248a4cebd1fba2286a0b36317',
  ],
  [
    'creator/src/services',
    'e4350864f8a2477b4016738acdcb49900c29e2da6d96780695cb04dbca9f1ac0',
  ],
]);

const protectedFileHashes = new Map([
  [
    'creator/src/store/auth.store.ts',
    'baec12bcbb4888cce8164cbb12c2af8c127d021caf6276beabae176dd5a1e15c',
  ],
  [
    'creator/src/store/notification.store.ts',
    '41885ed59acd82e90a67aee9ac14395a704c5292e86d79ebbfd9bc280f9f3f54',
  ],
  [
    'creator/src/store/theme.store.ts',
    '7e6631d23ecf28415b053f6f343bec6b87d08f90edc881db79fcdb67814290d6',
  ],
  [
    'creator/src/utils/host-verification-assets.ts',
    '2adc5e87c3180692fd0c173cb742c3b47bd290f0f9e21a6769bfa3ddee93abb7',
  ],
  [
    'creator/src/types/creator.types.ts',
    '9760afc9804e1a66d9d3a94d30b68885266626a114016acbaec8da55d5b576f4',
  ],
]);

const fail = (message) => {
  throw new Error(`Creator UI redesign source check failed: ${message}`);
};

const read = (relativePath) => {
  const absolute = join(root, relativePath);
  if (!existsSync(absolute)) fail(`missing required file: ${relativePath}`);
  return readFileSync(absolute, 'utf8');
};

const sha256File = (relativePath) =>
  createHash('sha256')
    .update(readFileSync(join(root, relativePath)))
    .digest('hex');

const directoryDigest = (relativeDirectory) => {
  const directory = join(root, relativeDirectory);
  if (!existsSync(directory))
    fail(`missing protected directory: ${relativeDirectory}`);
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
  if (actual !== expected)
    fail(
      `protected directory changed from accepted Admin baseline: ${directory}`,
    );
}
for (const [file, expected] of protectedFileHashes) {
  if (sha256File(file) !== expected)
    fail(`protected file changed from accepted Admin baseline: ${file}`);
}

const lockfileBytes = readFileSync(join(root, 'package-lock.json'));
if (
  createHash('sha256').update(lockfileBytes).digest('hex') !==
  historicalProtectedLockfileSha256
) {
  fail('package-lock.json no longer matches the protected LF-byte identity');
}
if (lockfileBytes.includes(Buffer.from('\r\n'))) {
  fail(
    'package-lock.json contains CRLF; protected lockfile must remain LF-only',
  );
}
if (!/^package-lock\.json\s+text\s+eol=lf\s*$/m.test(read('.gitattributes'))) {
  fail('.gitattributes no longer enforces package-lock.json text eol=lf');
}

const branding = read('shared/branding/index.ts');
for (const value of [
  "primary: '#22c55e'",
  "secondary: '#0f766e'",
  "accent: '#5eead4'",
  "lightBackground: '#e7eceb'",
  "lightSurface: '#f3f7f5'",
  "navigationBackground: '#123a32'",
  "navigationSelected: '#d7f4e6'",
  "textPrimary: '#10231f'",
  "textSecondary: '#64756f'",
  "border: '#d8e3de'",
  "success: '#16a34a'",
  "warning: '#d97706'",
  "error: '#dc2626'",
  "info: '#0ea5a4'",
]) {
  if (!branding.includes(value))
    fail(`missing approved Aurora Live semantic token: ${value}`);
}
for (const preservedAdminToken of [
  "primary: '#2563eb'",
  "secondary: '#0f4c81'",
  "accent: '#38bdf8'",
  "navigationBackground: '#0f5ea8'",
  "navigationSelected: '#dcebff'",
]) {
  if (!branding.includes(preservedAdminToken))
    fail(
      `Admin Ocean Blue token drifted during Creator-only redesign: ${preservedAdminToken}`,
    );
}

const theme = read('creator/src/theme/theme.ts');
for (const required of [
  'BRAND_CONFIG.colors.creator',
  'creatorFontFamily',
  'MuiButton',
  'MuiCard',
  'MuiOutlinedInput',
  'MuiTableCell',
  'MuiDialog',
  'MuiChip',
  'MuiTabs',
  'MuiSwitch',
  'MuiAlert',
  'prefers-reduced-motion',
]) {
  if (!theme.includes(required))
    fail(`Creator design system theme is incomplete: ${required}`);
}

const routes = [
  '/dashboard',
  '/analytics',
  '/rooms',
  '/schedule',
  '/audience',
  '/followers',
  '/subscribers',
  '/wallet',
  '/earnings',
  '/gifts',
  '/payout-requests',
  '/notifications',
  '/verification',
  '/profile',
  '/settings',
  '/help',
];
const sidebar = read('creator/src/components/layout/CreatorSidebar.tsx');
for (const route of routes) {
  if (!sidebar.includes(`path: '${route}'`))
    fail(`Creator navigation destination disappeared: ${route}`);
}

const topbar = read('creator/src/components/layout/CreatorTopBar.tsx');
for (const required of [
  'markAllNotificationsRead',
  'markNotificationRead',
  "navigate('/notifications')",
  "navigate('/rooms')",
  'logout()',
]) {
  if (!topbar.includes(required))
    fail(`Creator header behavior was lost: ${required}`);
}

const login = read('creator/src/pages/LoginPage.tsx');
if (!login.includes('CreatorApiService.getInstance().login'))
  fail('Creator Login no longer uses accepted authentication service');
if (!login.includes("navigate('/dashboard', { replace: true })"))
  fail('Creator Login no longer enters the accepted Dashboard route');

const dashboard = read('creator/src/pages/DashboardPage.tsx');
for (const required of [
  'useCreatorDashboard()',
  'useCreatorProfile()',
  'useCreatorWallet()',
  'useCreatorNotifications()',
  'useCreatorRecentActivity()',
  "navigate('/rooms')",
  "navigate('/wallet')",
  "navigate('/payout-requests')",
]) {
  if (!dashboard.includes(required))
    fail(`Creator Dashboard lost real-data/navigation contract: ${required}`);
}
for (const forbidden of [
  '14250',
  '84300',
  '458900',
  '12500',
  'Late Night Audio Lounge & Chill Beats',
  '98/100',
  '+18.5% growth',
  '+14.2% vs last month',
]) {
  if (dashboard.includes(forbidden))
    fail(
      `Creator Dashboard contains old illustrative production data: ${forbidden}`,
    );
}

for (const relativePath of [
  'creator/src/hooks/useCreatorDashboard.ts',
  'creator/src/store/creator-profile.store.ts',
]) {
  const text = read(relativePath);
  for (const forbidden of [
    '14250',
    '84300',
    '458900',
    '12500',
    '2025-01-15T00:00:00Z',
  ]) {
    if (text.includes(forbidden))
      fail(
        `${relativePath} contains old illustrative fallback data: ${forbidden}`,
      );
  }
}

const legacyCreatorPalette = [
  '#7c3aed',
  '#6366f1',
  '#4f46e5',
  '#a855f7',
  '#8b5cf6',
  'rgba(124, 58, 237',
  'rgba(99, 102, 241',
];
const forbiddenPresentationLabels = [
  /VC-PH/i,
  /WP08/i,
  /Authentication Entry/i,
  /Foundation Ready/i,
  new RegExp(['AI', 'Studio'].join('\\s+'), 'i'),
];
const walkCreatorPresentation = (directory) => {
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    const info = statSync(absolute);
    if (info.isDirectory()) {
      walkCreatorPresentation(absolute);
      continue;
    }
    if (!/\.(tsx|css)$/.test(name)) continue;
    const text = readFileSync(absolute, 'utf8');
    for (const legacy of legacyCreatorPalette) {
      if (text.toLowerCase().includes(legacy.toLowerCase())) {
        fail(
          `${relative(root, absolute)} contains legacy purple Creator palette value: ${legacy}`,
        );
      }
    }
    for (const pattern of forbiddenPresentationLabels) {
      if (pattern.test(text))
        fail(
          `${relative(root, absolute)} contains forbidden development presentation text (${pattern})`,
        );
    }
  }
};
walkCreatorPresentation(join(root, 'creator/src'));

// Material UI v9 removed System props from Stack. Keep layout-only styling in `sx`
// so Creator presentation code remains compatible with the locked MUI major version.
const removedStackSystemProps = [
  'alignItems',
  'justifyContent',
  'flexWrap',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'display',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'bgcolor',
  'border',
  'borderColor',
  'borderRadius',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
];
const stackOpeningTag = /<Stack\b([\s\S]*?)>/g;
const walkCreatorStackCompatibility = (directory) => {
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    const info = statSync(absolute);
    if (info.isDirectory()) {
      walkCreatorStackCompatibility(absolute);
      continue;
    }
    if (!/\.tsx$/.test(name)) continue;
    const text = readFileSync(absolute, 'utf8');
    for (const match of text.matchAll(stackOpeningTag)) {
      const attributes = match[1];
      for (const prop of removedStackSystemProps) {
        const directProp = new RegExp(`(?:^|\\s)${prop}\\s*=`);
        if (directProp.test(attributes)) {
          fail(
            `${relative(root, absolute)} uses removed MUI v9 Stack system prop '${prop}'; move it into sx`,
          );
        }
      }
    }
  }
};
walkCreatorStackCompatibility(join(root, 'creator/src'));

// Keep Creator UI promise handling explicit. React event props expect void-returning
// callbacks, while React Query refetch/invalidation and router navigation may return
// promises with the locked dependency versions. The ESLint gate is authoritative;
// this source check adds an early dependency-free regression guard for the exact
// unsafe patterns that previously escaped the TypeScript-only gate.
const asyncSafetyFiles = [
  'creator/src/components/layout/CreatorSidebar.tsx',
  'creator/src/components/layout/CreatorTopBar.tsx',
  'creator/src/hooks/useCreatorDashboard.ts',
  'creator/src/pages/AnalyticsPage.tsx',
  'creator/src/pages/DashboardPage.tsx',
  'creator/src/pages/FollowersPage.tsx',
  'creator/src/pages/LiveRoomsPage.tsx',
  'creator/src/pages/LoginPage.tsx',
  'creator/src/pages/ProfilePage.tsx',
  'creator/src/pages/SettingsPage.tsx',
  'creator/src/pages/SubscribersPage.tsx',
];

for (const relativePath of asyncSafetyFiles) {
  const text = read(relativePath);
  const asyncHandlerNames = [
    ...text.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*async\b/g),
  ].map((match) => match[1]);

  for (const handlerName of asyncHandlerNames) {
    const directAsyncHandler = new RegExp(
      `on[A-Z][A-Za-z]*\\s*=\\s*\\{\\s*${handlerName}\\s*\\}`,
    );
    if (directAsyncHandler.test(text)) {
      fail(
        `${relativePath} passes async handler '${handlerName}' directly to a JSX event; wrap it in a void-returning callback`,
      );
    }
  }

  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const hasRiskyCall =
      /\bnavigate\s*\(/.test(line) ||
      /\.[A-Za-z_$][\w$]*\.refetch\s*\(/.test(line) ||
      /\b[A-Za-z_$][\w$]*Query\.refetch\s*\(/.test(line) ||
      /\bqueryClient\.invalidateQueries\s*\(/.test(line) ||
      /\.then\s*\(/.test(line);

    if (!hasRiskyCall) continue;

    const intentionallyHandled =
      /\b(?:await|void|return)\b/.test(line) ||
      /Promise\.(?:all|allSettled|race|any)\s*\(/.test(line);

    if (!intentionallyHandled) {
      fail(
        `${relativePath}:${index + 1} contains a promise-capable UI call without explicit await/void/return handling`,
      );
    }
  }

  const promiseReturningJsxArrow =
    /on[A-Z][A-Za-z]*\s*=\s*\{\s*\(\s*\)\s*=>\s*(?:[A-Za-z_$][\w$]*\.)?(?:refetch|invalidateQueries|navigate)\s*\(/;
  if (promiseReturningJsxArrow.test(text)) {
    fail(
      `${relativePath} contains a JSX event callback that directly returns a promise-capable call`,
    );
  }
}

console.log('Creator Aurora Live / Green source contract passed.');
console.log(`Accepted parent branch: ${acceptedBaselineBranch}`);
console.log(`Accepted parent commit: ${acceptedBaselineCommit}`);
console.log(
  'Backend src, accepted Admin UI, Website, Creator routes/services and protected Creator auth/notification state remain byte-identical to the parent.',
);
console.log(
  'package-lock.json retains its protected LF-byte identity and .gitattributes enforcement.',
);
console.log(
  'Creator Studio uses centralized Aurora Live semantic tokens and reusable MUI component language.',
);
console.log('All accepted Creator navigation destinations remain present.');
console.log(
  'Creator Dashboard uses existing data queries and contains no old illustrative KPI/live-room values.',
);
console.log(
  'Creator async event boundaries use explicit await/void handling and reject direct async JSX handlers.',
);
