import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this verifier through npm run admin:ui-redesign:check.');

const totalStages = 10;
const passed = [];
const failed = [];
const skipped = [];
const excludedDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', '.cache', 'uploads', 'private-uploads']);

const shouldHash = (file) => {
  const name = file.replaceAll('\\', '/').split('/').at(-1) || '';
  return name !== '.env' && !name.endsWith('.log') && !name.endsWith('.tsbuildinfo') && !name.endsWith('.zip');
};

const snapshot = () => {
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
      const rel = relative(root, absolute).replaceAll('\\', '/');
      if (!shouldHash(rel)) continue;
      hashes.set(rel, createHash('sha256').update(readFileSync(absolute)).digest('hex'));
    }
  };
  walk(root);
  return hashes;
};

const initial = snapshot();

const run = (number, label, command, args) => {
  const stage = `[${number}/${totalStages}] ${label}`;
  console.log(`\n${stage}`);
  const result = spawnSync(command, args, { cwd: root, env: process.env, stdio: 'inherit', shell: false });
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

const runNpm = (number, label, args) => run(number, label, process.execPath, [npmCli, ...args]);
const skip = (number, label, reason) => {
  const stage = `[${number}/${totalStages}] ${label}`;
  console.log(`\n${stage}\nSKIP ${reason}`);
  skipped.push(stage);
};
const depsReady = () =>
  existsSync(join(root, 'node_modules', '.package-lock.json')) &&
  ['jest', 'prettier', 'eslint', 'nest', 'vite'].every(
    (name) => existsSync(join(root, 'node_modules', '.bin', name)) || existsSync(join(root, 'node_modules', '.bin', `${name}.cmd`)),
  );

console.log('============================================================');
console.log('VoiceCloud Admin Modern Cloud / Ocean Blue Acceptance');
console.log('============================================================');
console.log(`Repository root: ${root}`);
console.log('This verifier is non-mutating and must not repair source.');

run(1, 'Admin UI source and functional-boundary contract', process.execPath, ['scripts/production/admin-ui-redesign-source-check.mjs']);

let ready = true;
if (depsReady()) {
  console.log('\n[2/10] Locked dependency availability\nPASS existing node_modules is complete; npm ci is not repeated.');
  passed.push('[2/10] Locked dependency availability');
} else {
  ready = runNpm(2, 'Locked npm dependency installation', ['ci', '--include=dev']);
}

if (ready) {
  runNpm(3, 'Admin redesign Prettier check', ['run', 'format:check:admin-ui']);
  runNpm(4, 'Frozen foundation semantic ESLint gate', ['run', 'lint:admin-ui-foundation']);
  runNpm(5, 'Admin, Creator and Website TypeScript typecheck', ['run', 'typecheck:ui-foundation']);
  runNpm(6, 'White-label and UI-surface preservation tests', ['run', 'test:ui-foundation']);
  runNpm(7, 'Complete Jest regression suite', ['test', '--', '--runInBand', '--config', 'jest.config.js']);
  const built = runNpm(8, 'Unified Backend, Website, Admin and Creator build', ['run', 'build']);
  if (built) runNpm(9, 'Compiled Landing/Admin/Creator/API runtime smoke', ['run', 'wp08:03:01:frontend-smoke']);
  else skip(9, 'Compiled Landing/Admin/Creator/API runtime smoke', 'unified build failed');
} else {
  for (const [number, label] of [
    [3, 'Admin redesign Prettier check'],
    [4, 'Existing production foundation ESLint gate'],
    [5, 'Admin, Creator and Website TypeScript typecheck'],
    [6, 'White-label and UI-surface preservation tests'],
    [7, 'Complete Jest regression suite'],
    [8, 'Unified Backend, Website, Admin and Creator build'],
    [9, 'Compiled Landing/Admin/Creator/API runtime smoke'],
  ]) skip(number, label, 'dependencies unavailable');
}

const final = snapshot();
const changed = [];
for (const file of new Set([...initial.keys(), ...final.keys()])) {
  if (initial.get(file) !== final.get(file)) changed.push(file);
}
console.log('\n[10/10] Source immutability verification');
if (changed.length) failed.push(`[10/10] Source immutability verification: ${changed.sort().join(', ')}`);
else {
  console.log(`PASS ${final.size} source/configuration files remained unchanged.`);
  passed.push('[10/10] Source immutability verification');
}

console.log('\n============================================================');
console.log('ADMIN MODERN CLOUD / OCEAN BLUE SUMMARY');
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
  console.log('\nADMIN MODERN CLOUD / OCEAN BLUE ACCEPTANCE PASSED');
}
