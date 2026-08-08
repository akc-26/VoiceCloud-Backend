import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is unavailable. Run through npm run wp08:03:04:check.');

const totalStages = 19;
const passed = [];
const failed = [];
const skipped = [];
const excludedDirectories = new Set([
  '.git', 'node_modules', 'dist', 'coverage', '.cache', 'uploads', 'private-uploads',
]);

function shouldHash(path) {
  const normalized = path.replaceAll('\\', '/');
  const basename = normalized.split('/').at(-1) || '';
  if (basename === '.env' || basename.endsWith('.log')) return false;
  if (basename.endsWith('.tsbuildinfo') || basename.endsWith('.zip')) return false;
  return true;
}
function sourceSnapshot() {
  const hashes = new Map();
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      if (excludedDirectories.has(name)) continue;
      const absolute = join(directory, name);
      const info = statSync(absolute);
      if (info.isDirectory()) { walk(absolute); continue; }
      const path = relative(root, absolute).replaceAll('\\', '/');
      if (!shouldHash(path)) continue;
      hashes.set(path, createHash('sha256').update(readFileSync(absolute)).digest('hex'));
    }
  };
  walk(root);
  return hashes;
}
const initialSnapshot = sourceSnapshot();

function run(number, label, command, args) {
  const stage = `[${number}/${totalStages}] ${label}`;
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
  failed.push(`${stage} (exit code ${result.status ?? 'unknown'}): ${command} ${args.join(' ')}`);
  return false;
}
const runNpm = (number, label, args) => run(number, label, process.execPath, [npmCli, ...args]);
function passWithoutCommand(number, label, message) {
  const stage = `[${number}/${totalStages}] ${label}`;
  console.log(`\n${stage}`);
  console.log(message);
  passed.push(stage);
}
function skip(number, label, reason) {
  const stage = `[${number}/${totalStages}] ${label} (${reason})`;
  console.log(`\n${stage}`);
  skipped.push(stage);
}
function binaryExists(name) {
  const binRoot = join(root, 'node_modules', '.bin');
  return existsSync(join(binRoot, name)) || existsSync(join(binRoot, `${name}.cmd`));
}
function dependenciesReady() {
  return existsSync(join(root, 'node_modules', '.package-lock.json')) &&
    ['jest', 'prettier', 'eslint', 'nest', 'vite', 'typeorm'].every(binaryExists);
}
function verifyArtifacts() {
  const stage = '[16/19] Required build artifact verification';
  console.log(`\n${stage}`);
  const required = ['dist/src/main.js', 'dist/website/index.html', 'dist/admin/index.html', 'dist/creator/index.html', 'dist/src/database/typeorm-cli.data-source.js'];
  const missing = required.filter((path) => !existsSync(join(root, path)));
  if (missing.length) {
    failed.push(`${stage}: missing ${missing.join(', ')}`);
    return false;
  }
  for (const path of required) console.log(`PASS ${path}`);
  passed.push(stage);
  return true;
}
function verifyImmutability() {
  const stage = '[19/19] Source immutability verification';
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
}

console.log('============================================================');
console.log('VoiceCloud WP08-03-04 - Consolidated UI + Real Infrastructure');
console.log('============================================================');
console.log(`Repository root: ${root}`);
console.log('Final acceptance verifies the prepared source; it does not repair it.');

run(1, 'Baseline/source self-check', process.execPath, ['scripts/wp08/wp08-03-04-self-check.mjs']);
let installPassed = true;
if (dependenciesReady()) {
  passWithoutCommand(2, 'Locked dependency availability', 'PASS existing node_modules is complete; npm ci is not repeated.');
} else {
  console.log('\n[2/19] node_modules is absent/incomplete; installing locked dependencies...');
  installPassed = runNpm(2, 'Locked npm dependency installation', ['ci', '--include=dev']);
}

let buildPassed = false;
let artifactsPassed = false;
if (installPassed) {
  runNpm(3, 'Package-owned Prettier check', ['run', 'format:check:wp08:03:04']);
  runNpm(4, 'Backend package-owned ESLint check', ['run', 'lint:wp08:03:04']);
  runNpm(5, 'Admin visibility/backend integration tests', ['run', 'test:wp08:03:04']);
  runNpm(6, 'WP08-03-03 authority/recovery regressions', ['run', 'test:wp08:03:03']);
  runNpm(7, 'WP08-03-02D Host/Admin economy regressions', ['run', 'test:wp08:03:02d']);
  runNpm(8, 'WP08-03-02C Creator payout regressions', ['run', 'test:wp08:03:02c']);
  runNpm(9, 'WP08-03-02B gift settlement regressions', ['run', 'test:wp08:03:02b']);
  runNpm(10, 'WP08-03-02A financial authority regressions', ['run', 'test:wp08:03:02a']);
  runNpm(11, 'WP08-01 focused regressions', ['run', 'test:wp08:01']);
  runNpm(12, 'WP08-02 focused regressions', ['run', 'test:wp08:02']);
  runNpm(13, 'WP08-03-01 routing/hosting regressions', ['run', 'test:wp08:03:01']);
  runNpm(14, 'Complete Jest suite', ['test', '--', '--runInBand', '--config', 'jest.config.js']);
  buildPassed = runNpm(15, 'Unified Backend, Website, Admin and Creator build', ['run', 'build']);
  if (buildPassed) artifactsPassed = verifyArtifacts();
  else skip(16, 'Required build artifact verification', 'unified build failed');
  if (buildPassed && artifactsPassed) {
    runNpm(17, 'Compiled Landing/Admin/Creator/API runtime smoke', ['run', 'wp08:03:01:frontend-smoke']);
    if (process.platform === 'win32') {
      run(18, 'Isolated PostgreSQL/Redis/BullMQ/Socket.IO acceptance', 'powershell.exe', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/wp08/wp08-03-04-real-check.ps1',
      ]);
    } else {
      skip(18, 'Isolated PostgreSQL/Redis/BullMQ/Socket.IO acceptance', 'Windows acceptance runner required');
    }
  } else {
    skip(17, 'Compiled Landing/Admin/Creator/API runtime smoke', 'valid build unavailable');
    skip(18, 'Isolated PostgreSQL/Redis/BullMQ/Socket.IO acceptance', 'valid build unavailable');
  }
} else {
  for (const [number, label] of [
    [3, 'Package-owned Prettier check'], [4, 'Backend package-owned ESLint check'],
    [5, 'Admin visibility/backend integration tests'], [6, 'WP08-03-03 authority/recovery regressions'],
    [7, 'WP08-03-02D Host/Admin economy regressions'], [8, 'WP08-03-02C Creator payout regressions'],
    [9, 'WP08-03-02B gift settlement regressions'], [10, 'WP08-03-02A financial authority regressions'],
    [11, 'WP08-01 focused regressions'], [12, 'WP08-02 focused regressions'],
    [13, 'WP08-03-01 routing/hosting regressions'], [14, 'Complete Jest suite'],
    [15, 'Unified Backend, Website, Admin and Creator build'], [16, 'Required build artifact verification'],
    [17, 'Compiled Landing/Admin/Creator/API runtime smoke'], [18, 'Isolated PostgreSQL/Redis/BullMQ/Socket.IO acceptance'],
  ]) skip(number, label, 'dependencies unavailable');
}
verifyImmutability();

console.log('\n============================================================');
console.log('WP08-03-04 CONSOLIDATED VERIFICATION SUMMARY');
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
console.log('\nWP08-03-04 FULL NON-MUTATING ACCEPTANCE PASSED');
