import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run through npm run wp09:regression-check.');

const excluded = new Set(['.git', 'node_modules', 'dist', 'coverage', '.cache', '.release', 'uploads', 'private_uploads']);
const snapshot = () => {
  const hashes = new Map();
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      if (excluded.has(name)) continue;
      const absolute = join(directory, name);
      const info = statSync(absolute);
      if (info.isDirectory()) walk(absolute);
      else {
        const rel = relative(root, absolute).replaceAll('\\', '/');
        if (rel === '.env' || rel.endsWith('.log') || rel.endsWith('.tsbuildinfo') || rel.endsWith('.zip')) continue;
        hashes.set(rel, createHash('sha256').update(readFileSync(absolute)).digest('hex'));
      }
    }
  };
  walk(root);
  return hashes;
};

const initial = snapshot();
const failures = [];
const commands = [
  ['WP08-03-04 focused integration', ['run', 'test:wp08:03:04']],
  ['WP08-03-03 authority/recovery', ['run', 'test:wp08:03:03']],
  ['WP08-03-02D host/admin economy', ['run', 'test:wp08:03:02d']],
  ['WP08-03-02C creator payout', ['run', 'test:wp08:03:02c']],
  ['WP08-03-02B gift settlement', ['run', 'test:wp08:03:02b']],
  ['WP08-03-02A wallet authority', ['run', 'test:wp08:03:02a']],
  ['WP08-01 focused regressions', ['run', 'test:wp08:01']],
  ['WP08-02 focused regressions', ['run', 'test:wp08:02']],
  ['WP08-03-01 routing/hosting', ['run', 'test:wp08:03:01']],
  ['Complete Jest suite', ['test', '--', '--runInBand', '--config', 'jest.config.js']],
  ['Unified Backend/Website/Admin/Creator build', ['run', 'build']],
  ['Compiled browser/API smoke', ['run', 'wp08:03:01:frontend-smoke']],
];

for (const [label, args] of commands) {
  console.log(`\n[WP09 REGRESSION] ${label}`);
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: root, env: process.env, stdio: 'inherit' });
  if (result.status !== 0) failures.push(`${label} (exit ${result.status ?? 'unknown'})`);
}

const final = snapshot();
const changed = [];
for (const path of new Set([...initial.keys(), ...final.keys()])) {
  if (initial.get(path) !== final.get(path)) changed.push(path);
}
if (changed.length) failures.push(`source immutability: ${changed.sort().join(', ')}`);

if (failures.length) {
  console.log('\nWP09 accepted regression/build failures:');
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}
console.log('\nWP09 accepted WP08 regressions, full Jest, unified build and compiled smoke PASSED.');
