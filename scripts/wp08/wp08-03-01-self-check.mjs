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
  if (sha256(entry.path) !== entry.sha256) {
    fail(`audited source changed without a contract update: ${entry.path}`);
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
  'format:wp08:03:01':
    'prettier --write "src/wp08/wp08-03-01-economy-contract.spec.ts" "scripts/wp08/wp08-03-01-self-check.mjs"',
  'format:check:wp08:03:01':
    'prettier --check "src/wp08/wp08-03-01-economy-contract.spec.ts" "scripts/wp08/wp08-03-01-self-check.mjs"',
  'lint:wp08:03:01':
    'eslint "src/wp08/wp08-03-01-economy-contract.spec.ts" --no-cache',
  'wp08:03:01:self-check':
    'node scripts/wp08/wp08-03-01-self-check.mjs',
  'test:wp08:03:01':
    'jest --runInBand --runTestsByPath src/wp08/wp08-03-01-economy-contract.spec.ts',
  'wp08:03:01:check':
    'powershell -ExecutionPolicy Bypass -File scripts/wp08/wp08-03-01-check.ps1',
};

for (const [name, command] of Object.entries(expectedScripts)) {
  if (scripts[name] !== command) {
    fail(`package.json command is missing or changed: ${name}`);
  }
}

if (!checker.includes('package-owned files')) {
  fail('checker does not identify package-scoped formatting handling');
}

if (!checker.includes('npm.cmd run format:wp08:03:01')) {
  fail('checker does not normalize package-owned formatting');
}

if (!checker.includes('npm.cmd run format:check:wp08:03:01')) {
  fail('checker does not run the package-scoped formatting check');
}

if (!checker.includes('npm.cmd run lint:wp08:03:01')) {
  fail('checker does not run the package-scoped lint check');
}

if (/npm\.cmd\s+run\s+format(?:\s|$)/.test(checker)) {
  fail('checker must not run the mutating format command');
}

if (/eslint[^\r\n]*--fix/.test(checker)) {
  fail('checker must not run mutating ESLint');
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
  `Locked ${manifest.sourceSnapshot.length} audited source files and ${manifest.findings.length} findings.`,
);
console.log(
  `Recorded ${formattingDebt.length} inherited formatting-debt files without modifying them.`,
);
