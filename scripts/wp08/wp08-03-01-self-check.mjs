import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, '../..');

const BASELINE_BRANCH = 'VoiceCloud-Backend-VC-PH08-WP08-02-R05';
const BASELINE_COMMIT = '5d73fac20e87630b70ca8bfe6711be93d94138f0';
const MANIFEST_PATH = 'docs/wp08/wp08-03-01-economy-contract-lock.json';
const REPORT_PATH =
  'docs/wp08/WP08-03-01-ECONOMY-AUDIT-AND-CONTRACT-LOCK.md';
const CHECKER_PATH = 'scripts/wp08/wp08-03-01-check.ps1';
const FRONTEND_SMOKE_PATH = 'scripts/wp08/wp08-03-01-frontend-smoke.mjs';
const FRONTEND_HOSTING_PATH = 'src/hosting/frontend-hosting.ts';
const MAIN_PATH = 'src/main.ts';

const readBytes = (relativePath) => {
  return readFileSync(join(root, relativePath));
};

const readText = (relativePath) => {
  return readFileSync(join(root, relativePath), 'utf8');
};

const sha256 = (relativePath) => {
  return createHash('sha256').update(readBytes(relativePath)).digest('hex');
};

const manifest = JSON.parse(readText(MANIFEST_PATH));
const report = readText(REPORT_PATH);
const checker = readText(CHECKER_PATH);
const frontendSmoke = readText(FRONTEND_SMOKE_PATH);
const frontendHosting = readText(FRONTEND_HOSTING_PATH);
const mainSource = readText(MAIN_PATH);
const packageJson = JSON.parse(readText('package.json'));

const fail = (message) => {
  throw new Error(`WP08-03-01 self-check failed: ${message}`);
};

if (manifest.workPackage !== 'VC-PH08-WP08-03-01') {
  fail('unexpected work-package identity');
}

if (manifest.baseline.branch !== BASELINE_BRANCH) {
  fail('unexpected baseline branch');
}

if (manifest.baseline.commit !== BASELINE_COMMIT) {
  fail('unexpected baseline commit');
}

if (sha256('package-lock.json') !== manifest.baseline.packageLockSha256) {
  fail('package-lock.json differs from the approved baseline');
}

for (const entry of manifest.sourceSnapshot) {
  readBytes(entry.path);
  if (!/^[a-f0-9]{64}$/.test(entry.sha256)) {
    fail(`invalid historical source hash evidence: ${entry.path}`);
  }
}

const requiredFindingIds = Array.from({ length: 16 }, (_, index) => {
  return `ECO-${String(index + 1).padStart(3, '0')}`;
});
const findingIds = new Set(manifest.findings.map((finding) => finding.id));

for (const findingId of requiredFindingIds) {
  if (!findingIds.has(findingId)) {
    fail(`missing finding ${findingId}`);
  }
}

const requiredReportSections = [
  '## 2. Authoritative baseline',
  '## 4. Current architecture map',
  '## 5. Findings',
  '## 6. Locked implementation principles',
  '## 7. Required sequence after this package',
  '## 8. Validation strategy for WP08-03-01',
];

for (const section of requiredReportSections) {
  if (!report.includes(section)) {
    fail(`audit report is missing section: ${section}`);
  }
}

const scripts = packageJson.scripts;
const expectedScripts = {
  'start:full': 'npm run build && node scripts/start-local-full.mjs',
  'format:wp08:03:01':
    'prettier --write "src/main.ts" "src/hosting/frontend-hosting.ts" "src/hosting-routing.spec.ts" "src/wp08/wp08-03-01-economy-contract.spec.ts" "scripts/start-local-full.mjs" "scripts/wp08/wp08-03-01-self-check.mjs" "scripts/wp08/wp08-03-01-frontend-smoke.mjs"',
  'format:check:wp08:03:01':
    'prettier --check "src/main.ts" "src/hosting/frontend-hosting.ts" "src/hosting-routing.spec.ts" "src/wp08/wp08-03-01-economy-contract.spec.ts" "scripts/start-local-full.mjs" "scripts/wp08/wp08-03-01-self-check.mjs" "scripts/wp08/wp08-03-01-frontend-smoke.mjs"',
  'lint:fix:wp08:03:01':
    'eslint "src/main.ts" "src/hosting/frontend-hosting.ts" "src/hosting-routing.spec.ts" "src/wp08/wp08-03-01-economy-contract.spec.ts" --fix --no-cache',
  'lint:wp08:03:01':
    'eslint "src/main.ts" "src/hosting/frontend-hosting.ts" "src/hosting-routing.spec.ts" "src/wp08/wp08-03-01-economy-contract.spec.ts" --no-cache',
  'wp08:03:01:self-check':
    'node scripts/wp08/wp08-03-01-self-check.mjs',
  'test:wp08:03:01':
    'jest --runInBand --runTestsByPath src/wp08/wp08-03-01-economy-contract.spec.ts src/hosting-routing.spec.ts',
  'wp08:03:01:frontend-smoke':
    'node scripts/wp08/wp08-03-01-frontend-smoke.mjs',
  'wp08:03:01:check':
    'powershell -ExecutionPolicy Bypass -File scripts/wp08/wp08-03-01-check.ps1',
};

