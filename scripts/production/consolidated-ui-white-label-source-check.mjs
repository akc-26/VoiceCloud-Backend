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
const wp09AddedFiles = new Set([
  'scripts/wp09/wp09-consolidated-check.mjs',
  'scripts/wp09/wp09-runtime-acceptance.mjs',
  'scripts/wp09/wp09-real-check.ps1',
  'scripts/wp09/wp09-backup-encryption-source-check.mjs',
  'scripts/wp09/wp09-recovery-source-check.mjs',
  'scripts/wp09/wp09-quality-check.mjs',
  'scripts/wp09/wp09-regression-build-check.mjs',
  'src/common/http/production-http-hardening.ts',
]);
const wp09ModifiedFiles = new Map([
  ['scripts/production/production-release-check.mjs', { baseline: '813a8de6a5b1b396231530b16586f1b93e36c6cc51820d3d864bbd7beaa5f62f', approved: 'bbe153b14fbc64e8b36f67a361c67e296dc728edfb290521abc29f873791dbf5' }],
  ['.env.example', { baseline: '3210607151b3b874d469145fd78b990a6c2681d3ec0ee7a2b6c9de2832683ec5', approved: 'c05cd54941f073120cb5978db985426b12ed7406304ec29effa1caf8f8a13226' }],
  ['src/config/env-validator.ts', { baseline: '33ef0212fe585815331856c9745b932a94330f6d23804734ed1c075b1e30977b', approved: 'a158482d1cec3303cb1dcd8fc55e3e12577fa2f74baf8023fbe1d04908eaf326' }],
  ['src/config/env-validator.spec.ts', { baseline: '6ea0ff0137e17ddcccef6d226651fcef6f475bccf7394bdc94ee347139697c94', approved: 'c4b0dc6a72e2b73eadf790349da7216748c988b3637ed7b2ecc953fd5a54ad0d' }],
  ['src/config/validation.schema.ts', { baseline: 'fe90381812b72cf5b17380783da4f1ce0cdf23e82fe4917a42e524ae454e2bb7', approved: '54a29e0a53450b60e52da5e10cd3ae81128752b897936d73b721c406c6b5d87d' }],
  ['src/main.ts', { baseline: '268a1b6da0d4599237b4908240baf52ba9b9d228ebc54104a5ce2d1f9198a289', approved: '962eca07290a8c8b13de71ce11f4cfe5af6906b0635b699a52a4e66e13b5fd54' }],
  ['src/modules/admin/admin.controller.ts', { baseline: 'c624ccb7a81d04db13841148225e66a68472de775df52654db9d0c45abd469fc', approved: '297e8c7be0a59662ca03942a568577e3f2a53b96b1555b7b2bcc6174d2bc1ae1' }],
  ['src/modules/backup/backup.controller.ts', { baseline: '92afbd08c2108bbf51e212a76dc0b2ad3e93f5980dff797410e36e21d3916332', approved: '45346922b8eace4233e2efb043b8bd2fe64fa71ee2ef429a2d95b27feaf06478' }],
  ['src/modules/backup/backup.service.ts', { baseline: '6c784e14a182a98f10cf9b08c0ad54396eb0c935a7d9ae2a5cdd417bd4392e20', approved: 'e76c80652cd11fead0a925df3ac91242badedcd268f5009b1da5bb227cf96855' }],
  ['src/modules/backup/restore.service.ts', { baseline: 'febff4ef79e733de8ebff5e7378ff09b5d42d87138fabdf46b19449f6b3105f4', approved: 'd114abe064bca73f8a1a819972db3e15a2bd426c622cfa1bfbd4f72c52a231cb' }],
  ['src/modules/rankings/rankings.controller.ts', { baseline: '3e9f58bc7e90c28029fbdd3999305f358b139fe1c36769f79784436027f88f37', approved: '720f6aba2391ac11d4275d1c149e990c787f20f45f17fc239738964b0f952de4' }],
  ['src/modules/referral/controllers/admin-referral.controller.ts', { baseline: '216d50a7ac540447d5f1cb90a78a89d07237f56ea5e858ce02380230c4ec9680', approved: '440fb5813172398dd2e2a3229cd2431c678d68b66d4261dabb135935e038c840' }],
  ['src/modules/rtc/rtc.controller.ts', { baseline: '338e495a71963f6a1515567b918d6392b748e2ce1a483f1b618fb4316b514e89', approved: '399cf4af6068fd887718ba2d30bc8ed68c97200afc8c6e39771fbdfb280e67ea' }],
  ['src/modules/store/controllers/admin-store.controller.ts', { baseline: '26de54dd88e4a96dcd7a121346ca151c78d694254f5a4a45a667fbdfb4043794', approved: '997c9442131d6c23849f97b2d461dc21d7b02bf964eb197d6ddf239d89079f6b' }],
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
    if (wp09AddedFiles.has(rel)) continue;
    const wp09Modified = wp09ModifiedFiles.get(rel);
    if (wp09Modified) {
      const currentDigest = createHash('sha256')
        .update(readFileSync(absolute))
        .digest('hex');
      if (currentDigest !== wp09Modified.approved)
        fail(`approved WP09 file changed unexpectedly: ${rel}`);
      hash.update(rel);
      hash.update('\0');
      hash.update(Buffer.from(wp09Modified.baseline, 'hex'));
      count += 1;
      continue;
    }
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
