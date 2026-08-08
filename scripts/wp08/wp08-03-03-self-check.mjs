import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = {
  branch: 'VoiceCloud-Backend-VC-PH08-WP08-03-02D-R02',
  commit: '57d4c99fc90743d07b90ff77fc493e6720834b07',
  packageLockSha256:
    '17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a',
};
const failures = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const requireFile = (path) => {
  if (!existsSync(join(root, path)))
    failures.push(`Missing required file: ${path}`);
};
const requireText = (path, text) => {
  if (!read(path).includes(text)) failures.push(`${path} missing: ${text}`);
};
const forbidText = (path, text) => {
  if (read(path).includes(text))
    failures.push(`${path} must not contain: ${text}`);
};

for (const path of [
  'src/modules/tasks-achievements/services/reward-engine.service.ts',
  'src/modules/tasks-achievements/services/reward-authority.spec.ts',
  'src/modules/gifts/lucky-box.service.ts',
  'src/modules/gifts/entities/lucky-box-opening.entity.ts',
  'src/modules/gifts/lucky-box-authority.spec.ts',
  'src/modules/hosts/host-reward-authority.service.ts',
  'src/modules/hosts/host-reward-authority.spec.ts',
  'src/modules/vip/vip-financial-authority.service.ts',
  'src/modules/vip/vip-financial-authority.service.spec.ts',
  'src/modules/notifications/notification-delivery-authority.spec.ts',
  'src/queue/processors/financial-recovery-processors.spec.ts',
  'src/database/migrations/1700000000013-Phase08RewardsVipNotificationRecovery.ts',
  'src/database/migrations/rewards-vip-notification-recovery.spec.ts',
  'docs/wp08/WP08-03-03-REWARDS-VIP-NOTIFICATIONS-QUEUES-RECOVERY.md',
  'scripts/wp08/wp08-03-03-check.mjs',
]) {
  requireFile(path);
}

const lockHash = createHash('sha256')
  .update(readFileSync(join(root, 'package-lock.json')))
  .digest('hex');
if (lockHash !== baseline.packageLockSha256) {
  failures.push(
    `package-lock.json changed from accepted 03-02D baseline: ${lockHash}`,
  );
}

const reward =
  'src/modules/tasks-achievements/services/reward-engine.service.ts';
for (const text of [
  'this.dataSource.transaction',
  'SELECT pg_advisory_xact_lock(hashtext($1))',
  'WalletTransactionType.REWARD_CREDIT',
  'creditInTransaction',
  'walletTransactionId',
  'operationKey',
])
  requireText(reward, text);
forbidText(reward, 'this.userRepository.increment');

const lucky = 'src/modules/gifts/lucky-box.service.ts';
for (const text of [
  'this.dataSource.transaction',
  'WalletTransactionType.LUCKY_BOX_PURCHASE',
  'WalletTransactionType.LUCKY_BOX_REWARD',
  'LuckyBoxOpening',
  'resultPayload',
])
  requireText(lucky, text);
forbidText(lucky, 'wallet:');
forbidText(lucky, 'RedisService');

const hostReward = 'src/modules/hosts/host-reward-authority.service.ts';
for (const text of [
  "setLock('pessimistic_write')",
  'WalletTransactionType.HOST_REWARD',
  'claimOperationKey',
  'walletTransactionId',
])
  requireText(hostReward, text);

const vip = 'src/modules/vip/vip-financial-authority.service.ts';
for (const text of [
  'validateReceipt',
  'verifySignature',
  'WalletTransactionType.VIP_PURCHASE',
  'WalletBalanceType.EXTERNAL_PAYMENT',
  'WalletTransactionType.VIP_REWARD',
  'vip-reward:',
  'operationKey',
])
  requireText(vip, text);
requireText(
  'src/modules/vip/vip.service.ts',
  'this.financialAuthority.subscribe',
);
requireText(
  'src/modules/vip/vip.service.ts',
  'this.financialAuthority.claimReward',
);

const notificationEntity =
  'src/modules/notifications/entities/notification.entity.ts';
for (const text of [
  'operationKey',
  'deliveryStatus',
  'deliveryAttemptCount',
  'lastDeliveryAttemptAt',
  'deliveredAt',
  'lastDeliveryError',
])
  requireText(notificationEntity, text);