for (const [name, command] of Object.entries(expectedScripts)) {
  if (scripts[name] !== command) {
    fail(`package.json command is missing or changed: ${name}`);
  }
}

if (!checker.includes('package-owned formatting')) {
  fail('checker does not identify package-scoped formatting handling');
}

if (!checker.includes('npm.cmd run format:wp08:03:01')) {
  fail('checker does not normalize the package-scoped formatting before verification');
}

if (!checker.includes('npm.cmd run format:check:wp08:03:01')) {
  fail('checker does not run the package-scoped formatting check');
}

if (!checker.includes('npm.cmd run lint:fix:wp08:03:01')) {
  fail('checker does not normalize package-scoped ESLint fixes before verification');
}

if (!checker.includes('npm.cmd run lint:wp08:03:01')) {
  fail('checker does not run the package-scoped lint verification');
}

if (!checker.includes('npm.cmd run wp08:03:01:frontend-smoke')) {
  fail('checker does not run the compiled frontend runtime smoke test');
}

if (!checker.includes('R05 FULL BUILD AND FRONTEND RUNTIME CHECKS PASSED')) {
  fail('checker is missing the R05 runtime success marker');
}

if (
  !checker.includes('COLLECTED FAILURES:') ||
  !checker.includes('$Failures')
) {
  fail('checker does not aggregate independent failures into one report');
}

for (const route of [
  "'/'",
  "'/pricing'",
  "'/apiary'",
  "'/admin/'",
  "'/admin/index.html'",
  "'/admin/login'",
  "'/creator/'",
  "'/creator/index.html'",
  "'/creator/login'",
  "'/api/v1/nonexistent-route'",
]) {
  if (!frontendSmoke.includes(route)) {
    fail(`frontend smoke test is missing route ${route}`);
  }
}

if (!frontendSmoke.includes("contentType.includes('text/html')")) {
  fail('frontend smoke test does not enforce HTML content types');
}

if (!frontendSmoke.includes('assetResponse.ok')) {
  fail('frontend smoke test does not verify compiled frontend assets');
}

if (!frontendSmoke.includes('VOICECLOUD_LOCAL_PORT')) {
  fail('frontend smoke test does not isolate its runtime port');
}

if (!readText('scripts/start-local-full.mjs').includes(
  "process.env.VOICECLOUD_LOCAL_PORT || '3000'",
)) {
  fail('full local startup does not default deterministically to port 3000');
}

if (!mainSource.includes('app.getHttpAdapter().getInstance()')) {
  fail('main bootstrap does not use the underlying Express adapter instance');
}

if (!mainSource.includes('registerFrontendHosting(expressApp')) {
  fail('main bootstrap does not register frontend hosting on Express');
}

if (!frontendHosting.includes("expressApp.use('/admin'")) {
  fail('frontend hosting does not register Admin static assets directly');
}

if (!frontendHosting.includes("expressApp.use('/creator'")) {
  fail('frontend hosting does not register Creator static assets directly');
}

if (!frontendHosting.includes('const websiteStatic = express.static')) {
  fail('frontend hosting does not create Landing static middleware');
}

if (
  !frontendHosting.includes('return websiteStatic(request, response, next)')
) {
  fail('frontend hosting does not register Landing static middleware');
}

if (/npm\s+audit\s+fix/.test(checker)) {
  fail('checker must not mutate dependencies');
}

const formattingDebt = manifest.baselineFormattingDebt;
if (!Array.isArray(formattingDebt) || formattingDebt.length !== 17) {
  fail('baseline formatting debt must contain the 17 inherited files');
}

console.log('WP08-03-01 economy audit self-check passed.');
console.log(
  `Retained ${manifest.sourceSnapshot.length} historical audited-source hashes and ${manifest.findings.length} findings.`,
);
console.log(
  `Recorded ${formattingDebt.length} inherited formatting-debt files without modifying them.`,
);
