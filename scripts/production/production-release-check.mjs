import AdmZip from 'adm-zip';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROTECTED_PACKAGE_LOCK_SHA256,
  RELEASE_ROOT,
  RUNTIME_FOLDER_NAME,
  RUNTIME_PACKAGE_FORBIDDEN_PATTERNS,
  RUNTIME_REQUIRED_PATHS,
  RUNTIME_ZIP_NAME,
  SECRET_ASSIGNMENT_KEYS,
  SOURCE_FOLDER_NAME,
  SOURCE_PACKAGE_FORBIDDEN_PATTERNS,
  SOURCE_REQUIRED_PATHS,
  SOURCE_ZIP_NAME,
} from './production-release-policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = process.env.npm_execpath;
if (!npmCli)
  throw new Error(
    'Run this verifier through npm run release:production:check.',
  );
const totalStages = 13;
const passed = [];
const failed = [];
const skipped = [];
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
]);
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const sha256File = (file) => sha256(readFileSync(file));

const snapshot = () => {
  const hashes = new Map();
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      if (excludedDirectories.has(name)) continue;
      const absolute = join(directory, name);
      const info = statSync(absolute);
      if (info.isDirectory()) walk(absolute);
      else {
        const rel = relative(root, absolute).replaceAll('\\', '/');
        if (
          rel === '.env' ||
          rel.endsWith('.log') ||
          rel.endsWith('.tsbuildinfo') ||
          rel.endsWith('.zip')
        )
          continue;
        hashes.set(rel, sha256File(absolute));
      }
    }
  };
  walk(root);
  return hashes;
};
const initial = snapshot();

const run = (number, label, command, args, options = {}) => {
  const stage = `[${number}/${totalStages}] ${label}`;
  console.log(`\n${stage}`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.error) {
    failed.push(`${stage}: ${result.error.message}`);
    return false;
  }
  if (result.status === 0) {
    passed.push(stage);
    return true;
  }
  failed.push(`${stage} (exit code ${result.status ?? 'unknown'})`);
  return false;
};
const runNpm = (number, label, args) =>
  run(number, label, process.execPath, [npmCli, ...args]);
const skip = (number, label, reason) => {
  const stage = `[${number}/${totalStages}] ${label}`;
  console.log(`\n${stage}\nSKIP ${reason}`);
  skipped.push(stage);
};
const depsReady = () =>
  existsSync(join(root, 'node_modules', '.package-lock.json')) &&
  ['jest', 'prettier', 'nest', 'vite'].every(
    (name) =>
      existsSync(join(root, 'node_modules', '.bin', name)) ||
      existsSync(join(root, 'node_modules', '.bin', `${name}.cmd`)),
  );

const walkPackage = (directory) => {
  const files = [];
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      const absolute = join(current, name);
      const info = statSync(absolute);
      if (info.isDirectory()) walk(absolute);
      else files.push(absolute);
    }
  };
  walk(directory);
  return files;
};
const isPlaceholderSecret = (value) =>
  /CHANGE_ME|your-|\.\.\.|example|placeholder|_DEFAULT\b|_TEST\b/i.test(value);

const containsRealPrivateKey = (text) => {
  const blockPattern =
    /-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----([\s\S]*?)-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----/g;
  for (const match of text.matchAll(blockPattern)) {
    const body = match[1].trim();
    if (isPlaceholderSecret(body)) continue;
    const compact = body.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(compact) && compact.length >= 128) return true;
  }
  return false;
};

const scanSecrets = (packageRoot, files) => {
  const failures = [];
  const textExtensions =
    /\.(?:js|cjs|mjs|ts|tsx|json|md|txt|html|css|env|example|yaml|yml)$/i;
  for (const absolute of files) {
    const rel = relative(packageRoot, absolute).replaceAll('\\', '/');
    if (!textExtensions.test(rel) && !rel.endsWith('.env.example')) continue;
    const text = readFileSync(absolute, 'utf8');
    if (containsRealPrivateKey(text))
      failures.push(`${rel}: private key material`);
    for (const tokenPattern of [
      /\bghp_[A-Za-z0-9]{20,}\b/g,
      /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
      /\bsk-[A-Za-z0-9]{20,}\b/g,
    ]) {
      if (tokenPattern.test(text)) failures.push(`${rel}: token-like secret`);
    }
    for (const key of SECRET_ASSIGNMENT_KEYS) {
      const match = text.match(
        new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, 'm'),
      );
      if (!match) continue;
      let value = match[1].trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('\"') && value.endsWith('\"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1).trim();
      }
      if (!isPlaceholderSecret(value))
        failures.push(`${rel}: non-placeholder ${key}`);
    }
  }
  return failures;
};