const notificationProcessor = 'src/queue/processors/notification.processor.ts';
for (const text of [
  'getNotificationForDelivery',
  'markDeliveryAttempt',
  'markDeliveryResult',
  "deliveryStatus === 'SENT'",
])
  requireText(notificationProcessor, text);
forbidText(notificationProcessor, 'createNotification({');

const tasksProcessor = 'src/queue/processors/tasks.processor.ts';
requireText(tasksProcessor, 'reward:queue:');
requireText(tasksProcessor, 'has no persisted recovery operation');
forbidText(tasksProcessor, 'processed: true');
requireText(
  'src/queue/processors/host-reward.processor.ts',
  'hostsService.claimReward',
);
requireText(
  'src/queue/processors/host-earnings.processor.ts',
  'hostFinancialAuthority.getEarnings',
);
requireText(
  'src/queue/processors/gift.processor.ts',
  'verifyCommittedSettlement',
);
requireText('src/queue/processors/payout.processor.ts', 'verifyReservedPayout');
requireText(
  'src/queue/processors/payout.processor.ts',
  'payoutLifecycleService.settle',
);
requireText(
  'src/queue/scheduler/queue-scheduler.service.ts',
  'handlePendingNotificationDeliveryScan',
);
requireText(
  'src/queue/scheduler/queue-scheduler.service.ts',
  'handlePayoutReservationVerificationScan',
);

const migration =
  'src/database/migrations/1700000000013-Phase08RewardsVipNotificationRecovery.ts';
for (const text of [
  'UQ_reward_audit_logs_operationKey',
  'lucky_box_openings',
  'UQ_host_rewards_claimOperationKey',
  'UQ_vip_transactions_provider_reference',
  'UQ_vip_reward_claims_operationKey',
  'UQ_notifications_operationKey',
  `SET "deliveryStatus" = 'SENT'`,
  `ALTER COLUMN "deliveryStatus" SET DEFAULT 'PENDING'`,
])
  requireText(migration, text);
forbidText(migration, 'UQ_vip_reward_claims_period');

// Accepted 03-02A/B/C/D authority must remain intact.
for (const [path, text] of [
  ['src/modules/wallet/wallet-mutation.service.ts', 'pessimistic_write'],
  [
    'src/modules/gifts/gift-settlement.service.ts',
    'WalletTransactionType.GIFT_RECEIVED',
  ],
  [
    'src/modules/wallet/creator-payout-lifecycle.service.ts',
    "lifecycleAction: 'SETTLE'",
  ],
  [
    'src/modules/hosts/host-financial-authority.service.ts',
    'WalletTransactionType.HOST_SETTLEMENT',
  ],
])
  requireText(path, text);

for (const text of [
  'format:wp08:03:03',
  'format:check:wp08:03:03',
  'lint:wp08:03:03',
  'test:wp08:03:03',
  'wp08:03:03:prepare',
  'wp08:03:03:check',
])
  requireText('package.json', text);

const checker = read('scripts/wp08/wp08-03-03-check.mjs');
for (const forbidden of [
  'prettier --write',
  'eslint --fix',
  'npm audit fix',
  "'run', 'format:wp08:03:03'",
  "'run', 'lint:fix:wp08:03:03'",
]) {
  if (checker.includes(forbidden))
    failures.push(`Final checker contains mutating command: ${forbidden}`);
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
    if (/wp08-03-03.*\.spec\.ts$/i.test(path)) revisionSpecificTests.push(path);
  }
};
walk(join(root, 'src'));
if (revisionSpecificTests.length) {
  failures.push(
    `Revision-specific 03-03 test files are forbidden: ${revisionSpecificTests.join(', ')}`,
  );
}

if (failures.length) {
  console.error(
    'WP08-03-03 consolidated authority/recovery self-check failed:',
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('WP08-03-03 consolidated authority/recovery self-check passed.');
console.log(`Baseline branch: ${baseline.branch}`);
console.log(`Baseline commit: ${baseline.commit}`);
console.log(
  'Rewards/Lucky Box, VIP, notifications and recovery queues retain PostgreSQL authority.',
);
console.log(
  'Historical notifications are protected from deployment-time replay.',
);
console.log(
  'package-lock.json remains byte-identical to accepted 03-02D baseline.',
);
