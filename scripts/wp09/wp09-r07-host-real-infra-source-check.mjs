import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const checks = [
  ['real-browser-start-script-present', read('scripts/start-local-full-real.mjs').includes("process.env.INFRASTRUCTURE_MODE = 'real'")],
  ['real-browser-start-disables-sync', read('scripts/start-local-full-real.mjs').includes("process.env.DATABASE_SYNCHRONIZE = 'false'")],
  ['real-browser-start-no-pgmem-fallback', read('scripts/start-local-full-real.mjs').includes('pg-mem fallback is disabled')],
  ['package-exposes-start-full-real', read('package.json').includes('"start:full:real": "npm run build && node scripts/start-local-full-real.mjs"')],
  ['host-upload-verifies-owner-exists', read('src/modules/hosts/host-verification-asset.service.ts').includes('manager.getRepository(User).exists')],
  ['host-upload-stale-principal-is-unauthorized', read('src/modules/hosts/host-verification-asset.service.ts').includes('Authenticated account no longer exists in the active database. Please sign in again.')],
];
let failed=0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`WP09 R07 Host real-infrastructure source check passed: ${checks.length}/${checks.length}`);
