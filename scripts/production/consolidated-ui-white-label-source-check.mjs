import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const acceptedParentBranch = 'VoiceCloud-Backend-VC-PH08-WP08-04-05-R02';
const acceptedParentCommit = '6ce1634c292645cb521c8d178adb0a7680ab77bb';
const acceptedParentArchiveSha256 =
  '07a3f70c501a9564983ec580221761118c5932454a341281c97b9aed8af6334d';
const protectedParentDigest =
  'ff5e7c31db3c38897ff4e037dd537250dcfb4bd9932974bf82f9a4d9ba227714';
const protectedParentFileCount = 880;
const protectedPackageLockSha256 =
  '17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a';

const allowedChanges = new Set([
  '.gitignore',
  'package.json',
  'CHANGELOG.md',
  'docs/production/WHITE-LABEL-GUIDE.md',
  'admin/src/pages/DashboardPage.tsx',
  'admin/src/pages/LoginPage.tsx',
  'admin/src/pages/BackupManagementPage.tsx',
  'creator/src/components/layout/CreatorTopBar.tsx',
  'creator/src/components/layout/CreatorBreadcrumbs.tsx',
  'creator/src/pages/DashboardPage.tsx',
  'creator/src/pages/LoginPage.tsx',
  'website/src/App.tsx',
  'docs/production/CONSOLIDATED-UI-WHITE-LABEL-ACCEPTANCE.md',
  'scripts/production/consolidated-ui-white-label-source-check.mjs',
  'scripts/production/white-label-propagation-check.mjs',
  'scripts/production/consolidated-ui-white-label-check.mjs',
  'scripts/production/production-release-source-check.mjs',
]);
const excludedDirectories = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.cache',
  '.release',
  'uploads',
  'private_uploads',
  'release-smoke-staging',
  'white-label-smoke-staging',
]);

const fail = (message) => {
  throw new Error(
    `Consolidated UI / white-label source check failed: ${message}`,
  );
};
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const read = (relativePath) => {
  const absolute = join(root, relativePath);
  if (!existsSync(absolute)) fail(`missing required file: ${relativePath}`);
  return readFileSync(absolute, 'utf8');
};

const protectedDigest = () => {
  const files = [];
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      if (excludedDirectories.has(name)) continue;
      const absolute = join(directory, name);
      const info = statSync(absolute);
      if (info.isDirectory()) walk(absolute);
      else files.push(absolute);
    }
  };
  walk(root);

  const hash = createHash('sha256');
  let count = 0;
  for (const absolute of files.sort((left, right) =>
    relative(root, left).localeCompare(relative(root, right)),
  )) {
    const rel = relative(root, absolute).replaceAll('\\', '/');
    if (allowedChanges.has(rel)) continue;
    if (
      rel === '.env' ||
      rel.endsWith('.log') ||
      rel.endsWith('.tsbuildinfo') ||
      rel.endsWith('.zip')
    )
      continue;
    hash.update(rel);
    hash.update('\0');
    hash.update(createHash('sha256').update(readFileSync(absolute)).digest());
    count += 1;
  }
  return { digest: hash.digest('hex'), count };
};

const protectedState = protectedDigest();
if (protectedState.count !== protectedParentFileCount)
  fail(
    `protected parent file count changed: expected ${protectedParentFileCount}, received ${protectedState.count}`,
  );
if (protectedState.digest !== protectedParentDigest)
  fail(
    'source outside the approved WP08-04-06 presentation/tooling delta changed',
  );

const lockfile = readFileSync(join(root, 'package-lock.json'));
if (sha256(lockfile) !== protectedPackageLockSha256)
  fail('package-lock.json changed from its protected LF-byte identity');
if (lockfile.includes(Buffer.from('\r\n')))
  fail('package-lock.json contains CRLF instead of protected LF bytes');
if (!/^package-lock\.json\s+text\s+eol=lf\s*$/m.test(read('.gitattributes')))
  fail('.gitattributes no longer enforces package-lock.json LF bytes');

for (const path of [
  'shared/branding/index.ts',
  'shared/branding/public/brand/logo-mark.svg',
  'shared/branding/public/brand/logo-horizontal.svg',
  'shared/branding/public/brand/favicon.svg',
  'shared/branding/public/brand/app-icon.svg',
  'docs/production/WHITE-LABEL-GUIDE.md',
  'docs/production/CONSOLIDATED-UI-WHITE-LABEL-ACCEPTANCE.md',
  'scripts/production/white-label-propagation-check.mjs',
  'scripts/production/production-release-source-check.mjs',
]) {
  if (!existsSync(join(root, path)))
    fail(`missing consolidated control: ${path}`);
}

const branding = read('shared/branding/index.ts');
for (const required of [
  "const BRAND_NAME = 'VoiceCloud'",
  "const BRAND_SLUG = 'voicecloud'",
  'identity:',
  'products:',
  'contacts:',
  'assets:',
  'typography:',
  'colors:',
  'admin:',
  'creator:',
  'website:',
  "logoMark: 'brand/logo-mark.svg'",
  "logoHorizontal: 'brand/logo-horizontal.svg'",
  "favicon: 'brand/favicon.svg'",
  "appIcon: 'brand/app-icon.svg'",
]) {
  if (!branding.includes(required))
    fail(`central branding configuration is missing: ${required}`);
}

