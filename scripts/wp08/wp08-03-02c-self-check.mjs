import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = {
  branch: 'VoiceCloud-Backend-VC-PH08-WP08-03-02B-R02',
  commit: 'f0556a127a05e65e2b585c1643460cb419f6b8a0',
  packageLockSha256:
    '17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a',
};
const failures = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const requireFile = (path) => {
  if (!existsSync(join(root, path))) failures.push(`Missing required file: ${path}`);
};
const requireText = (path, text) => {
  if (!read(path).includes(text)) failures.push(`${path} missing: ${text}`);
};
const forbidText = (path, text) => {
  if (read(path).includes(text)) failures.push(`${path} must not contain: ${text}`);
};

for (const path of [
  'src/modules/wallet/creator-payout-lifecycle.service.ts',
  'src/modules/wallet/creator-payout-lifecycle.service.spec.ts',
  'src/database/migrations/1700000000011-Phase08CreatorPayoutLifecycle.ts',
  'src/database/migrations/creator-payout-lifecycle.spec.ts',
  'docs/wp08/WP08-03-02C-CREATOR-PAYOUT-LIFECYCLE.md',
  'scripts/wp08/wp08-03-02c-check.mjs',
]) {
  requireFile(path);
}

const lockHash = createHash('sha256')
  .update(readFileSync(join(root, 'package-lock.json')))
  .digest('hex');
if (lockHash !== baseline.packageLockSha256) {
  failures.push(`package-lock.json changed from accepted 03-02B baseline: ${lockHash}`);
}

const lifecycle = 'src/modules/wallet/creator-payout-lifecycle.service.ts';
for (const text of [
  'SELECT pg_advisory_xact_lock(hashtext($1))',
  "lock: { mode: 'pessimistic_write' }",
  'wallet.frozenBalance',
  'wallet.withdrawableBalance',
  'PayoutStatus.APPROVED',
  'PayoutStatus.REJECTED',
  'PayoutStatus.PROCESSED',
  'WalletTransactionType.CREATOR_PAYOUT',
  "lifecycleAction: 'RESERVE'",
  "lifecycleAction: 'RELEASE'",
  "lifecycleAction: 'SETTLE'",
  'creator-payout-reserve:',
]) {
  requireText(lifecycle, text);
}

requireText('src/modules/creator/dto/create-payout-request.dto.ts', 'operationKey?: string');
requireText(
  'src/modules/creator/creator.service.ts',
  'this.creatorPayoutLifecycleService.reserve',
);
forbidText(
  'src/modules/creator/creator.service.ts',
  'const currentDiamonds = wallet ? Number(wallet.diamondBalance)',
);
requireText(
  'src/queue/processors/payout.processor.ts',
  'this.payoutLifecycleService.settle',
);
forbidText('src/queue/processors/payout.processor.ts', 'payout.status = nextStatus');

for (const text of [
  "@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)",
  "creator/payouts/:id/approve",
  "creator/payouts/:id/reject",
  "creator/payouts/:id/process",
]) {
  requireText('src/modules/wallet/admin-wallet.controller.ts', text);
}

const migration =
  'src/database/migrations/1700000000011-Phase08CreatorPayoutLifecycle.ts';
for (const text of [
  '"reservedAt"',
  '"settledAt"',
  '"releasedAt"',
  '"reservationTransactionId"',
  '"settlementTransactionId"',
  '"releaseTransactionId"',
  'UQ_creator_payout_requests_reserveOperationKey',
]) {
  requireText(migration, text);
}

const checker = read('scripts/wp08/wp08-03-02c-check.mjs');
for (const forbidden of [
  'prettier --write',
  'eslint --fix',
  'npm audit fix',
  "'run', 'format:wp08:03:02c'",
  "'run', 'lint:fix:wp08:03:02c'",
]) {
  if (checker.includes(forbidden)) {
    failures.push(`Final checker contains mutating command: ${forbidden}`);
  }
}

const revisionSpecificTests = [];
const walk = (directory) => {
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    const info = statSync(absolute);
    if (info.isDirectory()) {
      walk(absolute);
      continue;
    }
    const path = relative(root, absolute).replaceAll('\\', '/');
    if (/wp08-03-02c.*\.spec\.ts$/i.test(path)) revisionSpecificTests.push(path);
  }
};
walk(join(root, 'src'));
if (revisionSpecificTests.length) {
  failures.push(
    `Revision-specific 03-02C test files are forbidden: ${revisionSpecificTests.join(', ')}`,
  );
}

if (failures.length) {
  console.error('WP08-03-02C Creator payout lifecycle self-check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('WP08-03-02C Creator payout lifecycle self-check passed.');
console.log(`Baseline branch: ${baseline.branch}`);
console.log(`Baseline commit: ${baseline.commit}`);
console.log('Creator payout funds are reserved before Admin review.');
console.log('Settlement and rejection release are PostgreSQL-authoritative and idempotent.');
console.log('package-lock.json remains byte-identical to accepted 03-02B baseline.');
