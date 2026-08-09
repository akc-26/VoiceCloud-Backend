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
const protectedDirectoryDigests = new Map([
  ['src', 'e539eddd899266ce7c89fd0110b17eac4a4d5d114223f1c00ab76e26851dd54a'],
  ['admin', '1af9fa390a1f25b8fac11b2c731b127b0e7f6d8cbe9c80f51039f61248e4f0c3'],
  [
    'creator',
    '2cc327d289791c0b7c49eab494054e3e6c346cacc6dea9095bfe0dbbcf8bbc5e',
  ],
  [
    'website',
    '949ce92289b62ade8be0883d3e87c1f63622d93ac8fe7ef826fc52736bc941c6',
  ],
  [
    'shared',
    '5dc85f4f2d46fb4b5380e6a0a8c719176f03f2df1e1f92241d9ce08ab3fa0a23',
  ],
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
const directoryDigest = (relativeDirectory) => {
  const directory = join(root, relativeDirectory);
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
  for (const absolute of files.sort((left, right) =>
    relative(directory, left).localeCompare(relative(directory, right)),
  )) {
    const rel = relative(directory, absolute).replaceAll('\\', '/');
    hash.update(rel);
    hash.update('\0');
    hash.update(createHash('sha256').update(readFileSync(absolute)).digest());
  }
  return hash.digest('hex');
};

for (const [directory, expected] of protectedDirectoryDigests) {
  if (!existsSync(join(root, directory)))
    fail(`missing protected directory: ${directory}`);
  const actual = directoryDigest(directory);
  if (actual !== expected)
    fail(`accepted product source changed unexpectedly: ${directory}`);
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

console.log('Production release source contract passed.');
console.log(`Release: ${RELEASE_ID}`);
console.log(`Accepted parent branch: ${ACCEPTED_PARENT_BRANCH}`);
console.log(`Accepted parent commit: ${ACCEPTED_PARENT_COMMIT}`);
console.log(
  'Backend, Admin, Creator, Website and shared product source remain byte-identical to the accepted parent.',
);
console.log('package-lock.json retains its protected LF-byte identity.');
console.log(
  'Production source/runtime packaging policy and white-label instructions are present.',
);
