import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = process.env.npm_execpath;
if (!npmCli)
  throw new Error('Run this verifier through npm run ui:white-label:check.');

const totalStages = 9;
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
  'white-label-smoke-staging',
]);
const sha256File = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');

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
  ['jest', 'prettier', 'eslint', 'nest', 'vite'].every(
    (name) =>
      existsSync(join(root, 'node_modules', '.bin', name)) ||
      existsSync(join(root, 'node_modules', '.bin', `${name}.cmd`)),
  );

console.log('============================================================');
console.log('VoiceCloud Consolidated UI & White-label Acceptance');
console.log('============================================================');
console.log(`Repository root: ${root}`);
console.log(
  'This verifier may create ignored build/release/staging output but must not repair or mutate tracked source.',
);

run(1, 'Consolidated source and accepted-parent boundary', process.execPath, [
  'scripts/production/consolidated-ui-white-label-source-check.mjs',
]);

let ready = true;
if (depsReady()) {
  console.log(
    '\n[2/9] Locked dependency availability\nPASS existing node_modules is complete; npm ci is not repeated.',
  );
  passed.push('[2/9] Locked dependency availability');
} else {
  ready = runNpm(2, 'Locked npm dependency installation', [
    'ci',
    '--include=dev',
  ]);
}

if (ready) {
  runNpm(3, 'Consolidated package-owned Prettier check', [
    'run',
    'format:check:consolidated-ui-white-label',
  ]);
  runNpm(4, 'Consolidated presentation ESLint gate', [
    'run',
    'lint:consolidated-ui-white-label',
  ]);
  run(5, 'Production release source contract', process.execPath, [
    'scripts/production/production-release-source-check.mjs',
  ]);
  runNpm(6, 'Synthetic white-label propagation across all web surfaces', [
    'run',
    'ui:white-label:propagation-check',
  ]);
  runNpm(7, 'Production release packaging regression acceptance', [
    'run',
    'release:production:check',
  ]);
  run(8, 'Final consolidated source contract re-check', process.execPath, [
    'scripts/production/consolidated-ui-white-label-source-check.mjs',
  ]);
} else {
  for (const [number, label] of [
    [3, 'Consolidated package-owned Prettier check'],
    [4, 'Consolidated presentation ESLint gate'],
    [5, 'Production release source contract'],
    [6, 'Synthetic white-label propagation across all web surfaces'],
    [7, 'Production release packaging regression acceptance'],
    [8, 'Final consolidated source contract re-check'],
  ])
    skip(number, label, 'dependencies unavailable');
}

const final = snapshot();
const changed = [];
for (const file of new Set([...initial.keys(), ...final.keys()])) {
  if (initial.get(file) !== final.get(file)) changed.push(file);
}
console.log('\n[9/9] Source immutability verification');
if (changed.length) {
  failed.push(
    `[9/9] Source immutability verification: ${changed.sort().join(', ')}`,
  );
} else {
  console.log(
    `PASS ${final.size} source/configuration files remained unchanged.`,
  );
  passed.push('[9/9] Source immutability verification');
}

console.log('\n============================================================');
console.log('CONSOLIDATED UI & WHITE-LABEL SUMMARY');
console.log('============================================================');
console.log(`Passed stages: ${passed.length}`);
console.log(`Failed stages: ${failed.length}`);
console.log(`Skipped stages: ${skipped.length}`);
if (failed.length) {
  console.log('\nCOLLECTED FAILURES:');
  for (const item of failed) console.log(`- ${item}`);
  process.exitCode = 1;
} else if (skipped.length) {
  process.exitCode = 1;
} else {
  console.log('\nCONSOLIDATED UI & WHITE-LABEL ACCEPTANCE PASSED');
}
