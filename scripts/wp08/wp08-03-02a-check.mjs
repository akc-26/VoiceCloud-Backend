import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error(
    'npm_execpath is unavailable. Run this verifier through npm run wp08:03:02a:check.',
  );
}
const passed = [];
const failed = [];
const skipped = [];

const excludedDirectories = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.cache',
  'uploads',
  'private-uploads',
]);

const shouldHash = (path) => {
  const normalized = path.replaceAll('\\', '/');
  const basename = normalized.split('/').at(-1) || '';
  if (basename === '.env' || basename.endsWith('.log')) return false;
  if (basename.endsWith('.tsbuildinfo') || basename.endsWith('.zip')) return false;
  return true;
};

const sourceSnapshot = () => {
  const hashes = new Map();
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      if (excludedDirectories.has(name)) continue;
      const absolute = join(directory, name);
      const info = statSync(absolute);
      if (info.isDirectory()) {
        walk(absolute);
        continue;
      }
      const relativePath = relative(root, absolute).replaceAll('\\', '/');
      if (!shouldHash(relativePath)) continue;
      hashes.set(
        relativePath,
        createHash('sha256').update(readFileSync(absolute)).digest('hex'),
      );
    }
  };
  walk(root);
  return hashes;
};

const initialSnapshot = sourceSnapshot();

const run = (number, label, command, args) => {
  const stage = `[${number}/14] ${label}`;
  console.log(`\n${stage}`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    failed.push(`${stage} (execution error): ${result.error.message}`);
    return false;
  }
  if (result.status === 0) {
    passed.push(stage);
    return true;
  }
  failed.push(
    `${stage} (exit code ${result.status ?? 'unknown'}): ${command} ${args.join(' ')}`,
  );
  return false;
};

const runNpm = (number, label, args) =>
  run(number, label, process.execPath, [npmCli, ...args]);

const skip = (number, label, reason) => {
  const stage = `[${number}/14] ${label} (${reason})`;
  console.log(`\n${stage}`);
  skipped.push(stage);
};

const verifyArtifacts = () => {
  const stage = '[12/14] Required build artifact verification';
  console.log(`\n${stage}`);
  const required = [
    'dist/src/main.js',
    'dist/website/index.html',
    'dist/admin/index.html',
    'dist/creator/index.html',
  ];
  const missing = required.filter((path) => !existsSync(join(root, path)));
  if (missing.length) {
    failed.push(`${stage}: missing ${missing.join(', ')}`);
    return false;
  }
  for (const path of required) console.log(`PASS ${path}`);
  passed.push(stage);
  return true;
};

const verifyImmutability = () => {
  const stage = '[14/14] Source immutability verification';
  console.log(`\n${stage}`);
  const finalSnapshot = sourceSnapshot();
  const changed = [];
  const allPaths = new Set([...initialSnapshot.keys(), ...finalSnapshot.keys()]);
  for (const path of [...allPaths].sort()) {
    if (initialSnapshot.get(path) !== finalSnapshot.get(path)) changed.push(path);
  }
  if (changed.length) {
    failed.push(`${stage}: acceptance changed source files: ${changed.join(', ')}`);
    return false;
  }
  console.log(`PASS ${finalSnapshot.size} source/configuration files remained unchanged.`);
  passed.push(stage);
  return true;
};

console.log('============================================================');
console.log('VoiceCloud WP08-03-02A - Financial Authority Acceptance');
console.log('============================================================');
console.log(`Repository root: ${root}`);
console.log('Final acceptance is non-mutating. Run wp08:03:02a:prepare before this command.');

run(1, 'Baseline/source self-check', process.execPath, [
  'scripts/wp08/wp08-03-02a-self-check.mjs',
]);

console.log('\n[2/14] Installing locked dependencies including development tooling...');
const installPassed = runNpm(2, 'Locked npm dependency installation', [
  'ci',
  '--include=dev',
]);

let buildPassed = false;
let artifactsPassed = false;
if (installPassed) {
  runNpm(3, 'Package-owned Prettier check', [
    'run',
    'format:check:wp08:03:02a',
  ]);
  runNpm(4, 'Package-owned ESLint check', ['run', 'lint:wp08:03:02a']);
  runNpm(5, 'WP08-03-02A authority and migration tests', [
    'run',
    'test:wp08:03:02a',
  ]);
  runNpm(6, 'Existing wallet regressions', [
    'test',
    '--',
    '--runInBand',
    '--runTestsByPath',
    'src/modules/wallet/wallet-business.spec.ts',
    'src/modules/wallet/wallet.spec.ts',
  ]);
  runNpm(7, 'WP08-01 focused regressions', ['run', 'test:wp08:01']);
  runNpm(8, 'WP08-02 focused regressions', ['run', 'test:wp08:02']);
  runNpm(9, 'WP08-03-01 regressions', ['run', 'test:wp08:03:01']);
  runNpm(10, 'Complete Jest suite', [
    'test',
    '--',
    '--runInBand',
    '--config',
    'jest.config.js',
  ]);
  buildPassed = runNpm(11, 'Unified Backend, Website, Admin and Creator build', [
    'run',
    'build',
  ]);
  if (buildPassed) artifactsPassed = verifyArtifacts();
  else skip(12, 'Required build artifact verification', 'unified build failed');

  if (buildPassed && artifactsPassed) {
    runNpm(13, 'Compiled Landing/Admin/Creator/API runtime smoke', [
      'run',
      'wp08:03:01:frontend-smoke',
    ]);
  } else {
    skip(13, 'Compiled Landing/Admin/Creator/API runtime smoke', 'valid build unavailable');
  }
} else {
  for (const [number, label] of [
    [3, 'Package-owned Prettier check'],
    [4, 'Package-owned ESLint check'],
    [5, 'WP08-03-02A authority and migration tests'],
    [6, 'Existing wallet regressions'],
    [7, 'WP08-01 focused regressions'],
    [8, 'WP08-02 focused regressions'],
    [9, 'WP08-03-01 regressions'],
    [10, 'Complete Jest suite'],
    [11, 'Unified Backend, Website, Admin and Creator build'],
    [12, 'Required build artifact verification'],
    [13, 'Compiled Landing/Admin/Creator/API runtime smoke'],
  ]) {
    skip(number, label, 'dependencies unavailable');
  }
}

verifyImmutability();

console.log('\n============================================================');
console.log('WP08-03-02A CONSOLIDATED VERIFICATION SUMMARY');
console.log('============================================================');
console.log(`Passed stages: ${passed.length}`);
console.log(`Failed stages: ${failed.length}`);
console.log(`Skipped stages: ${skipped.length}`);
if (failed.length) {
  console.log('\nCOLLECTED FAILURES:');
  for (const item of failed) console.log(`- ${item}`);
}
if (skipped.length) {
  console.log('\nSKIPPED STAGES:');
  for (const item of skipped) console.log(`- ${item}`);
}

if (failed.length || skipped.length) process.exit(1);
console.log('\nWP08-03-02A FULL NON-MUTATING ACCEPTANCE PASSED');
