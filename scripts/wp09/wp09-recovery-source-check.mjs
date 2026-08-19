import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const checks = [];
const pass = (name, fn) => { fn(); checks.push(name); console.log(`PASS ${name}`); };

const roleContract = (file) => {
  const s = read(file);
  assert(s.includes('RolesGuard'), `${file}: RolesGuard missing`);
  assert(s.includes('UserRole.ADMIN') && s.includes('UserRole.SUPER_ADMIN'), `${file}: admin roles missing`);
};

pass('admin-controller-rbac', () => roleContract('src/modules/admin/admin.controller.ts'));
pass('backup-controller-rbac', () => roleContract('src/modules/backup/backup.controller.ts'));
pass('admin-referral-rbac', () => roleContract('src/modules/referral/controllers/admin-referral.controller.ts'));
pass('admin-store-rbac', () => roleContract('src/modules/store/controllers/admin-store.controller.ts'));
pass('ranking-admin-rbac', () => {
  const s = read('src/modules/rankings/rankings.controller.ts');
  roleContract('src/modules/rankings/rankings.controller.ts');
  for (const summary of ['Refresh all ranking Redis caches','Get Redis cache status for rankings','Trigger historical ranking snapshot creation']) {
    const i=s.indexOf(summary); assert(i>=0, `ranking operation missing: ${summary}`);
    const pre=s.slice(Math.max(0,i-500),i);
    assert(!/@Public\(\)/.test(pre.slice(pre.lastIndexOf('@Post'), i)) && !/@Public\(\)/.test(pre.slice(pre.lastIndexOf('@Get'), i)), `${summary}: remains public`);
    assert(pre.includes('@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)'), `${summary}: roles missing`);
  }
});
pass('rtc-admin-monitoring-rbac', () => {
  const s=read('src/modules/rtc/rtc.controller.ts'); const i=s.indexOf("@Get('admin/monitoring')");
  assert(i>=0, 'RTC admin monitoring route missing');
  const section=s.slice(i,i+500); assert(section.includes('@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)'), 'RTC monitoring roles missing');
});
pass('credentialed-cors-production-allowlist', () => {
  const s=read('src/main.ts');
  assert(!s.includes("origin: '*'"), 'credentialed wildcard CORS remains');
  assert(s.includes('CORS_ALLOWED_ORIGINS'), 'CORS allow-list not wired');
});
pass('production-http-security-headers', () => {
  const main=read('src/main.ts');
  const hardening=read('src/common/http/production-http-hardening.ts');
  assert(main.includes('registerProductionSecurityHeaders'), 'production security headers are not registered');
  for (const header of ['Content-Security-Policy','Strict-Transport-Security','X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy']) {
    assert(hardening.includes(header), `missing production security header: ${header}`);
  }
  assert(hardening.includes("disable('x-powered-by')"), 'x-powered-by suppression missing');
});
pass('redis-api-auth-rate-limiting', () => {
  const main=read('src/main.ts');
  const hardening=read('src/common/http/production-http-hardening.ts');
  assert(main.includes('registerApiRateLimiting'), 'API rate limiter is not registered');
  assert(hardening.includes('redis.incr(key)'), 'Redis rate limit authority missing');
  assert(hardening.includes("status(429)"), '429 abuse response missing');
  assert(hardening.includes("scope = sensitive ? 'auth' : 'api'"), 'auth-specific throttle missing');
});
pass('production-secret-separation', () => {
  const s=read('src/config/env-validator.ts');
  assert(s.includes("name: 'ENCRYPTION_KEY'"), 'ENCRYPTION_KEY not required');
  assert(s.includes("name: 'CORS_ALLOWED_ORIGINS'"), 'CORS_ALLOWED_ORIGINS not required');
  assert(s.includes('process.env.ENCRYPTION_KEY === process.env.JWT_SECRET'), 'secret separation check missing');
});
pass('migration-count-and-down-contract', () => {
  const dir=path.join(root,'src/database/migrations');
  const files=fs.readdirSync(dir).filter(f=>/^\d+.*\.ts$/.test(f)).sort();
  assert(files.length===14, `expected 14 accepted migrations; found ${files.length}`);
  for(const f of files){ const s=fs.readFileSync(path.join(dir,f),'utf8'); assert(/\basync\s+up\s*\(/.test(s),`${f}: up missing`); assert(/\basync\s+down\s*\(/.test(s),`${f}: down missing`); }
});
pass('database-synchronize-production-protection', () => {
  const s=read('src/config/env-validator.ts'); assert(s.includes("DATABASE_SYNCHRONIZE === 'true'"),'production synchronize guard missing');
});
pass('android-api-compatibility-contract', () => {
  const main=read('src/main.ts'); assert(main.includes("app.setGlobalPrefix('api/v1'"),'api/v1 prefix missing');
  const auth=read('src/modules/auth/auth.controller.ts'); assert(auth.includes("@Post('login')"),'login endpoint missing'); assert(auth.includes("@Post('refresh')") || auth.includes("refresh"),'refresh auth contract missing');
});
pass('realtime-namespace-contract', () => {
  const files=['src/common/events/events.gateway.ts','src/socket/creator.gateway.ts'].filter(f=>fs.existsSync(path.join(root,f)));
  const all=files.map(read).join('\n'); assert(all.includes('/realtime'),'accepted /realtime namespace missing');
});

pass('production-dependency-audit-contract', () => {
  const quality = read('scripts/wp09/wp09-quality-check.mjs');
  assert(quality.includes("'audit', '--omit=dev', '--json'"), 'production dependency audit missing');
  for (const id of ['GHSA-mh99-v99m-4gvg','GHSA-rgw5-rvv9-x895','GHSA-pm4m-ph32-ghv5','GHSA-2v37-7h3g-55p8','GHSA-qwww-vcr4-c8h2']) assert(quality.includes(id), `reviewed dependency advisory missing: ${id}`);
  assert(quality.includes('unreviewed production HIGH/CRITICAL advisories'), 'new high/critical advisory fail-closed gate missing');
  assert(quality.includes('acceptedId.toLowerCase() === id.toLowerCase()'), 'reviewed advisory matching must be case-insensitive');
  const admin = read('admin/src/App.tsx'); const creator = read('creator/src/App.tsx');
  assert(admin.includes('BrowserRouter') && creator.includes('BrowserRouter'), 'React Router RSC risk rationale no longer valid');
  const main = read('src/main.ts'); assert(main.includes('Swagger Documentation disabled in production mode'), 'Swagger production-disable risk rationale no longer valid');
});
pass('production-env-test-fixture-contract', () => {
  const spec = read('src/config/env-validator.spec.ts');
  assert(spec.includes('ENCRYPTION_KEY') && spec.includes('CORS_ALLOWED_ORIGINS'), 'secure production test fixture is stale');
});
pass('wp09-regression-runner-contract', () => {
  const runner = read('scripts/wp09/wp09-regression-build-check.mjs');
  assert(runner.includes("['Complete Jest suite'") && runner.includes("['Unified Backend/Website/Admin/Creator build'"), 'WP09 regression runner is incomplete');
  assert(!runner.includes("wp08:03:04:check"), 'WP09 regression runner must not re-run inherited WP08 formatting gates');
});
pass('wp09-isolated-database-guard-contract', () => {
  const runner = read('scripts/wp09/wp09-real-check.ps1');
  assert(runner.includes('voicecloud_wp08_03_04_$timestamp'), 'WP09 isolated DB does not use the guarded bootstrap namespace');
});

pass('backup-admzip-runtime-interop-contract', () => {
  const backup = read('src/modules/backup/backup.service.ts');
  assert(backup.includes("import * as AdmZip from 'adm-zip';"), 'backup AdmZip CommonJS runtime interop is unsafe');
});

pass('package-lock-protected', () => {
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'package-lock.json'))).digest('hex');
  assert(hash==='17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a',`package-lock changed: ${hash}`);
});
console.log(`WP09 recovery source certification passed: ${checks.length}/${checks.length}`);
