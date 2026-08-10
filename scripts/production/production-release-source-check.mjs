import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACCEPTED_PARENT_BRANCH,
  ACCEPTED_PARENT_COMMIT,
  PROTECTED_PACKAGE_LOCK_SHA256,
  RELEASE_ID,
} from './production-release-policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const consolidatedParentBranch = 'VoiceCloud-Backend-VC-PH08-WP08-04-05-R02';
const consolidatedParentCommit = '6ce1634c292645cb521c8d178adb0a7680ab77bb';
const protectedParentDigest =
  'ff5e7c31db3c38897ff4e037dd537250dcfb4bd9932974bf82f9a4d9ba227714';
const protectedParentFileCount = 880;
const allowedConsolidatedChanges = new Set([
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
  throw new Error(`Production release source check failed: ${message}`);
};
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const read = (relativePath) => {
  const file = join(root, relativePath);
  if (!existsSync(file)) fail(`missing required file: ${relativePath}`);
  return readFileSync(file, 'utf8');
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
    if (allowedConsolidatedChanges.has(rel)) continue;
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
    `protected source file count changed: expected ${protectedParentFileCount}, received ${protectedState.count}`,
  );
if (protectedState.digest !== protectedParentDigest)
  fail('source outside the approved consolidated white-label delta changed');

const lockfile = readFileSync(join(root, 'package-lock.json'));
if (sha256(lockfile) !== PROTECTED_PACKAGE_LOCK_SHA256)
  fail('package-lock.json changed from its protected identity');
if (lockfile.includes(Buffer.from('\r\n')))
  fail('package-lock.json contains CRLF instead of protected LF bytes');
if (!/^package-lock\.json\s+text\s+eol=lf\s*$/m.test(read('.gitattributes')))
  fail('.gitattributes no longer enforces package-lock.json LF bytes');

const packageJson = JSON.parse(read('package.json'));
for (const script of [
  'release:production:prepare',
  'release:production:source-check',
  'release:production:package',
  'release:production:runtime-smoke',
  'release:production:check',
  'format:production-release',
  'format:check:production-release',
]) {
  if (!packageJson.scripts?.[script])
    fail(`missing npm release script: ${script}`);
}

for (const relativePath of [
  'scripts/production/production-release-policy.mjs',
  'scripts/production/production-release-package.mjs',
  'scripts/production/production-release-runtime-smoke.mjs',
  'scripts/production/production-release-source-check.mjs',
  'scripts/production/production-release-check.mjs',
  'docs/production/PRODUCTION-RELEASE-PACKAGING.md',
  'docs/production/PRODUCTION-DEPLOYMENT-GUIDE.md',
  'docs/production/WHITE-LABEL-GUIDE.md',
]) {
  if (!existsSync(join(root, relativePath)))
    fail(`missing release implementation file: ${relativePath}`);
}

const gitignore = read('.gitignore');
if (!/^\/\.release\/$/m.test(gitignore))
  fail('.gitignore does not exclude generated .release packages');
if (!/^\/release-smoke-staging\/$/m.test(gitignore))
  fail('.gitignore does not exclude runtime-smoke staging output');
if (!/^\/white-label-smoke-staging\/$/m.test(gitignore))
  fail('.gitignore does not exclude white-label smoke staging output');

const policy = read('scripts/production/production-release-policy.mjs');
for (const required of [
  RELEASE_ID,
  ACCEPTED_PARENT_BRANCH,
  ACCEPTED_PARENT_COMMIT,
  'SOURCE_PACKAGE_FORBIDDEN_PATTERNS',
  'RUNTIME_PACKAGE_FORBIDDEN_PATTERNS',
  'SECRET_ASSIGNMENT_KEYS',
  'WHITE-LABEL-GUIDE.md',
]) {
  if (!policy.includes(required))
    fail(`release policy is missing required control: ${required}`);
}

const releaseCheck = read('scripts/production/production-release-check.mjs');
for (const required of [
  'containsRealPrivateKey',
  'isPlaceholderSecret',
  'compact.length >= 128',
]) {
  if (!releaseCheck.includes(required))
    fail(`release secret scanner is missing permanent control: ${required}`);
}

const runtimeSmoke = read(
  'scripts/production/production-release-runtime-smoke.mjs',
);
for (const required of [
  'RUNTIME_ZIP_NAME',
  'release-smoke-staging',
  'extractAllTo',
  "await assertHtml('/admin/login', 'Admin deep link')",
  "await assertHtml('/creator/login', 'Creator deep link')",
]) {
  if (!runtimeSmoke.includes(required))
    fail(`runtime ZIP smoke is missing permanent control: ${required}`);
}

for (const required of [
  'BRAND_CONFIG.identity.name',
  'BRAND_CONFIG.products.admin.shortName',
]) {
  const combined = [
    read('admin/src/pages/DashboardPage.tsx'),
    read('admin/src/pages/LoginPage.tsx'),
    read('admin/src/pages/BackupManagementPage.tsx'),
  ].join('\n');
  if (!combined.includes(required))
    fail(
      `Admin release source is missing centralized branding binding: ${required}`,
    );
}
for (const required of ['BRAND_CONFIG.products.creator.shortName']) {
  const combined = [
    read('creator/src/components/layout/CreatorTopBar.tsx'),
    read('creator/src/components/layout/CreatorBreadcrumbs.tsx'),
    read('creator/src/pages/DashboardPage.tsx'),
    read('creator/src/pages/LoginPage.tsx'),
  ].join('\n');
  if (!combined.includes(required))
    fail(
      `Creator release source is missing centralized branding binding: ${required}`,
    );
}
for (const required of [
  'BRAND_CONFIG.products.website.shortName',
  'BRAND_CONFIG.colors.website.primary',
]) {
  if (!read('website/src/App.tsx').includes(required))
    fail(
      `Website release source is missing centralized branding binding: ${required}`,
    );
}

console.log('Production release source contract passed.');
console.log(`Release pipeline: ${RELEASE_ID}`);
console.log(`Release foundation parent: ${ACCEPTED_PARENT_BRANCH}`);
console.log(`Release foundation commit: ${ACCEPTED_PARENT_COMMIT}`);
console.log(`Consolidated parent branch: ${consolidatedParentBranch}`);
console.log(`Consolidated parent commit: ${consolidatedParentCommit}`);
console.log(
  `${protectedState.count} parent-controlled source files remain byte-identical outside the approved consolidated presentation/tooling delta.`,
);
console.log('package-lock.json retains its protected LF-byte identity.');
console.log(
  'Production source/runtime packaging policy and centralized white-label bindings are present.',
);
