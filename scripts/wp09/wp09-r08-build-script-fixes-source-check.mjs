import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const checks = [
  ['typeorm-repository-uses-exists-api', read('src/modules/hosts/host-verification-asset.service.ts').includes('manager.getRepository(User).exists({')],
  ['typeorm-obsolete-exist-api-absent', !read('src/modules/hosts/host-verification-asset.service.ts').includes('manager.getRepository(User).exist({')],
  ['r07-source-check-script-registered', read('package.json').includes('"wp09:r07:source-check": "node scripts/wp09/wp09-r07-host-real-infra-source-check.mjs"')],
  ['r08-source-check-script-registered', read('package.json').includes('"wp09:r08:source-check": "node scripts/wp09/wp09-r08-build-script-fixes-source-check.mjs"')],
  ['r07-contract-expects-supported-exists-api', read('scripts/wp09/wp09-r07-host-real-infra-source-check.mjs').includes('manager.getRepository(User).exists')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`WP09 R08 build/script fixes source check passed: ${checks.length}/${checks.length}`);
