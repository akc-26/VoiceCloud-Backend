import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = {
  branch: 'VoiceCloud-Backend-VC-PH08-WP08-03-02C-R01',
  commit: 'b6a9b4f8fe189d40fc3358088b6aa37e14507992',
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
const requireCountAtLeast = (path, text, expected) => {
  const count = read(path).split(text).length - 1;
  if (count < expected) {
    failures.push(`${path} expected at least ${expected} occurrences of ${text}; found ${count}`);
  }
};

for (const path of [
  'src/modules/hosts/host-financial-authority.service.ts',
  'src/modules/hosts/host-financial-authority.service.spec.ts',
  'src/modules/hosts/entities/host-settlement-request.entity.ts',
  'src/database/migrations/1700000000012-Phase08HostFinancialAuthority.ts',
  'src/database/migrations/host-financial-authority.spec.ts',
  'src/modules/wallet/admin-economy-rbac.spec.ts',
  'docs/wp08/WP08-03-02D-HOST-FINANCIAL-AUTHORITY-AND-ADMIN-RBAC.md',
  'scripts/wp08/wp08-03-02d-check.mjs',
]) {
  requireFile(path);
}

const lockHash = createHash('sha256')
  .update(readFileSync(join(root, 'package-lock.json')))
  .digest('hex');
if (lockHash !== baseline.packageLockSha256) {
  failures.push(`package-lock.json changed from accepted 03-02C baseline: ${lockHash}`);
}

const authority = 'src/modules/hosts/host-financial-authority.service.ts';
for (const text of [
  'this.dataSource.transaction',
  'SELECT pg_advisory_xact_lock(hashtext($1))',
  "lock: { mode: 'pessimistic_write' }",
  'HostSettlementRequestStatus.PENDING',
  'WalletTransactionType.HOST_EARNINGS',
  'WalletTransactionType.HOST_SETTLEMENT_RESERVE',
  'WalletTransactionType.HOST_SETTLEMENT',
  'amount > pendingBefore',
  'amount > available',
  'consumedReservations',
  'historicalBaseline: true',
  'settledAmount > requestAmount',
]) {
  requireText(authority, text);
}
forbidText(authority, 'Math.max(0,');

for (const text of [
  'authorityInitializedAt',
  'authorityBaselineTransactionId',
]) {
  requireText('src/modules/hosts/entities/host-earnings.entity.ts', text);
}
for (const text of [
  'host_settlement_requests',
  'UQ_host_settlement_requests_reserveOperationKey',
  'authorityInitializedAt',
  'authorityBaselineTransactionId',
]) {
  requireText('src/database/migrations/1700000000012-Phase08HostFinancialAuthority.ts', text);
}

requireText('src/modules/hosts/dto/settlement-action.dto.ts', 'operationKey?: string');
requireText('src/modules/hosts/hosts.service.ts', 'hostFinancialAuthorityService.getEarnings');
requireText('src/modules/hosts/hosts.service.ts', 'hostFinancialAuthorityService.requestSettlement');
requireText('src/modules/hosts/hosts.service.ts', 'hostFinancialAuthorityService.completeSettlement');
forbidText('src/modules/hosts/hosts.service.ts', 'Math.max(0, Number(earnings.pendingSettlements)');

const adminWallet = 'src/modules/wallet/admin-wallet.controller.ts';
requireText(adminWallet, '@UseGuards(JwtAuthGuard, RolesGuard)');
requireText(adminWallet, '@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)');
requireText(adminWallet, 'this.creatorPayoutLifecycleService.settleLegacy');
forbidText(adminWallet, 'this.walletService.processCreatorSettlement');

const creatorLifecycle = 'src/modules/wallet/creator-payout-lifecycle.service.ts';
for (const text of [
  'async settleLegacy(',
  'status: PayoutStatus.APPROVED',
  'return this.settle(approved.id, reviewedBy)',
  'Legacy Creator settlement requires an approved reserved payout request',
]) {
  requireText(creatorLifecycle, text);
}

requireCountAtLeast(
  'src/modules/gifts/gifts.controller.ts',
  '@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)',
  11,
);
for (const path of [
  'src/modules/tasks-achievements/controllers/admin-tasks-achievements.controller.ts',
  'src/modules/wallet/admin-wallet.controller.ts',
]) {
  requireText(path, '@UseGuards(JwtAuthGuard, RolesGuard)');
  requireText(path, '@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)');
}
requireCountAtLeast(
  'src/modules/vip/vip.controller.ts',
  '@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)',
  18,
);
requireText(
  'src/modules/notifications/notifications.controller.ts',
  "@Post('admin')",
);
requireText(
  'src/modules/notifications/notifications.controller.ts',
  '@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)',
);

// Accepted 03-02C authority must remain present.
for (const text of [
  'WalletTransactionType.CREATOR_PAYOUT',
  "lifecycleAction: 'RESERVE'",
  "lifecycleAction: 'RELEASE'",
  "lifecycleAction: 'SETTLE'",
  'creator-payout-reserve:',
]) {
  requireText(creatorLifecycle, text);
}
requireText(
  'src/modules/gifts/gift-settlement.service.ts',
  'WalletTransactionType.GIFT_RECEIVED',
);
requireText(
  'src/modules/wallet/wallet-mutation.service.ts',
  'pessimistic_write',
);

const checker = read('scripts/wp08/wp08-03-02d-check.mjs');
for (const forbidden of [
  'prettier --write',
  'eslint --fix',
  'npm audit fix',
  "'run', 'format:wp08:03:02d'",
  "'run', 'lint:fix:wp08:03:02d'",
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
    if (/wp08-03-02d.*\.spec\.ts$/i.test(path)) revisionSpecificTests.push(path);
  }
};
walk(join(root, 'src'));
if (revisionSpecificTests.length) {
  failures.push(
    `Revision-specific 03-02D test files are forbidden: ${revisionSpecificTests.join(', ')}`,
  );
}

if (failures.length) {
  console.error('WP08-03-02D Host financial authority/Admin RBAC self-check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('WP08-03-02D Host financial authority/Admin RBAC self-check passed.');
console.log(`Baseline branch: ${baseline.branch}`);
console.log(`Baseline commit: ${baseline.commit}`);
console.log('Host settlement reservation/completion is PostgreSQL-authoritative and idempotent.');
console.log('Economy administration requires explicit ADMIN/SUPER_ADMIN authorization.');
console.log('Legacy Creator settlement delegates to the accepted reserved payout lifecycle.');
console.log('package-lock.json remains byte-identical to accepted 03-02C baseline.');
