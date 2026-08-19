import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.env.WP09_CERTIFICATION_MODE = '1';
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is unavailable. Run through npm run wp09:check.');

const totalStages = 10;
const passed = [];
const failed = [];
const skipped = [];
const excludedDirectories = new Set([
  '.git', 'node_modules', 'dist', 'coverage', '.cache', '.release', 'uploads',
  'private_uploads', 'release-smoke-staging', 'white-label-smoke-staging',
]);

function shouldHash(path) {
  const normalized = path.replaceAll('\\', '/');
  const basename = normalized.split('/').at(-1) || '';
  if (basename === '.env' || basename.endsWith('.log')) return false;
  if (basename.endsWith('.tsbuildinfo') || basename.endsWith('.zip')) return false;
  if (/^\.wp0[89]-/.test(basename)) return false;
  return true;
}
function sourceSnapshot() {
  const hashes = new Map();
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      if (excludedDirectories.has(name)) continue;
      const absolute = join(directory, name);
      const info = statSync(absolute);
      if (info.isDirectory()) walk(absolute);
      else {
        const path = relative(root, absolute).replaceAll('\\', '/');
        if (shouldHash(path)) hashes.set(path, createHash('sha256').update(readFileSync(absolute)).digest('hex'));
      }
    }
  };
  walk(root);
  return hashes;
}
const initialSnapshot = sourceSnapshot();

function run(number, label, command, args) {
  const stage = `[${number}/${totalStages}] ${label}`;
  console.log(`\n${stage}`);
  const result = spawnSync(command, args, { cwd: root, env: process.env, stdio: 'inherit', shell: false });
  if (result.error) {
    failed.push(`${stage} (execution error): ${result.error.message}`);
    return false;
  }
  if (result.status === 0) {
    passed.push(stage);
    return true;
  }
  failed.push(`${stage} (exit code ${result.status ?? 'unknown'})`);
  return false;
}
const runNpm = (number, label, args) => run(number, label, process.execPath, [npmCli, ...args]);
function pass(number, label, message) {
  const stage = `[${number}/${totalStages}] ${label}`;
  console.log(`\n${stage}\n${message}`);
  passed.push(stage);
}
function skip(number, label, reason) {
  const stage = `[${number}/${totalStages}] ${label}`;
  console.log(`\n${stage}\nSKIP ${reason}`);
  skipped.push(`${stage}: ${reason}`);
}
function binaryExists(name) {
  const bin = join(root, 'node_modules', '.bin');
  return existsSync(join(bin, name)) || existsSync(join(bin, `${name}.cmd`));
}
function dependenciesReady() {
  return existsSync(join(root, 'node_modules', '.package-lock.json')) &&
    ['jest', 'prettier', 'eslint', 'nest', 'vite', 'typeorm'].every(binaryExists);
}
function verifyArtifacts() {
  const required = [
    'dist/src/main.js', 'dist/website/index.html', 'dist/admin/index.html',
    'dist/creator/index.html', 'dist/src/database/typeorm-cli.data-source.js',
  ];
  const missing = required.filter((p) => !existsSync(join(root, p)));
  if (missing.length) return { ok: false, message: `missing ${missing.join(', ')}` };
  return { ok: true, message: `PASS ${required.length} required compiled artifacts` };
}
function verifyImmutability() {
  const finalSnapshot = sourceSnapshot();
  const changed = [];
  const all = new Set([...initialSnapshot.keys(), ...finalSnapshot.keys()]);
  for (const path of [...all].sort()) if (initialSnapshot.get(path) !== finalSnapshot.get(path)) changed.push(path);
  return { ok: changed.length === 0, changed, count: finalSnapshot.size };
}

console.log('============================================================');
console.log('VoiceCloud WP09 A-H Consolidated Production Certification');
console.log('Baseline: f0008ee610a877f310265149e3f5794a704d1fb7');
console.log('Acceptance is non-mutating and collects independent failures.');
console.log('============================================================');
console.log('A Build/Test | B DB/Rollback | C Security | D Backup/Recovery');
console.log('E Realtime/Load | F Production Runtime | G Compatibility | H Reconciliation');