const verifyChecksums = (packageRoot) => {
  const file = join(packageRoot, 'SHA256SUMS.txt');
  if (!existsSync(file)) return ['missing SHA256SUMS.txt'];
  const failures = [];
  for (const line of readFileSync(file, 'utf8').trim().split(/\r?\n/)) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) {
      failures.push(`malformed checksum line: ${line}`);
      continue;
    }
    const target = join(packageRoot, match[2]);
    if (!existsSync(target))
      failures.push(`checksum target missing: ${match[2]}`);
    else if (sha256File(target) !== match[1])
      failures.push(`checksum mismatch: ${match[2]}`);
  }
  return failures;
};
const auditPackage = (packageRoot, required, forbidden, kind) => {
  const problems = [];
  if (!existsSync(packageRoot))
    return [`missing ${kind} package root: ${packageRoot}`];
  for (const requiredPath of required) {
    if (!existsSync(join(packageRoot, requiredPath)))
      problems.push(`missing required ${kind} path: ${requiredPath}`);
  }
  const files = walkPackage(packageRoot);
  for (const absolute of files) {
    const rel = relative(packageRoot, absolute).replaceAll('\\', '/');
    for (const pattern of forbidden) {
      if (pattern.test(rel)) {
        problems.push(`forbidden ${kind} path: ${rel}`);
        break;
      }
    }
  }
  problems.push(...scanSecrets(packageRoot, files));
  problems.push(...verifyChecksums(packageRoot));
  const lockfile = join(packageRoot, 'package-lock.json');
  if (
    existsSync(lockfile) &&
    sha256File(lockfile) !== PROTECTED_PACKAGE_LOCK_SHA256
  )
    problems.push(`${kind} package-lock.json hash drifted`);
  return problems;
};
const markAudit = (number, label, problems) => {
  const stage = `[${number}/${totalStages}] ${label}`;
  console.log(`\n${stage}`);
  if (problems.length) {
    for (const problem of problems) console.log(`FAIL ${problem}`);
    failed.push(`${stage}: ${problems.length} problem(s)`);
    return false;
  }
  console.log('PASS');
  passed.push(stage);
  return true;
};
const zipEntries = (zipPath) =>
  new AdmZip(zipPath)
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => ({
      name: entry.entryName,
      sha256: sha256(entry.getData()),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

console.log('============================================================');
console.log('VoiceCloud Production Source Sanitation & Release Packaging');
console.log('============================================================');
console.log(`Repository root: ${root}`);
console.log(
  'Acceptance may build/package generated output but must not mutate tracked source.',
);

run(
  1,
  'Production release source and parent-boundary contract',
  process.execPath,
  ['scripts/production/production-release-source-check.mjs'],
);

let ready = true;
if (depsReady()) {
  console.log(
    '\n[2/13] Locked dependency availability\nPASS existing node_modules is complete; npm ci is not repeated.',
  );
  passed.push('[2/13] Locked dependency availability');
} else {
  ready = runNpm(2, 'Locked npm dependency installation', [
    'ci',
    '--include=dev',
  ]);
}

if (ready) {
  runNpm(3, 'Production release tooling Prettier check', [
    'run',
    'format:check:production-release',
  ]);
  runNpm(4, 'Admin, Creator and Website TypeScript typecheck', [
    'run',
    'typecheck:ui-foundation',
  ]);
  runNpm(5, 'Complete Jest regression suite', [
    'test',
    '--',
    '--runInBand',
    '--config',
    'jest.config.js',
  ]);
  const built = runNpm(6, 'Unified Backend, Website, Admin and Creator build', [
    'run',
    'build',
  ]);
  if (built) {
    runNpm(7, 'Existing compiled application runtime smoke', [
      'run',
      'wp08:03:01:frontend-smoke',
    ]);
    const packaged = runNpm(
      8,
      'Generate sanitized source and runtime release packages',
      ['run', 'release:production:package'],
    );

    if (packaged) {
      const releaseRoot = join(root, RELEASE_ROOT);
      const sourceRoot = join(releaseRoot, SOURCE_FOLDER_NAME);
      const runtimeRoot = join(releaseRoot, RUNTIME_FOLDER_NAME);
      markAudit(
        9,
        'Sanitized production source package policy/integrity audit',
        auditPackage(
          sourceRoot,
          SOURCE_REQUIRED_PATHS,
          SOURCE_PACKAGE_FORBIDDEN_PATTERNS,
          'source',
        ),
      );
      markAudit(
        10,
        'Sanitized production runtime package policy/integrity audit',
        auditPackage(
          runtimeRoot,
          RUNTIME_REQUIRED_PATHS,
          RUNTIME_PACKAGE_FORBIDDEN_PATTERNS,
          'runtime',
        ),
      );
      runNpm(11, 'Sanitized packaged runtime browser/API smoke', [
        'run',
        'release:production:runtime-smoke',
      ]);

      const reproRoot = '.release/wp08-04-05-repro';
      const reproOk = run(
        12,
        'Deterministic package reproducibility',
        process.execPath,
        [
          'scripts/production/production-release-package.mjs',
          '--output',
          reproRoot,
        ],
        { stdio: 'pipe' },
      );
      if (reproOk) {
        const sourceA = join(root, RELEASE_ROOT, SOURCE_ZIP_NAME);
        const sourceB = join(root, reproRoot, SOURCE_ZIP_NAME);
        const runtimeA = join(root, RELEASE_ROOT, RUNTIME_ZIP_NAME);
        const runtimeB = join(root, reproRoot, RUNTIME_ZIP_NAME);
        const deterministic =
          sha256File(sourceA) === sha256File(sourceB) &&
          sha256File(runtimeA) === sha256File(runtimeB) &&
          JSON.stringify(zipEntries(sourceA)) ===
            JSON.stringify(zipEntries(sourceB)) &&
          JSON.stringify(zipEntries(runtimeA)) ===
            JSON.stringify(zipEntries(runtimeB));
        if (!deterministic) {
          passed.splice(
            passed.indexOf('[12/13] Deterministic package reproducibility'),
            1,
          );
          failed.push(
            '[12/13] Deterministic package reproducibility: generated artifacts differ',
          );
        } else
          console.log('PASS repeated source/runtime ZIPs are byte-identical.');
      }
      rmSync(join(root, reproRoot), { recursive: true, force: true });
    } else {
      for (const [number, label] of [
        [9, 'Sanitized production source package policy/integrity audit'],
        [10, 'Sanitized production runtime package policy/integrity audit'],
        [11, 'Sanitized packaged runtime browser/API smoke'],
        [12, 'Deterministic package reproducibility'],
      ])
        skip(number, label, 'release package generation failed');
    }
  } else {
    for (const [number, label] of [
      [7, 'Existing compiled application runtime smoke'],
      [8, 'Generate sanitized source and runtime release packages'],
      [9, 'Sanitized production source package policy/integrity audit'],
      [10, 'Sanitized production runtime package policy/integrity audit'],
      [11, 'Sanitized packaged runtime browser/API smoke'],
      [12, 'Deterministic package reproducibility'],
    ])
      skip(number, label, 'unified build failed');
  }
} else {
  for (const [number, label] of [
    [3, 'Production release tooling Prettier check'],
    [4, 'Admin, Creator and Website TypeScript typecheck'],
    [5, 'Complete Jest regression suite'],
    [6, 'Unified Backend, Website, Admin and Creator build'],
    [7, 'Existing compiled application runtime smoke'],
    [8, 'Generate sanitized source and runtime release packages'],
    [9, 'Sanitized production source package policy/integrity audit'],
    [10, 'Sanitized production runtime package policy/integrity audit'],
    [11, 'Sanitized packaged runtime browser/API smoke'],
    [12, 'Deterministic package reproducibility'],
  ])
    skip(number, label, 'dependencies unavailable');
}

const final = snapshot();
const changed = [];
for (const file of new Set([...initial.keys(), ...final.keys()])) {
  if (initial.get(file) !== final.get(file)) changed.push(file);
}
console.log('\n[13/13] Source immutability verification');
if (changed.length)
  failed.push(
    `[13/13] Source immutability verification: ${changed.sort().join(', ')}`,
  );
else {
  console.log(
    `PASS ${final.size} source/configuration files remained unchanged.`,
  );
  passed.push('[13/13] Source immutability verification');
}

console.log('\n============================================================');
console.log('PRODUCTION RELEASE PACKAGING SUMMARY');
console.log('============================================================');
console.log(`Passed stages: ${passed.length}`);
console.log(`Failed stages: ${failed.length}`);
console.log(`Skipped stages: ${skipped.length}`);
if (failed.length) {
  console.log('\nCOLLECTED FAILURES:');
  for (const item of failed) console.log(`- ${item}`);
  process.exitCode = 1;
} else if (skipped.length) process.exitCode = 1;
else
  console.log(
    '\nPRODUCTION SOURCE SANITATION & RELEASE PACKAGING ACCEPTANCE PASSED',
  );
