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