const adminTheme = read('admin/src/theme/theme.ts');
for (const required of [
  'BRAND_CONFIG.colors.admin',
  'BRAND_CONFIG.typography.adminFontFamily',
  'MuiButton',
  'MuiCard',
  'MuiTableCell',
]) {
  if (!adminTheme.includes(required))
    fail(`Admin design contract missing: ${required}`);
}

const creatorTheme = read('creator/src/theme/theme.ts');
if (!read('admin/src/index.css').includes('prefers-reduced-motion'))
  fail('Admin reduced-motion accessibility contract is missing');

for (const required of [
  'BRAND_CONFIG.colors.creator',
  'BRAND_CONFIG.typography.creatorFontFamily',
  'MuiButton',
  'MuiCard',
  'MuiOutlinedInput',
]) {
  if (!creatorTheme.includes(required))
    fail(`Creator design contract missing: ${required}`);
}

const website = read('website/src/App.tsx');
for (const required of [
  'BRAND_CONFIG.products.website.shortName',
  'BRAND_CONFIG.products.website.fullName',
  'BRAND_CONFIG.identity.tagline',
  'BRAND_CONFIG.colors.website.primary',
  'BRAND_CONFIG.colors.website.primaryLight',
]) {
  if (!website.includes(required))
    fail(`Website branding propagation missing: ${required}`);
}

const requiredPresentationBindings = new Map([
  ['admin/src/pages/DashboardPage.tsx', ['BRAND_CONFIG.identity.name']],
  ['admin/src/pages/LoginPage.tsx', ['BRAND_CONFIG.products.admin.shortName']],
  [
    'admin/src/pages/BackupManagementPage.tsx',
    ['BRAND_CONFIG.products.admin.shortName'],
  ],
  [
    'creator/src/components/layout/CreatorTopBar.tsx',
    ['BRAND_CONFIG.products.creator.shortName'],
  ],
  [
    'creator/src/components/layout/CreatorBreadcrumbs.tsx',
    ['BRAND_CONFIG.products.creator.shortName'],
  ],
  [
    'creator/src/pages/DashboardPage.tsx',
    ['BRAND_CONFIG.products.creator.shortName'],
  ],
  [
    'creator/src/pages/LoginPage.tsx',
    ['BRAND_CONFIG.products.creator.shortName'],
  ],
]);
for (const [path, markers] of requiredPresentationBindings) {
  const text = read(path);
  for (const marker of markers)
    if (!text.includes(marker)) fail(`${path} is not bound to ${marker}`);
}

const forbiddenCustomerFacingLiterals = [
  /\bVoiceCloud\b/,
  /Admin Console/,
  /Creator Studio/,
  /Live Audio Platform/,
  /Aurora Live Workspace/,
  /Modern Cloud \/ Ocean Blue/,
];
for (const appRoot of ['admin/src', 'creator/src', 'website/src']) {
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      const absolute = join(directory, name);
      const info = statSync(absolute);
      if (info.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!name.endsWith('.tsx')) continue;
      const text = readFileSync(absolute, 'utf8');
      for (const pattern of forbiddenCustomerFacingLiterals) {
        if (pattern.test(text))
          fail(
            `${relative(root, absolute).replaceAll('\\', '/')} contains hard-coded customer-facing branding (${pattern})`,
          );
      }
    }
  };
  walk(join(root, appRoot));
}

const technicalCompatibilityChecks = new Map([
  ['admin/src/store/auth.store.ts', 'voicecloud_admin_auth_v3'],
  ['admin/src/store/theme.store.ts', 'voicecloud_admin_theme'],
  ['creator/src/store/auth.store.ts', 'voicecloud-creator-auth-v3'],
  [
    'creator/src/services/creator-api.service.ts',
    'rtmps://live.voicecloud.app:443/live',
  ],
]);
for (const [path, marker] of technicalCompatibilityChecks) {
  if (!read(path).includes(marker))
    fail(`technical compatibility identifier changed unexpectedly: ${path}`);
}

const packageJson = JSON.parse(read('package.json'));
for (const script of [
  'ui:white-label:prepare',
  'ui:white-label:source-check',
  'ui:white-label:propagation-check',
  'ui:white-label:check',
  'format:consolidated-ui-white-label',
  'format:check:consolidated-ui-white-label',
  'release:production:check',
]) {
  if (!packageJson.scripts?.[script]) fail(`missing npm script: ${script}`);
}

if (
  !packageJson.scripts['format:check:production-release']?.includes(
    '--end-of-line auto',
  )
) {
  fail(
    'production release Prettier regression gate is not cross-platform EOL-safe',
  );
}

const propagationCheck = read(
  'scripts/production/white-label-propagation-check.mjs',
);
if (!propagationCheck.includes("branding.includes('\\r\\n')")) {
  fail('white-label propagation checker is not CRLF/LF-aware');
}

const gitignore = read('.gitignore');
if (!/^\/white-label-smoke-staging\/$/m.test(gitignore))
  fail('.gitignore does not exclude white-label smoke staging');

console.log('Consolidated UI / white-label source contract passed.');
console.log('Acceptance: VC-PH08-WP08-04-06');
console.log(`Accepted parent branch: ${acceptedParentBranch}`);
console.log(`Accepted parent commit: ${acceptedParentCommit}`);
console.log(`Accepted parent archive SHA-256: ${acceptedParentArchiveSha256}`);
console.log(
  `${protectedState.count} parent-controlled files remain byte-identical outside the approved presentation/tooling delta.`,
);
console.log('package-lock.json retains its protected LF-byte identity.');
console.log(
  'Customer-facing brand/product labels are centralized while technical compatibility identifiers remain unchanged.',
);
