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

import { verifyR10BaselineIntegrity } from '../wp09/wp09-r10-baseline-integrity.mjs';
import { verifyR11BaselineIntegrity } from '../wp09/wp09-r11-baseline-integrity.mjs';

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

const postWp09ModifiedFiles = new Map([
  ['src/modules/rtc/rtc.service.ts', { baseline: '661a0fab96c02841da32bd9635380e2f7195a1f27f29133bc7a0e5d6c75dd59d', approved: '11406395ec7e1447b0c2176fa1bcbf9f30779539cdf2f08c7ede00959b12ab37' }],
  ['src/modules/rtc/phase20-rtc.spec.ts', { baseline: '2faf2ea4605c2f25246dbdd7414cea05451e82475e974d29269667d840541efe', approved: 'b3657557856205ff09e39cd2a7258eea884ff4593f4608fbaef208555b0b9a24' }],
  ['src/modules/hosts/host-verification-asset.service.ts', { baseline: '6c18bf9c10545a88c77f1730fd34168d7817c9f5fbddc0f859910d83637ecf38', approved: 'e1138fb4eb257b9c506459f27dc8f07c7dc3d3deb269eb166b97b8322cef15df' }],
  ['admin/src/pages/ProviderConfigsPage.tsx', { baseline: '19ea5bf37e3cc6dfcab98e39ed6b95bbf25bb218781e4e5855645cd9b2df11bc', approved: '35050e4fbc8bcb5d62fe13b38f1cc1924b896d9aa94813ffaf672fb07a0ed406' }],
  ['src/modules/storage/storage.factory.spec.ts', { baseline: '8686fdce7bd7fb021260136feaa62f5f2c676e735d88ca9179e93c2dbce05676', approved: 'd5afe882a3b31934b5ec6b60122d4790a7984b70d51066decef8658475f385af' }],
  ['src/modules/storage/storage.factory.ts', { baseline: '092a32e68268618c35bcbf6311b916ece8e70d983ac9bbadc4f8673da66f80ef', approved: '77c659459a5d496b84e0095c7847ecefab5ff90a5e5fb675791929b71f6225cb' }],
  ['src/modules/storage/storage.service.ts', { baseline: 'e05ce8a4687da7f650e3ce1b42ea3b0e51b1fd1fcd475e2b741b4b20869b4354', approved: '344a9141fcb890aa00d96902889b002e761273ddbe4d33014e8699553216e55d' }],
  ['admin/src/pages/RtcPage.tsx', { baseline: '89529091f2d2529510c4427bbdef90d0ef3b57875052dc8fb5280bcad674e813', approved: '9809262e4d2b403666b23b681f2a1e13f6c27168ae7215123cf6f2551362b819' }],
  ['admin/src/services/admin.service.ts', { baseline: '73813c1784b2c04937fa43ca18bed31b6c7c69296bfa079561908447a1b9fd8f', approved: '780fd685709716d6c247e2f0b500bd8805ca2272f7ba938b6b61d4cd8fffe9c7' }],
  ['creator/src/pages/LiveRoomsPage.tsx', { baseline: 'f0b4132c04682e5de0e0ae545a96e38cfe151ca179fa72fc61087dd401f89342', approved: 'e7a2f14c1a22c6126631c8ada69ae4f07f8cf4e219b8bf1aae3e47412167b5ec' }],
  ['creator/src/services/creator-api.service.ts', { baseline: '8e9751e2ca112c25895db194b943e10ff40b0be084924a6fe61b5f0295f8f415', approved: 'af6ddbc4792eaa8b1e8f873e2d7dcadbcebb00ce56b9488885a0c596e438df8a' }],
  ['src/modules/admin/admin-providers.service.ts', { baseline: 'acd4be11fdfd86f29ce07753ee985ae9d751b1a9a7c91e0e7af24305566dddec', approved: 'a1f6dd464a2d46334bae231b22410f8794f394d033e873237753faa4c4e3ffe6' }],
]);
const postWp09AddedFiles = new Set([
  'scripts/wp09/wp09-r05-manual-fixes-source-check.mjs',
  'scripts/wp09/wp09-r06-provider-private-storage-source-check.mjs',
  'scripts/wp09/wp09-r07-host-real-infra-source-check.mjs',
  'scripts/wp09/wp09-r08-build-script-fixes-source-check.mjs',
  'scripts/wp09/wp09-r09-rtc-room-authority-source-check.mjs',
  'scripts/start-local-full-real.mjs',
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
    if (wp09AddedFiles.has(rel) || postWp09AddedFiles.has(rel)) continue;
    const postWp09Modified = postWp09ModifiedFiles.get(rel);
    if (postWp09Modified) {
      const currentDigest = createHash('sha256')
        .update(readFileSync(absolute))
        .digest('hex');
      if (currentDigest !== postWp09Modified.approved)
        fail(`approved WP09 R05 file changed unexpectedly: ${rel}`);
      hash.update(rel);
      hash.update('\0');
      hash.update(Buffer.from(postWp09Modified.baseline, 'hex'));
      count += 1;
      continue;
    }
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

const r11ProtectedState = verifyR11BaselineIntegrity(root, 'Production release R11 baseline integrity');
const r10ProtectedState = r11ProtectedState ? null : verifyR10BaselineIntegrity(root, 'Production release R10 baseline integrity');
let legacyProtectedState = null;
if (!r11ProtectedState && !r10ProtectedState) {
  legacyProtectedState = protectedDigest();
  const protectedState = legacyProtectedState;
  if (protectedState.count !== protectedParentFileCount)
    fail(
      `protected source file count changed: expected ${protectedParentFileCount}, received ${protectedState.count}`,
    );
  if (protectedState.digest !== protectedParentDigest)
    fail('source outside the approved consolidated white-label delta changed');
}

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
  r11ProtectedState
    ? `${r11ProtectedState.checkedBaseline} R10 baseline files remain content-identical after cross-platform EOL normalization outside the approved R11 delta.`
    : r10ProtectedState
      ? `${r10ProtectedState.checkedBaseline} R09 baseline files remain content-identical after cross-platform EOL normalization outside the approved R10 delta.`
      : `${legacyProtectedState.count} parent-controlled source files remain byte-identical outside the approved consolidated presentation/tooling delta.`,
);
console.log('package-lock.json retains its protected LF-byte identity.');
console.log(
  'Production source/runtime packaging policy and centralized white-label bindings are present.',
);