runNpm(1, 'A/C/G/H source and protected-baseline contracts', ['run', 'wp09:source-check']);

let depsReady = dependenciesReady();
if (depsReady) pass(2, 'A locked dependency availability', 'PASS existing locked node_modules is complete.');
else {
  const installed = runNpm(2, 'A locked dependency installation', ['ci', '--include=dev']);
  depsReady = installed && dependenciesReady();
  if (installed && !depsReady) failed.push('[2/10] dependency install returned success but required binaries remain unavailable');
}

let wp08Passed = false;
let buildReady = false;
if (depsReady) {
  runNpm(3, 'A/C WP09 semantic lint and script quality', ['run', 'wp09:quality-check']);
  wp08Passed = runNpm(4, 'A/B/E/G accepted WP08 regressions, full Jest, unified build and compiled smoke', ['run', 'wp09:regression-check']);
  const artifacts = verifyArtifacts();
  if (artifacts.ok) { pass(5, 'A/F compiled artifact verification', artifacts.message); buildReady = true; }
  else { failed.push(`[5/10] A/F compiled artifact verification: ${artifacts.message}`); console.log(`\n[5/10] A/F compiled artifact verification\nFAIL ${artifacts.message}`); }
  if (buildReady) runNpm(6, 'F/H production source/runtime packaging acceptance', ['run', 'release:production:check']);
  else skip(6, 'F/H production source/runtime packaging acceptance', 'valid build unavailable');
  if (buildReady) runNpm(7, 'G/H consolidated UI and white-label acceptance', ['run', 'ui:white-label:check']);
  else skip(7, 'G/H consolidated UI and white-label acceptance', 'valid build unavailable');
  if (buildReady && process.platform === 'win32') {
    runNpm(8, 'B/C/D/E/F strict isolated production DB/rollback/security/backup/realtime/load acceptance', ['run', 'wp09:real-check']);
  } else if (!buildReady) skip(8, 'B/C/D/E/F strict isolated production DB/rollback/security/backup/realtime/load acceptance', 'valid build unavailable');
  else skip(8, 'B/C/D/E/F strict isolated production DB/rollback/security/backup/realtime/load acceptance', 'Windows isolated production runner required');
} else {
  for (const [n, label] of [
    [3, 'A/C WP09 semantic lint and script quality'],
    [4, 'A/B/E/G accepted WP08 regressions, full Jest, unified build and compiled smoke'],
    [5, 'A/F compiled artifact verification'],
    [6, 'F/H production source/runtime packaging acceptance'],
    [7, 'G/H consolidated UI and white-label acceptance'],
    [8, 'B/C/D/E/F strict isolated production DB/rollback/security/backup/realtime/load acceptance'],
  ]) skip(n, label, 'dependencies unavailable');
}

runNpm(9, 'H final protected-source reconciliation', ['run', 'wp09:source-check']);
const immutable = verifyImmutability();
if (immutable.ok) pass(10, 'H source immutability verification', `PASS ${immutable.count} source/configuration files remained unchanged.`);
else {
  const stage = '[10/10] H source immutability verification';
  console.log(`\n${stage}\nFAIL ${immutable.changed.join(', ')}`);
  failed.push(`${stage}: acceptance mutated source: ${immutable.changed.join(', ')}`);
}

console.log('\n============================================================');
console.log('WP09 A-H CONSOLIDATED SUMMARY');
console.log('============================================================');
console.log(`Passed stages: ${passed.length}`);
console.log(`Failed stages: ${failed.length}`);
console.log(`Skipped stages: ${skipped.length}`);
if (failed.length) { console.log('\nCOLLECTED FAILURES:'); for (const item of failed) console.log(`- ${item}`); }
if (skipped.length) { console.log('\nSKIPPED STAGES:'); for (const item of skipped) console.log(`- ${item}`); }
if (failed.length || skipped.length) process.exit(1);
console.log('\nWP09 A-H FULL PRODUCTION CERTIFICATION PASSED');
